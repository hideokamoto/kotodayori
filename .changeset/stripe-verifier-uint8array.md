---
"@kotodayori/stripe": major
---

**BREAKING:** the `stripe` peer dependency is now `>=23.0.0` (it was `>=17.0.0`). This is the major release announced when Stripe SDK versions older than v23 were deprecated. Upgrade `stripe` to v23 or later before upgrading this package. With an older SDK, `createStripeVerifier()` still logs a one-time warning, which now says the SDK is not supported (it previously said the next major release would require v23).

`createStripeVerifier` also declares its payload as `string | Uint8Array` to match `Verifier` in `@kotodayori/core` 2.0.0. No code change is needed for callers (a Node.js `Buffer` is still accepted); the Stripe SDK's `constructEventAsync` takes `string | Uint8Array` directly.
