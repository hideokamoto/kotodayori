# Kotodayori — Agent context

Kotodayori is a pnpm monorepo of TypeScript packages for type-safe webhook routing (`@kotodayori/core`) with adapters (Hono, Express, Lambda, EventBridge), Stripe helpers (`@kotodayori/stripe`), optional Zod validation (`@kotodayori/zod`), and a scaffold CLI (`create-kotodayori`).

## Always do

- Preserve the **Verifier** contract: raw body (`Buffer` or `string`) before signature verification; never verify a parsed JSON object.
- **Express**: register `express.raw({ type: 'application/json' })` on the webhook route before `expressAdapter`.
- Run checks from the repo root when changing packages: `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm test`.

## Where to look

| Area | Path |
| --- | --- |
| Router and types | `packages/core/src/index.ts` |
| Stripe router + verifier | `packages/stripe/src/index.ts` |
| Adapters | `packages/{hono,express,lambda,eventbridge}/src/index.ts` |
| Scaffold templates | `packages/create-kotodayori/templates/` |
| Runnable samples | `examples/sample-hono-stripe`, `examples/sample-express-stripe` |
| Human-oriented guide | `claude.md` |

## On-demand skill (installable)

The **`kotodayori-webhooks`** skill is distributed under [`skills/kotodayori-webhooks/`](./skills/kotodayori-webhooks/SKILL.md) for tools such as `npx skills add` (same layout as [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills)). Install into your editor/agent from any project:

```bash
npx skills add hideokamoto/kotodayori --skill kotodayori-webhooks -y
```

See [`skills/README.md`](./skills/README.md) for `gh` and sparse-checkout variants.
