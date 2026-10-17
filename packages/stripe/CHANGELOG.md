# @kotodayori/stripe

## 1.5.0

### Minor Changes

- a478b52: Add an injectable `Logger` interface. `WebhookRouter`, `StripeWebhookRouter`, the Hono/Express/Lambda adapters, `SchemaRegistry`, and `withValidation` accept a `logger` option (defaults to `consoleLogger`). `consoleLogger` and `silentLogger` are exported from `@kotodayori/core`.

### Patch Changes

- Updated dependencies [a478b52]
  - @kotodayori/core@1.3.0

## 1.4.0

### Minor Changes

- 8eebe84: Add Stripe v23 event types to `StripeEventMap` and deprecate Stripe SDK versions older than v23

  Eight new event types introduced in Stripe v23 are now covered:
  `apps.install.created`, `apps.install.deleted`, `apps.install.updated`,
  `financial_connections.account.expected_deactivation_date_updated`,
  `financial_connections.account.supported_payment_method_types_updated`,
  `financial_connections.account.upcoming_deactivation`,
  `financial_connections.authorization.expected_deactivation_date_updated`,
  `financial_connections.authorization.upcoming_deactivation`.

  Stripe SDK versions older than v23 are now deprecated. The peer dependency still
  accepts `stripe` >= 17.0.0, but the next major release will require `stripe` >= 23.0.0.
  `createStripeVerifier()` logs a one-time `console.warn` when it receives a Stripe
  instance older than v23. With an older SDK and `skipLibCheck: false`, the new event
  types above fail to type-check because the SDK does not define them.

## 1.3.0

### Minor Changes

- e9f6d09: Add `StripeVerifierRuntimeError` for Stripe SDK failures that are not signature verification failures

  `createStripeVerifier` now rethrows Stripe's `StripeSignatureVerificationError` (signature mismatch, expired timestamp, malformed header) unchanged, and wraps any other error from the Stripe SDK in the new `StripeVerifierRuntimeError`, keeping the original error as `cause`. Its message explains that the signature itself was not judged invalid and points to runtime incompatibilities, such as the Stripe SDK's Node.js build throwing from `crypto.timingSafeEqual` on StackBlitz WebContainers (`--conditions=worker` avoids it).

  Code that inspected non-signature errors thrown by the verifier should now read them from `error.cause`.

## 1.2.0

### Minor Changes

- 23dbfa0: Add Stripe v22 `reserve.*` event types to `StripeEventMap`

  Seven new event types introduced in Stripe v22 are now covered:
  `reserve.hold.created`, `reserve.hold.updated`, `reserve.plan.created`,
  `reserve.plan.disabled`, `reserve.plan.expired`, `reserve.plan.updated`,
  `reserve.release.created`.

### Patch Changes

- Updated dependencies [23dbfa0]
  - @kotodayori/core@1.2.1

## 1.1.1

### Patch Changes

- cec7631: Add `WebhookDispatcher` structural interface; adapters no longer require `as unknown as WebhookRouter` casts.

  The root cause of consumers needing `honoAdapter(router as unknown as WebhookRouter, ...)` was that
  `WebhookRouter` is a **nominal** type (its `private handlers` and `private middlewares` fields make
  TypeScript treat two instances of the class from different installed copies of `@kotodayori/core` as
  incompatible). When a consumer's project ends up with duplicate installs — e.g. `@kotodayori/hono`
  and `@kotodayori/stripe` resolving to different `@kotodayori/core` versions — the `StripeWebhookRouter`
  the user holds is not assignable to the `WebhookRouter` the adapter expects.

  **Changes:**

  - `@kotodayori/core` exports a new `WebhookDispatcher<TEvent>` interface with a single method:
    `dispatch(event: TEvent): Promise<void>`. Interfaces are matched **structurally**, so a router from
    any copy of core satisfies it. `WebhookRouter` now declares `implements WebhookDispatcher`.

  - All adapters (`honoAdapter`, `expressAdapter`, `lambdaAdapter`, `eventBridgeAdapter`) now accept
    `WebhookDispatcher` for their `router` parameter instead of the concrete `WebhookRouter` class.
    Verifier-event type inference (`TEvent`) is preserved independently of the router parameter.

  - All adapter packages re-export `WebhookDispatcher` from their public surface alongside the existing
    core re-exports. `@kotodayori/stripe` also re-exports it for convenience.

  - Internal `workspace:*` dependency ranges on `@kotodayori/core` are changed to `workspace:^` so that
    published packages use a caret range (e.g. `^1.1.0`), allowing package managers to deduplicate to a
    single copy and preventing the duplicate-install scenario in the first place.

- Updated dependencies [cec7631]
  - @kotodayori/core@1.2.0

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
