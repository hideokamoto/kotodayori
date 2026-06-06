# @kotodayori/eventbridge

## 1.0.3

### Patch Changes

- 23dbfa0: Update dev dependencies for TypeScript 6 compatibility

  Bumped `typescript` to v6, `@types/node` to v25, `vitest` to v4.1, and other
  dev tooling to their latest versions. No changes to public API or runtime
  behaviour.

- Updated dependencies [23dbfa0]
  - @kotodayori/core@1.2.1

## 1.0.2

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

## 1.0.1

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

- Initial release of `@kotodayori/eventbridge`: AWS EventBridge adapter for Kotodayori.
