# @kotodayori/fetch

## 0.3.0

### Minor Changes

- a4cec80: **BREAKING (types):** these packages accept or return a `Verifier`, and the `Verifier` type they re-export now follows `@kotodayori/core` 2.0.0: `payload` is `string | Uint8Array` instead of `string | Buffer`. A custom verifier annotated as `(payload: string | Buffer, headers) => ...` no longer type-checks when passed as the `verifier` option (hono, express, lambda, fetch) or to `createZodVerifier` (zod). Runtime behavior is unchanged: the Express and Lambda adapters still pass a `Buffer` or a string.

  See the migration guide in the `@kotodayori/core` 2.0.0 release notes: remove the `Buffer` annotation or write `string | Uint8Array`, and replace `payload.toString()` with `new TextDecoder().decode(payload)` for non-string payloads.

  `@kotodayori/fetch` is below 1.0.0, so this breaking change ships as a minor release (0.2.0).

### Patch Changes

- Updated dependencies [0c95925]
  - @kotodayori/core@2.0.0

## 0.2.0

### Minor Changes

- ababf60: Pass a per-request context to handlers. `WebhookRouter` (and `StripeWebhookRouter`) take a `TContext` type parameter; `dispatch(event, context)` forwards it to handlers (second argument), `fanout()` handlers and middleware (third argument). The context argument of `dispatch()`, `EventHandler` and `Middleware` is optional when `TContext` admits `undefined` (including the default `unknown`), so existing `dispatch(event)`, `handler(event)` and `middleware(event, next)` calls still compile, and a `dispatch(event)` without a context still calls handlers with the event alone.

  **Behaviour change:** when mounted through an adapter, handlers now always receive a second argument (and middleware a third). Handlers that ignore it are unaffected; a function registered as a handler that already used an optional second parameter for something else will now receive the adapter's request object there.

  Adapters now pass their request object by default — Hono `c` (so handlers can reach `c.env` bindings on Cloudflare Workers), the fetch adapter's `Request`, Express `req`, and `{ event, context }` for Lambda (`LambdaInvocation`) and EventBridge (`EventBridgeInvocation`) — and accept a `createContext` option to build a custom context. `createContext` is required by the types when the router's context is not satisfied by the default, and errors thrown from it are handled like handler errors. On Hono, the context a router needs (bindings, path params, validated input) is checked against the app at `app.post(...)`. The Express adapter no longer sends its own 200/500 response when user code (`createContext`, or a handler via `req.res`) has already responded.

  `@kotodayori/core` also exports `ContextFactory`, `ContextFactoryOption`, `contextProvider` and `dispatchWithContext` for adapter authors, and `handleWebhook` takes an optional `getContext` argument (built with `contextProvider`) that is called only after verification succeeds.

### Patch Changes

- c60b44c: Infer the adapter event type from the verifier only. Previously the router's dispatch signature also fed inference, so `onError` received a widened type (e.g. `WebhookEvent`) instead of the verifier's event union.
- Updated dependencies [ababf60]
  - @kotodayori/core@1.5.0

## 0.1.1

### Patch Changes

- e94cd4d: Document the `logger` option and the `onError` behavior in the README. No code changes.

## 0.1.0

### Minor Changes

- b7ae349: Add `@kotodayori/fetch`, a Web-standard `(request: Request) => Promise<Response>` adapter for Cloudflare Workers, Bun, Deno, Next.js App Router, React Router and other runtimes that pass a standard `Request`. Non-POST requests get `405` with `Allow: POST`.

  Add `handleWebhook()` to `@kotodayori/core`: the shared verify → dispatch → respond flow (empty body → 400, verification failure → 400, handler error → `onError` then 500, success → 200). The Hono, Express and Lambda adapters now delegate to it; their responses are unchanged.

### Patch Changes

- Updated dependencies [b7ae349]
  - @kotodayori/core@1.4.0
