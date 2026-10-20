# Kotodayori — Agent context

Kotodayori is a pnpm monorepo of TypeScript packages for type-safe webhook routing (`@kotodayori/core`) with adapters (Hono, fetch, Express, Lambda, EventBridge), Stripe helpers (`@kotodayori/stripe`), optional Zod validation (`@kotodayori/zod`), and a scaffold CLI (`create-kotodayori`).

## Always do

- Preserve the **Verifier** contract: raw body (`string` or `Uint8Array`; a Node `Buffer` is a `Uint8Array`) before signature verification; never verify a parsed JSON object.
- **Express**: register `express.raw({ type: 'application/json' })` on the webhook route before `expressAdapter`.
- Run checks from the repo root when changing packages: `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm test`.

## Where to look

| Area | Path |
| --- | --- |
| Router and types | `packages/core/src/index.ts` |
| Stripe router + verifier | `packages/stripe/src/index.ts` |
| Adapters | `packages/{hono,fetch,express,lambda,eventbridge}/src/index.ts` (shared HTTP flow: `handleWebhook` in core) |
| Scaffold templates | `packages/create-kotodayori/templates/` |
| Runnable samples | `examples/sample-hono-stripe`, `examples/sample-express-stripe` |
| Human-oriented guide | `claude.md` |

## On-demand skill (installable)

Two skills are distributed under `skills/`:

- **`create-kotodayori`** ([`skills/create-kotodayori/`](./skills/create-kotodayori/SKILL.md)): running the scaffolding CLI safely.
- **`kotodayori-webhooks`**: router, verifier, and adapter APIs.

The **`kotodayori-webhooks`** skill is distributed under [`skills/kotodayori-webhooks/`](./skills/kotodayori-webhooks/SKILL.md) for tools such as `npx skills add` (same layout as [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills)). Install into your editor/agent from any project:

```bash
npx skills add hideokamoto/kotodayori --skill kotodayori-webhooks -y
npx skills add hideokamoto/kotodayori --skill create-kotodayori -y
```

**When you change `packages/create-kotodayori` (flags, accepted values, `engines.node`, generated output), update `skills/create-kotodayori/SKILL.md` in the same change.** `packages/create-kotodayori/src/skill.test.ts` fails when the Node.js range or the option list drifts. The docs site serves this file at build time (`/skill.md`, `/.well-known/agent-skills/`), so there is no copy to sync.

See [`skills/README.md`](./skills/README.md) for `gh` and sparse-checkout variants.
