---
name: kotodayori-webhooks
description: >
  Kotodayori: type-safe webhook routing (@kotodayori/core), Stripe helpers
  (@kotodayori/stripe), adapters (hono, express, lambda, eventbridge), Zod
  (@kotodayori/zod), and create-kotodayori scaffolding. Use when implementing
  or debugging webhook routes, signature verification, Stripe event handlers,
  framework adapters, or the create-kotodayori CLI. Keywords: WebhookRouter,
  StripeWebhookRouter, createStripeVerifier, honoAdapter, expressAdapter,
  express.raw, create-kotodayori, kotodayori.
user-invocable: true
metadata:
  author: kotodayori
  version: "1.0.0"
---

# Kotodayori webhooks (agent playbook)

Use this skill when working on webhook routing, Stripe verification, adapters, the scaffold CLI, or sample apps that use Kotodayori.

## Installation (from this repository)

This skill is published as a **directory under `skills/kotodayori-webhooks/`** in the [kotodayori](https://github.com/hideokamoto/kotodayori) repo, compatible with the [`skills` CLI](https://www.npmjs.com/package/skills) used by [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills).

### Option A: `npx skills add` (recommended)

```bash
# Default branch on GitHub — install only this skill into the current project
npx skills add hideokamoto/kotodayori --skill kotodayori-webhooks -y

# Or point at the skill subtree (branch name may differ before merge)
npx skills add https://github.com/hideokamoto/kotodayori/tree/main/skills/kotodayori-webhooks -y
```

Use `-g` to install into the user home agent directories instead of the project. Combine with `-a cursor` / `-a claude-code` (see `npx skills add --help`) to target a specific agent.

### Option B: `gh` clone + `npx skills add`

```bash
gh repo clone hideokamoto/kotodayori /tmp/kotodayori -- --depth 1
npx skills add /tmp/kotodayori/skills/kotodayori-webhooks --copy -y
rm -rf /tmp/kotodayori
```

### Option C: sparse checkout (minimal download)

```bash
mkdir kotodayori-skill && cd kotodayori-skill
git init
git remote add origin https://github.com/hideokamoto/kotodayori.git
git sparse-checkout init --cone
git sparse-checkout set skills/kotodayori-webhooks
git pull origin main
cd ..
npx skills add ./kotodayori-skill/skills/kotodayori-webhooks -y
```

More detail: [`skills/README.md`](https://github.com/hideokamoto/kotodayori/blob/main/skills/README.md) in the same repository.

## Mental model

1. **Core** (`@kotodayori/core`): `WebhookRouter` dispatches typed events; middleware and grouping behave like a small Hono-style stack.
2. **Verification**: A `Verifier` receives the **raw** payload and headers, verifies authenticity, then returns `{ event }` as `WebhookEvent`. Adapters must not parse JSON before the verifier runs.
3. **Adapters** bridge HTTP or AWS event shapes to `router.dispatch(event)` and map errors to 400 (bad signature) / 500 (handler) as documented in each package.

## Repository layout (when hacking on Kotodayori itself)

If the workspace is the **kotodayori monorepo**:

- `packages/core` — router engine and shared types
- `packages/stripe` — `StripeWebhookRouter`, `createStripeVerifier`, `StripeEventMap`
- `packages/hono`, `packages/express`, `packages/lambda`, `packages/eventbridge` — adapters
- `packages/zod` — runtime validation helpers (peer: `zod` v4+)
- `packages/create-kotodayori` — `npx create-kotodayori` templates and CLI
- `examples/sample-hono-stripe`, `examples/sample-express-stripe` — samples using `workspace:*`

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

Non-interactive usage:

```bash
npx create-kotodayori my-app --fw=hono --pm=pnpm --skip-install
```

Frameworks: `hono`, `express`, `lambda`, `eventbridge`.

Inside the **kotodayori** monorepo you can also run the workspace CLI after `pnpm --filter create-kotodayori build`, then point `node packages/create-kotodayori/dist/index.js ...` at a target directory. After generating samples there, set `@kotodayori/*` to `workspace:*` and `"private": true` when appropriate.

## Typical edit flow (monorepo)

1. Change implementation under `packages/<pkg>/src/`.
2. Adjust or add tests in `packages/<pkg>/test/`.
3. From repo root: `pnpm build && pnpm typecheck && pnpm lint && pnpm test`.
4. If templates change, rebuild the CLI and regenerate or manually sync `examples/` and `packages/create-kotodayori/templates/`.

## Stripe event map maintenance

When the Stripe SDK peer range moves, use `packages/stripe` scripts and `MAINTAINING_STRIPE_EVENTMAP.md`. Prefer running `pnpm run check-events` inside `packages/stripe` after dependency updates.

## Verification commands (monorepo)

```bash
pnpm build
pnpm typecheck
pnpm lint
pnpm test
```

For example packages after a full workspace build:

```bash
pnpm --filter sample-hono-stripe typecheck
pnpm --filter sample-express-stripe typecheck
```

## Related docs

- Upstream repository: [github.com/hideokamoto/kotodayori](https://github.com/hideokamoto/kotodayori)
- Maintainer-oriented guide in that repo: `claude.md`
- User overview: `README.md`
