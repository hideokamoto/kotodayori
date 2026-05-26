---
name: kotodayori-webhooks
description: >
  Kotodayori monorepo: type-safe webhook routing (@kotodayori/core), Stripe
  integration (@kotodayori/stripe), framework adapters (hono, express, lambda,
  eventbridge), Zod helpers (@kotodayori/zod), and create-kotodayori scaffolding.
  Use when adding or changing webhook routes, verifiers, adapters, Stripe handlers,
  examples under examples/, or running the create-kotodayori CLI. Keywords:
  WebhookRouter, StripeWebhookRouter, createStripeVerifier, honoAdapter,
  expressAdapter, express.raw, workspace:*, create-kotodayori.
user-invocable: true
---

# Kotodayori webhooks (agent playbook)

Use this skill when working on webhook routing, Stripe verification, adapters, the scaffold CLI, or the `examples/` sample apps in this repository.

## Mental model

1. **Core** (`@kotodayori/core`): `WebhookRouter` dispatches typed events; middleware and grouping behave like a small Hono-style stack.
2. **Verification**: A `Verifier` receives the **raw** payload and headers, verifies authenticity, then returns `{ event }` as `WebhookEvent`. Adapters must not parse JSON before the verifier runs.
3. **Adapters** bridge HTTP or AWS event shapes to `router.dispatch(event)` and map errors to 400 (bad signature) / 500 (handler) as documented in each package.

## Monorepo map

- `packages/core` — router engine and shared types
- `packages/stripe` — `StripeWebhookRouter`, `createStripeVerifier`, `StripeEventMap`
- `packages/hono`, `packages/express`, `packages/lambda`, `packages/eventbridge` — adapters
- `packages/zod` — runtime validation helpers (peer: `zod` v4+)
- `packages/create-kotodayori` — `npx create-kotodayori` templates and CLI
- `examples/sample-hono-stripe`, `examples/sample-express-stripe` — generated samples wired with `workspace:*`

## Critical rules

### Raw body (Stripe and most HMAC providers)

- **Hono**: use `honoAdapter`; it reads raw text from the request for verification.
- **Express**: apply `express.raw({ type: 'application/json' })` **only** on the webhook path **before** `expressAdapter`. If the body was parsed by `express.json()`, signature verification will fail.

### TypeScript + adapters

- Pass the event map generic on adapters when using Stripe: `honoAdapter<StripeEventMap>(router, { ... })` and `expressAdapter<StripeEventMap>(router, { ... })` so inference lines up with `createStripeVerifier`.
- Prefer full Stripe event names in `router.on('customer.subscription.created', ...)` over `router.group(...)` when you need precise `event.data.object` typing (`group()` registers handlers as generic `WebhookEvent` today).

### Errors

- Do not leak stack traces or secrets in HTTP responses. Follow existing adapter patterns (`onError` callback, generic 500 body).

## Scaffolding (`create-kotodayori`)

Non-interactive usage (matches `npx create-kotodayori`):

```bash
pnpm --filter create-kotodayori build
cd examples
node ../packages/create-kotodayori/dist/index.js my-app --fw=hono --pm=pnpm --skip-install
```

Frameworks: `hono`, `express`, `lambda`, `eventbridge`.

After generating inside this monorepo, set `@kotodayori/*` dependencies to `workspace:*` and add `"private": true` in the sample `package.json`, then `pnpm install` from the repo root.

## Typical edit flow

1. Change implementation under `packages/<pkg>/src/`.
2. Adjust or add tests in `packages/<pkg>/test/`.
3. From repo root: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`.
4. If templates change, rebuild the CLI and regenerate or manually sync `examples/` and template files under `packages/create-kotodayori/templates/`.

## Stripe event map maintenance

When the Stripe SDK peer range moves, use `packages/stripe` scripts and `MAINTAINING_STRIPE_EVENTMAP.md`. Prefer running `pnpm run check-events` inside `packages/stripe` after dependency updates.

## Verification commands

```bash
pnpm build
pnpm typecheck
pnpm lint
pnpm test
```

For a single example package after a full workspace build:

```bash
pnpm --filter sample-hono-stripe typecheck
pnpm --filter sample-express-stripe typecheck
```

## Related human docs

- `claude.md` — long-form maintainer guide for this repo
- `README.md` — user-facing overview and quick starts
