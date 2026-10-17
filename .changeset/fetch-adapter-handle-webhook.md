---
"@kotodayori/core": minor
"@kotodayori/fetch": minor
"@kotodayori/hono": patch
"@kotodayori/express": patch
"@kotodayori/lambda": patch
---

Add `@kotodayori/fetch`, a Web-standard `(request: Request) => Promise<Response>` adapter for Cloudflare Workers, Bun, Deno, Next.js App Router, React Router and other runtimes that pass a standard `Request`. Non-POST requests get `405` with `Allow: POST`.

Add `handleWebhook()` to `@kotodayori/core`: the shared verify → dispatch → respond flow (empty body → 400, verification failure → 400, handler error → `onError` then 500, success → 200). The Hono, Express and Lambda adapters now delegate to it; their responses are unchanged.
