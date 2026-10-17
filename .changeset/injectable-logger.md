---
"@kotodayori/core": minor
"@kotodayori/hono": minor
"@kotodayori/express": minor
"@kotodayori/lambda": minor
"@kotodayori/zod": minor
"@kotodayori/stripe": minor
---

Add an injectable `Logger` interface. `WebhookRouter`, `StripeWebhookRouter`, the Hono/Express/Lambda adapters, `SchemaRegistry`, and `withValidation` accept a `logger` option (defaults to `consoleLogger`). `consoleLogger` and `silentLogger` are exported from `@kotodayori/core`.
