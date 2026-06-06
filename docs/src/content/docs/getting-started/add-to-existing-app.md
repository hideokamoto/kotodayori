---
title: Add to an Existing App
description: Add Kotodayori to an existing Hono, Express, or Lambda application
---

Already have a Hono (or Express / Lambda) app? You can add Kotodayori without scaffolding a new project. Install the packages you need, create a router, and mount it on an existing route.

If you're starting from scratch, the [Quick Start](/getting-started/quick-start/) with `create-kotodayori` is faster.

## Prerequisites

- **Node.js** >= 18
- An existing app using a supported framework (Hono, Express, or Lambda)

## 1. Install the packages

Pick the combination that matches your use case:

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

## 2. Create a router and mount it

Add a router and wire it onto a route in your existing Hono app:

```typescript
import { Hono } from 'hono';
import Stripe from 'stripe';
import { StripeWebhookRouter, createStripeVerifier } from '@kotodayori/stripe';
import { honoAdapter } from '@kotodayori/hono';

const stripe = new Stripe(process.env.STRIPE_API_KEY!);
const router = new StripeWebhookRouter();

router.on('payment_intent.succeeded', async (event) => {
  console.log('Payment succeeded:', event.data.object.id);
});

// `app` is your existing Hono application
app.post('/webhook', honoAdapter(router, {
  verifier: createStripeVerifier(stripe, process.env.STRIPE_WEBHOOK_SECRET!),
}));
```

For Express, use `express.raw({ type: 'application/json' })` before the adapter so the verifier receives the raw body. For Lambda, export the handler from `lambdaAdapter(router, { verifier })`.

## Peer dependencies

- **Stripe adapter** (`@kotodayori/stripe`): `stripe` >= 17.0.0
- **Hono adapter** (`@kotodayori/hono`): `hono` >= 4.0.0
- **Express adapter** (`@kotodayori/express`): `express` >= 4.0.0
- **Zod integration** (`@kotodayori/zod`): `zod` ^4.0.0

Install the peer dependencies for the packages you use.

## Next steps

- [Stripe Webhooks](/guides/stripe-webhooks/) — Set up Stripe webhooks with type safety
- [Custom Webhooks](/guides/custom-webhooks/) — Use Kotodayori with any webhook provider
- [Routing](/guides/routing/) — Group handlers and mount nested routers
