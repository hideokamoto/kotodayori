---
title: "@kotodayori/hono"
description: Hono framework adapter for Kotodayori
---

[![npm version](https://img.shields.io/npm/v/%40kotodayori%2Fhono.svg?logo=npm&label=npm)](https://www.npmjs.com/package/@kotodayori/hono)
[![npm downloads](https://img.shields.io/npm/dm/%40kotodayori%2Fhono.svg)](https://www.npmjs.com/package/@kotodayori/hono)
[![license](https://img.shields.io/npm/l/%40kotodayori%2Fhono.svg)](https://www.npmjs.com/package/@kotodayori/hono)

The Hono adapter connects a Kotodayori router to a Hono app, handling raw body extraction, signature verification, and response formatting.

## Installation

```bash
pnpm add @kotodayori/hono hono
```

**Peer dependency**: `hono` >= 4.0.0

## Usage

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

const app = new Hono();

app.post('/webhook', honoAdapter(router, {
  verifier: createStripeVerifier(stripe, process.env.STRIPE_WEBHOOK_SECRET!),
  onError: async (error, event) => {
    console.error('Handler error:', error);
  },
}));

export default app;
```

## API

```typescript
function honoAdapter<TEventMap>(
  router: WebhookRouter<TEventMap>,
  options: {
    verifier: Verifier;
    onError?: (error: Error, event?: WebhookEvent) => Promise<void>;
  }
): (c: Context) => Promise<Response>
```

- **verifier** — Required. Verifies the request and returns the event (e.g. `createStripeVerifier`).
- **onError** — Optional. Called when a handler throws; useful for logging or error reporting.

The adapter uses `c.req.text()` for the raw body (required for signature verification) and returns standard Hono `Response` objects (200 on success, 400 on verification failure, 500 on handler error).
