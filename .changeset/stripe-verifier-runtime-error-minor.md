---
"@kotodayori/stripe": minor
---

Add `StripeVerifierRuntimeError` for Stripe SDK failures that are not signature verification failures

`createStripeVerifier` now rethrows Stripe's `StripeSignatureVerificationError` (signature mismatch, expired timestamp, malformed header) unchanged, and wraps any other error from the Stripe SDK in the new `StripeVerifierRuntimeError`, keeping the original error as `cause`. Its message explains that the signature itself was not judged invalid and points to runtime incompatibilities, such as the Stripe SDK's Node.js build throwing from `crypto.timingSafeEqual` on StackBlitz WebContainers (`--conditions=worker` avoids it).

Code that inspected non-signature errors thrown by the verifier should now read them from `error.cause`.
