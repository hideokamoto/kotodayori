---
"@kotodayori/hono": major
"@kotodayori/express": major
"@kotodayori/lambda": major
"@kotodayori/zod": major
"@kotodayori/fetch": minor
---

**BREAKING (types):** these packages accept or return a `Verifier`, and the `Verifier` type they re-export now follows `@kotodayori/core` 2.0.0: `payload` is `string | Uint8Array` instead of `string | Buffer`. A custom verifier annotated as `(payload: string | Buffer, headers) => ...` no longer type-checks when passed as the `verifier` option (hono, express, lambda, fetch) or to `createZodVerifier` (zod). Runtime behavior is unchanged: the Express and Lambda adapters still pass a `Buffer` or a string.

See the migration guide in the `@kotodayori/core` 2.0.0 release notes: remove the `Buffer` annotation or write `string | Uint8Array`, and replace `payload.toString()` with `new TextDecoder().decode(payload)` for non-string payloads.

`@kotodayori/fetch` is below 1.0.0, so this breaking change ships as a minor release (0.2.0).
