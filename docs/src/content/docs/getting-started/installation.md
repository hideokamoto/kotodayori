---
title: Installation
description: Install Kotodayori and its dependencies
---

## Prerequisites

- **Node.js** >= 18
- **Package manager**: pnpm, npm, or yarn

## Install by use case

### Stripe with Hono

```bash
pnpm add @kotodayori/stripe @kotodayori/hono stripe
```

### Stripe with Express

```bash
pnpm add @kotodayori/stripe @kotodayori/express stripe
```

### Stripe with AWS Lambda

```bash
pnpm add @kotodayori/stripe @kotodayori/lambda stripe
```

### Custom webhooks (without Stripe)

Use the core router with any adapter:

```bash
pnpm add @kotodayori/core @kotodayori/hono
# or @kotodayori/express, @kotodayori/lambda
```

### Runtime validation with Zod

If you want runtime schema validation in addition to type safety:

```bash
pnpm add @kotodayori/stripe @kotodayori/zod @kotodayori/hono stripe zod
```

## Scaffolding with create-kotodayori

The fastest way to create a new project is with the scaffolding tool:

```bash
npx create-kotodayori
```

This will interactively guide you through creating a new Kotodayori project with your preferred framework and package manager.

You can also specify options directly:

```bash
# Create a new Hono-based webhook handler
npx create-kotodayori my-webhook-handler --fw=hono

# With custom package manager
npx create-kotodayori my-webhook-handler --fw=hono --pm=pnpm
```

## Peer dependencies

- **Stripe adapter** (`@kotodayori/stripe`): `stripe` >= 17.0.0
- **Hono adapter** (`@kotodayori/hono`): `hono` >= 4.0.0
- **Express adapter** (`@kotodayori/express`): `express` >= 4.0.0
- **Zod integration** (`@kotodayori/zod`): `zod` ^4.0.0

Install the peer dependencies for the packages you use.
