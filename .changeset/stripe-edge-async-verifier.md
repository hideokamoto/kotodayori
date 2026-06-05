---
'@kotodayori/stripe': minor
---

Make `createStripeVerifier` use Stripe's asynchronous `constructEventAsync()`
so webhook signature verification works on Edge runtimes (Cloudflare Workers,
Deno Deploy) in addition to Node.js.

On Edge runtimes the Stripe SDK relies on the Web Crypto `SubtleCryptoProvider`,
which only supports asynchronous verification. The previous synchronous
`constructEvent()` call threw `SubtleCryptoProvider cannot be used in a
synchronous context`. The verifier now returns a `Promise<VerifyResult>`; all
Kotodayori adapters already `await` the verifier, so existing Node.js usage
continues to work unchanged.
