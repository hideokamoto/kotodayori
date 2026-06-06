# @kotodayori/core

## 1.2.1

### Patch Changes

- 23dbfa0: Update dev dependencies for TypeScript 6 compatibility

  Bumped `typescript` to v6, `@types/node` to v25, `vitest` to v4.1, and other
  dev tooling to their latest versions. No changes to public API or runtime
  behaviour.

## 1.2.0

### Minor Changes

- cec7631: Add `WebhookDispatcher` structural interface; adapters no longer require `as unknown as WebhookRouter` casts.

  The root cause of consumers needing `honoAdapter(router as unknown as WebhookRouter, ...)` was that
  `WebhookRouter` is a **nominal** type (its `private handlers` and `private middlewares` fields make
  TypeScript treat two instances of the class from different installed copies of `@kotodayori/core` as
  incompatible). When a consumer's project ends up with duplicate installs — e.g. `@kotodayori/hono`
  and `@kotodayori/stripe` resolving to different `@kotodayori/core` versions — the `StripeWebhookRouter`
  the user holds is not assignable to the `WebhookRouter` the adapter expects.

  **Changes:**

  - `@kotodayori/core` exports a new `WebhookDispatcher<TEvent>` interface with a single method:
    `dispatch(event: TEvent): Promise<void>`. Interfaces are matched **structurally**, so a router from
    any copy of core satisfies it. `WebhookRouter` now declares `implements WebhookDispatcher`.

  - All adapters (`honoAdapter`, `expressAdapter`, `lambdaAdapter`, `eventBridgeAdapter`) now accept
    `WebhookDispatcher` for their `router` parameter instead of the concrete `WebhookRouter` class.
    Verifier-event type inference (`TEvent`) is preserved independently of the router parameter.

  - All adapter packages re-export `WebhookDispatcher` from their public surface alongside the existing
    core re-exports. `@kotodayori/stripe` also re-exports it for convenience.

  - Internal `workspace:*` dependency ranges on `@kotodayori/core` are changed to `workspace:^` so that
    published packages use a caret range (e.g. `^1.1.0`), allowing package managers to deduplicate to a
    single copy and preventing the duplicate-install scenario in the first place.

## 1.1.0

### Minor Changes

- 486a755: Improve type inference and type safety across the router and adapters.

  - `WebhookRouter.group()` now preserves the parent router's event-map types.
    Handlers registered via `group(prefix, ...).on(suffix, handler)` receive the
    concrete event type for `prefix.suffix` (e.g. `Stripe.Subscription` for
    `data.object`) instead of the previously erased `WebhookEvent` / `unknown`.
    Invalid suffixes for a given prefix are now rejected at compile time.

  - The framework adapters (`honoAdapter`, `expressAdapter`, `lambdaAdapter`) now
    infer the verifier's event type as an independent generic, decoupled from the
    router's event map. A typed router (such as `StripeWebhookRouter`) is no
    longer rejected when the verifier returns an event union that differs from the
    router's map — for example when the installed Stripe SDK ships events that the
    hand-maintained `StripeEventMap` does not yet include. This removes the need
    for `as unknown as WebhookRouter` workarounds at the call site.

## 1.0.0

### Major Changes

- e8e57b4: Rename npm scope from `@tayori/*` to `@kotodayori/*` and CLI from `create-tayori` to `create-kotodayori` to avoid trademark conflict with tayori.com (PR TIMES customer support SaaS).

  Migration: replace `@tayori/<pkg>` with `@kotodayori/<pkg>` in your imports and `package.json` dependencies, and use `npx create-kotodayori` instead of `npx create-tayori`. The public API is unchanged.

## 0.0.1

### Minor Changes

- Initial release of `@kotodayori/core`: the core webhook routing framework for Kotodayori.
