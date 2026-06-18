---
title: "Nominal vs Structural Types: WebhookDispatcher and Duplicate Installs"
description: Why adapters once required `as unknown as WebhookRouter`, and how a single-method structural interface removed the cast without weakening type inference
---

Before `@kotodayori/core` 1.2.0, wiring a router into an adapter sometimes required a cast that looked out of place — both values come from the same library, yet the type checker rejected the call without it:

```typescript
honoAdapter(router as unknown as WebhookRouter, { verifier });
```

`as unknown as WebhookRouter` is a double assertion: it erases the value's type to `unknown` and re-asserts it as `WebhookRouter`, defeating the type checker entirely. Needing it to pass your own router to your own adapter is a signal that two `WebhookRouter` types that should be identical are being treated as different. They were — and the reason is the combination of how TypeScript compares class types and how a monorepo or consumer can end up with more than one copy of `@kotodayori/core`.

## Why the cast was necessary

`WebhookRouter` is a class with private fields. Its handler map and middleware list are declared `private` (`packages/core/src/index.ts:122-123`):

```typescript
export class WebhookRouter<...> implements WebhookDispatcher<...> {
  private handlers: Map<string, EventHandler<WebhookEvent>[]> = new Map();
  private middlewares: Middleware[] = [];
  // ...
}
```

TypeScript's type system is otherwise [structural](https://www.typescriptlang.org/docs/handbook/type-compatibility.html): two types are compatible when their members match, regardless of their declared names. Classes with `private` or `protected` members are the documented exception. The handbook states that when an instance is checked for compatibility, if the target type contains a private member, the source type must contain a private member that *originated in the same declaration*. A private field makes the class behave nominally: a value is assignable to `WebhookRouter` only if it came from that exact class declaration.

That constraint is invisible while only one copy of `@kotodayori/core` exists, because every `WebhookRouter` shares the same declaration. It becomes visible the moment two copies exist. A consumer who installs `@kotodayori/stripe` and `@kotodayori/hono` pulls in `@kotodayori/core` through each of them. If the package manager resolves those to two different copies — different versions, or the same version not deduplicated — then the `StripeWebhookRouter` the consumer constructs extends the `WebhookRouter` from copy A, while `honoAdapter`'s parameter type refers to the `WebhookRouter` from copy B. The two are structurally identical, but their `private handlers` and `private middlewares` originate in different class declarations, so nominal comparison rejects the assignment. `as unknown as WebhookRouter` was the escape hatch consumers reached for.

## The resolution: a structural dispatch interface, in two parts

The fix landed in commit `cec7631` (`@kotodayori/core` 1.2.0, `@kotodayori/stripe` 1.1.1) and has two parts: a structural interface that makes a mismatched copy harmless, and a dependency-range change that stops the mismatch from arising.

The first part is `WebhookDispatcher`. `@kotodayori/core` now exports an interface describing the single capability an adapter actually needs from a router — the ability to dispatch a verified event (`packages/core/src/index.ts:110-112`):

```typescript
export interface WebhookDispatcher<TEvent extends WebhookEvent = WebhookEvent> {
  dispatch(event: TEvent): Promise<void>;
}
```

Interfaces carry no private-field nominal constraint, so they are matched purely structurally: any object with a conforming `dispatch` method satisfies `WebhookDispatcher`, no matter which copy of core its class came from. `WebhookRouter` declares `implements WebhookDispatcher<...>` (`packages/core/src/index.ts:121`), and every adapter changed its `router` parameter from the concrete class to the interface. `honoAdapter`, `expressAdapter`, and `lambdaAdapter` now take `WebhookDispatcher<TEvent>` (`packages/hono/src/index.ts:41`, `packages/express/src/index.ts:44`, `packages/lambda/src/index.ts:40`), and `eventBridgeAdapter` takes `WebhookDispatcher` (`packages/eventbridge/src/index.ts:23`). A router from a mismatched core copy now type-checks, because only its shape — the presence of a `dispatch` method — is compared.

The second part prevents the duplicate install in the first place. The internal dependency range on core was changed from `workspace:*` to `workspace:^` across the published packages (commit `cec7631`; the current `packages/stripe/package.json` shows `"@kotodayori/core": "workspace:^"`, as do the adapter packages). On publish, `workspace:^` is rewritten to a caret range such as `^1.2.0`, which lets a package manager deduplicate all adapters and the Stripe package down to a single core copy. The structural interface makes a mismatch harmless; the caret range keeps the mismatch from occurring at all.

## Why type inference is unaffected

Replacing a concrete generic class with a single-method interface raises a fair question: does the adapter still infer the event type correctly? It does, because the verifier's event type and the router's handler types are inferred from two independent places, and neither flows through the narrowed parameter.

The adapter's event type `TEvent` is a free type parameter of the adapter function, and it is pinned by the verifier, not the router. `HonoAdapterOptions` carries `verifier: Verifier<TEvent>`, and `createStripeVerifier` returns `Verifier<Stripe.Event>` (`packages/stripe/src/index.ts:443`), so `TEvent` resolves to `Stripe.Event` from the verifier option. The `router` parameter is `WebhookDispatcher<TEvent>`; because `dispatch` is a method, its parameter is compared bivariantly, so passing a router whose own event union differs from `TEvent` does not contradict the inference. This decoupling of verifier inference from the router was introduced in commit `486a755` and is described in the `@kotodayori/core` 1.1.0 changelog.

Handler-level types live entirely on the router and never travel through the adapter. `StripeWebhookRouter` extends `WebhookRouter<StripeEventMap>` (`packages/stripe/src/index.ts:385`), and a call such as `router.on('payment_intent.succeeded', handler)` infers the handler's event type from `StripeEventMap` through the router's own `TEventMap` generic (`packages/core/src/index.ts:132-135`). That inference happens at the `.on()` call site, on the router class, before the router is ever handed to an adapter. Narrowing the adapter parameter to `WebhookDispatcher` changes only how the router is passed in; it does not touch how handlers are typed. The autocomplete and event-type narrowing on `.on(...)` are exactly the same before and after the change.
