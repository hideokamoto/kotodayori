---
title: Quick Start (create-kotodayori)
description: Scaffold a new Kotodayori project from scratch with create-kotodayori
---

The fastest way to start from scratch is the `create-kotodayori` scaffolding tool. It generates a ready-to-run project with your chosen framework, example handlers, and dev setup.

If you want to add Kotodayori to an app you already have, see [Add to an Existing App](/getting-started/add-to-existing-app/) instead.

To try Kotodayori before installing anything, open the [StackBlitz demo](https://stackblitz.com/github/hideokamoto/kotodayori/tree/main/examples/stackblitz-demo?file=src/router.ts). It runs in your browser and sends signed fake Stripe events, so no Stripe account is needed.

## Prerequisites

- **Node.js** >= 20.19.0
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

Besides `--fw` and `--pm`, the CLI accepts `--skip-install`, `--skill <agents>` / `--no-skill`, `--help`, and `--version`. See the [create-kotodayori reference](/packages/create-kotodayori/) for every option and how values are checked.

## What gets generated (Hono)

The Hono template includes:

- A Hono app with a webhook route already wired up
- Example handlers for payment and subscription events
- Logging middleware
- TypeScript, tsup, and a dev server setup
- `.env.example` and a README with the template variables

> **Other frameworks**: `--fw=express`, `--fw=lambda`, and `--fw=eventbridge` generate the matching templates.

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
