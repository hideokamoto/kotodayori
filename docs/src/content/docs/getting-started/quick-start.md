---
title: Quick Start (create-kotodayori)
description: Scaffold a new Kotodayori project from scratch with create-kotodayori
---

The fastest way to start from scratch is the `create-kotodayori` scaffolding tool. It generates a ready-to-run project with your chosen framework, example handlers, and dev setup.

If you want to add Kotodayori to an app you already have, see [Add to an Existing App](/getting-started/add-to-existing-app/) instead.

## Prerequisites

- **Node.js** >= 18
- **Package manager**: pnpm, npm, yarn, or bun

## Scaffold a project

Run the tool and follow the interactive prompts to choose a framework and package manager:

```bash
npx create-kotodayori
```

You can also pass options directly to skip the prompts:

```bash
# Create a new Hono-based webhook handler
npx create-kotodayori my-webhook-handler --fw=hono

# With a specific package manager
npx create-kotodayori my-webhook-handler --fw=hono --pm=pnpm
```

### Options

| Option | Short | Description |
|--------|-------|-------------|
| `--framework` | `--fw` | Framework: `hono`, `express`, `lambda`, `eventbridge` |
| `--package-manager` | `--pm` | Package manager: `pnpm`, `npm`, `yarn`, `bun` |
| `--skip-install` | — | Skip dependency installation after scaffolding |

## What gets generated (Hono)

The Hono template includes:

- A Hono app with a webhook route already wired up
- Example handlers for payment and subscription events
- Logging middleware
- TypeScript, tsup, and a dev server setup
- `.env.example` and a README with the template variables

> **Other frameworks**: Express, Lambda, and EventBridge templates are coming soon. For now, scaffold with Hono or follow [Add to an Existing App](/getting-started/add-to-existing-app/).

## Run the project

After scaffolding finishes, start the dev server:

```bash
cd my-webhook-handler
cp .env.example .env   # fill in your STRIPE_API_KEY and STRIPE_WEBHOOK_SECRET
pnpm dev
```

Then customize the handlers and add more events as needed.

## Next steps

- [Stripe Webhooks](/guides/stripe-webhooks/) — Set up Stripe webhooks with type safety
- [Custom Webhooks](/guides/custom-webhooks/) — Use Kotodayori with any webhook provider
- [create-kotodayori](/packages/create-kotodayori/) — Full CLI reference
