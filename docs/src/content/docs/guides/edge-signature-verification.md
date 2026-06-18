---
title: Stripe Signature Verification on Edge Runtimes
description: Why synchronous constructEvent fails on Cloudflare Workers and Deno Deploy, and how the async Web Crypto path makes one verifier work everywhere
---

Deploying a Stripe webhook handler to an Edge runtime such as [Cloudflare Workers](https://developers.cloudflare.com/workers/) or [Deno Deploy](https://deno.com/deploy) with verification code that works on Node.js produces an immediate failure. With stripe-node 22.2.0 (the version resolved in this repository's `pnpm-lock.yaml`), the SDK throws:

```text
SubtleCryptoProvider cannot be used in a synchronous context.
Use `await constructEventAsync(...)` instead of `constructEvent(...)`
```

The cause is not a misconfigured secret or a mangled body. It is that the synchronous `stripe.webhooks.constructEvent(...)` cannot run on an Edge runtime at all, and the reason is rooted in how the Stripe SDK computes the HMAC signature there.

## Why the synchronous path cannot run on Edge

On Edge runtimes the Stripe SDK performs cryptography through the Web Crypto API's [`SubtleCrypto`](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto) interface. The signing operation, `crypto.subtle.sign`, is asynchronous: it returns a `Promise` and has no synchronous counterpart. Stripe's synchronous `constructEvent` ultimately calls a synchronous `computeHMACSignature` method, which the Web Crypto provider simply cannot implement. Instead of verifying anything, that method throws on the first line.

This is visible in the SDK itself. The `SubtleCryptoProvider` overrides the synchronous signing method to throw unconditionally, while implementing only the asynchronous variant:

```js
// node_modules/stripe/esm/crypto/SubtleCryptoProvider.js
computeHMACSignature(payload, secret) {
  throw new CryptoProviderOnlySupportsAsyncError('SubtleCryptoProvider cannot be used in a synchronous context.');
}
async computeHMACSignatureAsync(payload, secret) {
  // ...uses this.subtleCrypto.sign(...)
}
```

Which provider you get is decided by the build the runtime loads. stripe-node ships two builds and selects between them through the `exports` conditions in its `package.json`: an Edge runtime matches the `worker`, `workerd`, `deno`, or `browser` condition and loads a build initialised with `WebPlatformFunctions`, whose `createDefaultCryptoProvider()` returns a `SubtleCryptoProvider`; Node matches the `default` condition and loads a build whose default provider is `NodeCryptoProvider`, backed by Node's synchronous `crypto` module. On Node the synchronous call works because Node crypto is synchronous. On Edge the same call has no synchronous primitive to use, so it throws.

Running the Edge build directly under Node confirms the split. The synchronous call throws the crypto error, while the asynchronous call gets past the crypto gate and proceeds to actual signature comparison (failing only because the example uses a fake signature):

```text
--- sync constructEvent (Edge build) ---
THROWN: "SubtleCryptoProvider cannot be used in a synchronous context.\nUse `await constructEventAsync(...)` instead of `constructEvent(...)`"
--- async constructEventAsync (Edge build) ---
THROWN: "No signatures found matching the expected signature for payload. ..."
```

The second message is the normal "signature mismatch" error — it only appears once verification is actually attempted, which proves the asynchronous path runs where the synchronous one cannot.

## Verifying by hand: three requirements

If you verify Stripe signatures directly on an Edge runtime without any library, three things must be true.

The first is to call `constructEventAsync` instead of `constructEvent` and `await` it. This is the requirement the error message names directly. Because the Edge crypto provider only implements asynchronous signing, the asynchronous entry point is the only one that can complete verification.

```typescript
const event = await stripe.webhooks.constructEventAsync(
  rawBody,
  signature,
  webhookSecret,
);
```

The second is to construct the Stripe client with a fetch-based HTTP client, `Stripe.createFetchHttpClient()`. This requirement concerns outbound Stripe API calls rather than the signature check itself: the default Node HTTP transport depends on Node's `http` module, which is unavailable on Edge, so any Stripe API request a handler makes needs the fetch-based transport. On the Edge build this transport is already the default (`WebPlatformFunctions.createDefaultHttpClient()` returns the fetch client), but setting it explicitly states the requirement and guards against accidentally loading the Node build.

```typescript
const stripe = new Stripe(apiKey, {
  httpClient: Stripe.createFetchHttpClient(),
});
```

The third is to pass the raw request body to the verifier. The signature is computed over the exact bytes Stripe sent. Any framework that parses the JSON and re-serialises it changes those bytes — key order, whitespace, number formatting — and the signature will no longer match. The body handed to `constructEventAsync` must be the unmodified request payload as a string or `Buffer`.

## How `createStripeVerifier` resolves the first requirement

`createStripeVerifier` from `@kotodayori/stripe` removes the first requirement from the caller entirely. It calls `constructEventAsync` unconditionally and never the synchronous form (`packages/stripe/src/index.ts:454`), returning a `Promise` typed as `Verifier<Stripe.Event>` (`packages/stripe/src/index.ts:443`):

```typescript
// packages/stripe/src/index.ts
export function createStripeVerifier(
  stripe: Stripe,
  webhookSecret: string
): Verifier<Stripe.Event> {
  return async (payload, headers) => {
    const signature = headers['stripe-signature'];
    if (!signature) {
      throw new Error('Missing stripe-signature header');
    }
    const event = await stripe.webhooks.constructEventAsync(
      payload,
      signature,
      webhookSecret,
    );
    return { event };
  };
}
```

Because every Kotodayori adapter already `await`s the verifier before dispatching — for example, the Hono adapter awaits `verifier(rawBody, headers)` at `packages/hono/src/index.ts:64` — an asynchronous verifier is a drop-in on Node as well. `constructEventAsync` runs correctly on Node too, since the Node crypto provider implements both the synchronous and asynchronous methods. The result is a single verifier that covers Node and Edge with no runtime-specific branch; the design intent is recorded in the function's own documentation (`packages/stripe/src/index.ts:393-398`) and the change landed in commit `55a69c4` ("feat(stripe): support Cloudflare Workers / Edge via async verifier", released as `@kotodayori/stripe` 1.1.0).

The other two requirements remain the caller's responsibility, because they are construction concerns rather than verification logic: you build the Stripe client and choose its HTTP transport, and you wire the route so the raw body reaches the verifier. The verifier owns only the verification call. A complete Workers setup that satisfies all three is shown in the [Cloudflare Workers guide](/guides/cloudflare-workers).

## Version dependence and verification scope

The behaviour above was verified against stripe-node 22.2.0. In this version the runtime is detected automatically through the package's `exports` conditions, so you do not pass a crypto provider as the fifth argument to `constructEventAsync` — the Edge build already defaults to the Web Crypto provider. Older stripe-node releases did not select the provider this way and required passing an explicit `SubtleCryptoProvider`; if you are pinned to an older major, confirm the requirement against the [Stripe webhook signature documentation](https://docs.stripe.com/webhooks/signature). The need for an explicit provider is therefore version-dependent, and the single-verifier behaviour described here holds for stripe-node versions that auto-detect the runtime.

The reproduction in this guide ran the Edge build under Node.js and confirmed the synchronous-versus-asynchronous split at the SDK level. Whether a given Edge platform behaves identically end-to-end is not asserted here beyond that observation; the Cloudflare Workers path is covered, with a working configuration, in the [Cloudflare Workers guide](/guides/cloudflare-workers).
