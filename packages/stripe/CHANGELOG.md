# @kotodayori/stripe

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
