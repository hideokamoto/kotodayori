---
"@kotodayori/core": major
---

**BREAKING:** `Verifier` now takes `payload: string | Uint8Array` instead of `string | Buffer`, and `handleWebhook` takes `rawBody: string | Uint8Array`. The published type declarations no longer reference the Node-only `Buffer`, so they type-check in environments without `@types/node` (Cloudflare Workers types, Deno). Node.js `Buffer` is a `Uint8Array` subclass, so the Express and Lambda adapters behave exactly the same at runtime.

Migrating custom verifiers:

- A verifier annotated as `(payload: string | Buffer, headers) => ...` is no longer assignable to `Verifier` (function parameters are contravariant). Remove the annotation so `Verifier` infers it, or write `string | Uint8Array`.
- `payload.toString()` and `payload.toString('utf8')` must be replaced. On a plain `Uint8Array`, `toString()` returns comma-separated numbers (for example `"123,34,105,100"`), not the text, and `toString('utf8')` does not compile. Decode explicitly:

  ```ts
  // Before
  const body = JSON.parse(payload.toString());

  // After
  const text = typeof payload === 'string' ? payload : new TextDecoder().decode(payload);
  const body = JSON.parse(text);
  ```

- Keep verifying the signature over the raw `payload`, never over parsed or re-serialized JSON. `node:crypto` HMAC and Web Crypto both accept `Uint8Array`.
