---
"@kotodayori/core": minor
"@kotodayori/hono": patch
"@kotodayori/express": patch
"@kotodayori/lambda": patch
"@kotodayori/eventbridge": patch
"@kotodayori/stripe": patch
---

Add `WebhookDispatcher` structural interface; adapters no longer require `as unknown as WebhookRouter` casts.

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
