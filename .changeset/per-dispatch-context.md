---
"@kotodayori/core": minor
"@kotodayori/stripe": minor
"@kotodayori/hono": minor
"@kotodayori/express": minor
"@kotodayori/lambda": minor
"@kotodayori/eventbridge": minor
---

Pass a per-request context to handlers. `WebhookRouter` (and `StripeWebhookRouter`) take a `TContext` type parameter; `dispatch(event, context)` forwards it to handlers (second argument), `fanout()` handlers and middleware (third argument). The context is optional when `TContext` admits `undefined` (including the default `unknown`), so existing `dispatch(event)` calls keep working and handlers are still called with the event alone.

Adapters now pass their request object by default — Hono `c` (so handlers can reach `c.env` bindings on Cloudflare Workers), Express `req`, and `{ event, context }` for Lambda (`LambdaInvocation`) and EventBridge (`EventBridgeInvocation`) — and accept a `createContext` option to build a custom context. `createContext` is required by the types when the router's context is not satisfied by the default, and errors thrown from it are handled like handler errors.
