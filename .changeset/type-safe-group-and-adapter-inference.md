---
"@kotodayori/core": minor
"@kotodayori/hono": minor
"@kotodayori/express": minor
"@kotodayori/lambda": minor
---

Improve type inference and type safety across the router and adapters.

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
