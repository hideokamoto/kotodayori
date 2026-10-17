---
"@kotodayori/core": minor
"@kotodayori/stripe": minor
"@kotodayori/hono": minor
"@kotodayori/express": minor
"@kotodayori/lambda": minor
"@kotodayori/eventbridge": minor
---

Pass a per-request context to handlers. `WebhookRouter` (and `StripeWebhookRouter`) take a `TContext` type parameter; `dispatch(event, context)` forwards it to handlers (second argument), `fanout()` handlers and middleware (third argument). The context argument of `dispatch()`, `EventHandler` and `Middleware` is optional when `TContext` admits `undefined` (including the default `unknown`), so existing `dispatch(event)`, `handler(event)` and `middleware(event, next)` calls still compile, and a `dispatch(event)` without a context still calls handlers with the event alone.

**Behaviour change:** when mounted through an adapter, handlers now always receive a second argument (and middleware a third). Handlers that ignore it are unaffected; a function registered as a handler that already used an optional second parameter for something else will now receive the adapter's request object there.

Adapters now pass their request object by default — Hono `c` (so handlers can reach `c.env` bindings on Cloudflare Workers), Express `req`, and `{ event, context }` for Lambda (`LambdaInvocation`) and EventBridge (`EventBridgeInvocation`) — and accept a `createContext` option to build a custom context. `createContext` is required by the types when the router's context is not satisfied by the default, and errors thrown from it are handled like handler errors. On Hono, the context a router needs (bindings, path params, validated input) is checked against the app at `app.post(...)`. The Express adapter no longer sends its own 200/500 response when user code (`createContext`, or a handler via `req.res`) has already responded.

`@kotodayori/core` also exports `ContextFactory`, `ContextFactoryOption` and `dispatchWithContext` for adapter authors.
