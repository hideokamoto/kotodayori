---
"@kotodayori/stripe": patch
---

`createStripeVerifier` now declares its payload as `string | Uint8Array` to match `Verifier` in `@kotodayori/core` 2.0.0. No code change is needed for callers (a Node.js `Buffer` is still accepted); the Stripe SDK's `constructEventAsync` takes `string | Uint8Array` directly.
