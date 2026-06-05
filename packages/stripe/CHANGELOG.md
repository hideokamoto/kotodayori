# @kotodayori/stripe

## 1.1.0

### Minor Changes

- 55a69c4: Make `createStripeVerifier` use Stripe's asynchronous `constructEventAsync()`
  so webhook signature verification works on Edge runtimes (Cloudflare Workers,
  Deno Deploy) in addition to Node.js.

  On Edge runtimes the Stripe SDK relies on the Web Crypto `SubtleCryptoProvider`,
  which only supports asynchronous verification. The previous synchronous
  `constructEvent()` call threw `SubtleCryptoProvider cannot be used in a
synchronous context`. The verifier now returns a `Promise<VerifyResult>`; all
  Kotodayori adapters already `await` the verifier, so existing Node.js usage
  continues to work unchanged.

### Patch Changes

- Updated dependencies [486a755]
  - @kotodayori/core@1.1.0

## 1.0.0

### Major Changes

- e8e57b4: Rename npm scope from `@tayori/*` to `@kotodayori/*` and CLI from `create-tayori` to `create-kotodayori` to avoid trademark conflict with tayori.com (PR TIMES customer support SaaS).

  Migration: replace `@tayori/<pkg>` with `@kotodayori/<pkg>` in your imports and `package.json` dependencies, and use `npx create-kotodayori` instead of `npx create-tayori`. The public API is unchanged.

### Patch Changes

- Updated dependencies [e8e57b4]
  - @kotodayori/core@1.0.0

## 0.0.1

### Minor Changes

- Initial release of `@kotodayori/stripe`: Stripe-specific utilities and types for Kotodayori.
