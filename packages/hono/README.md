# @kotodayori/hono

[![npm version](https://img.shields.io/npm/v/%40kotodayori%2Fhono.svg?logo=npm&label=npm)](https://www.npmjs.com/package/@kotodayori/hono)
[![npm downloads](https://img.shields.io/npm/dm/%40kotodayori%2Fhono.svg)](https://www.npmjs.com/package/@kotodayori/hono)
[![license](https://img.shields.io/npm/l/%40kotodayori%2Fhono.svg)](https://www.npmjs.com/package/@kotodayori/hono)

Hono framework adapter for Kotodayori webhook router.

## Overview

`@kotodayori/hono` provides a seamless integration between Kotodayori's type-safe webhook routing and the [Hono](https://hono.dev/) web framework. Perfect for edge computing platforms like Cloudflare Workers, Deno, and Bun.

## Installation

```bash
npm install @kotodayori/hono @kotodayori/core hono
# or
pnpm add @kotodayori/hono @kotodayori/core hono
# or
yarn add @kotodayori/hono @kotodayori/core hono
```

**Note**: Both `@kotodayori/core` and `hono` are peer dependencies and must be installed separately.

## Features

- **Edge-Ready**: Works on Cloudflare Workers, Deno Deploy, Bun, and Node.js
- **Type-Safe**: Full TypeScript support with Hono's context types
- **Minimal Overhead**: Lightweight adapter with no performance penalty
- **Error Handling**: Built-in error handling with customizable error responses
- **Flexible Configuration**: Customize success responses and error handling

## Quick Start

### With Stripe Webhooks

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

router.on('customer.subscription.created', async (event) => {
  console.log('New subscription:', event.data.object.id);
});

const app = new Hono();

app.post('/webhook', honoAdapter(router, {
  verifier: createStripeVerifier(stripe, process.env.STRIPE_WEBHOOK_SECRET!),
}));

export default app;
```

### With Custom Webhooks

```typescript
import { Hono } from 'hono';
import { WebhookRouter, type Verifier } from '@kotodayori/core';
import { honoAdapter } from '@kotodayori/hono';

// Define your event types
interface MyEvent extends WebhookEvent {
  type: 'my.event';
  data: { object: { id: string; message: string } };
}

type MyEventMap = {
  'my.event': MyEvent;
};

// Create a custom verifier
const myVerifier: Verifier = (payload, headers) => {
  // Verify signature and parse payload
  const body = JSON.parse(payload.toString());
  return {
    event: {
      id: body.id,
      type: body.type,
      data: { object: body.data },
    },
  };
};

const router = new WebhookRouter<MyEventMap>();

router.on('my.event', async (event) => {
  console.log('Custom event:', event.data.object.message);
});

const app = new Hono();

app.post('/webhook', honoAdapter(router, {
  verifier: myVerifier,
}));

export default app;
```

## API Reference

### honoAdapter

Creates a Hono handler from a Kotodayori webhook router.

```typescript
function honoAdapter<TEventMap>(
  router: WebhookRouter<TEventMap>,
  options: HonoAdapterOptions
): Handler
```

**Parameters:**

- `router` - A `WebhookRouter` instance from `@kotodayori/core`
- `options` - Configuration options

**Returns:** A Hono `Handler` function

### HonoAdapterOptions

```typescript
interface HonoAdapterOptions {
  /**
   * Verifier function for webhook signature validation
   * @required
   */
  verifier: Verifier;

  /**
   * Custom error handler
   * @optional
   */
  onError?: (error: Error, event?: WebhookEvent) => Promise<void> | void;

  /**
   * Custom success response
   * @optional
   * @default { success: true }
   */
  successResponse?: unknown;
}
```

## Advanced Usage

### Custom Error Handling

```typescript
app.post('/webhook', honoAdapter(router, {
  verifier: createStripeVerifier(stripe, secret),
  onError: async (error, event) => {
    // Log to monitoring service
    console.error(`Webhook error for ${event?.type}:`, error);

    // Send to error tracking
    await Sentry.captureException(error, {
      tags: {
        eventType: event?.type,
        eventId: event?.id,
      },
    });
  },
}));
```

### Custom Success Response

```typescript
app.post('/webhook', honoAdapter(router, {
  verifier: createStripeVerifier(stripe, secret),
  successResponse: {
    status: 'ok',
    processed: true,
    timestamp: Date.now(),
  },
}));
```

### Multiple Webhook Endpoints

```typescript
const app = new Hono();

// Stripe webhooks
const stripeRouter = new StripeWebhookRouter();
stripeRouter.on('payment_intent.succeeded', async (event) => {
  // Handle payment
});

app.post('/webhooks/stripe', honoAdapter(stripeRouter, {
  verifier: createStripeVerifier(stripe, stripeSecret),
}));

// GitHub webhooks
const githubRouter = new WebhookRouter<GitHubEventMap>();
githubRouter.on('push', async (event) => {
  // Handle push
});

app.post('/webhooks/github', honoAdapter(githubRouter, {
  verifier: createGitHubVerifier(githubSecret),
}));
```

## Platform-Specific Examples

### Cloudflare Workers

On Workers, configure Stripe with `Stripe.createFetchHttpClient()` and read
secrets from the `env` bindings (there is no `process.env`). `createStripeVerifier`
uses Stripe's `constructEventAsync()` internally, so signature verification works
on the Workers runtime — which requires async Web Crypto — out of the box.

```typescript
import { Hono } from 'hono';
import { StripeWebhookRouter, createStripeVerifier } from '@kotodayori/stripe';
import { honoAdapter } from '@kotodayori/hono';
import Stripe from 'stripe';

type Bindings = {
  STRIPE_API_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// Define the router and register handlers once, at module scope
const router = new StripeWebhookRouter();
router.on('payment_intent.succeeded', async (event) => {
  console.log('Payment:', event.data.object.id);
});

app.post('/webhook', (c) => {
  // Secrets come from the `env` bindings, so build the Stripe client per request
  const stripe = new Stripe(c.env.STRIPE_API_KEY, {
    httpClient: Stripe.createFetchHttpClient(),
  });

  return honoAdapter(router, {
    verifier: createStripeVerifier(stripe, c.env.STRIPE_WEBHOOK_SECRET),
  })(c);
});

export default app;
```

### Deno Deploy

```typescript
import { Hono } from 'https://deno.land/x/hono/mod.ts';
import Stripe from 'npm:stripe';
import { StripeWebhookRouter, createStripeVerifier } from 'npm:@kotodayori/stripe';
import { honoAdapter } from 'npm:@kotodayori/hono';

const app = new Hono();
const router = new StripeWebhookRouter();

router.on('charge.succeeded', async (event) => {
  console.log('Charge:', event.data.object.id);
});

app.post('/webhook', honoAdapter(router, {
  verifier: createStripeVerifier(
    new Stripe(Deno.env.get('STRIPE_API_KEY')!),
    Deno.env.get('STRIPE_WEBHOOK_SECRET')!
  ),
}));

Deno.serve(app.fetch);
```

### Bun

```typescript
import { Hono } from 'hono';
import Stripe from 'stripe';
import { StripeWebhookRouter, createStripeVerifier } from '@kotodayori/stripe';
import { honoAdapter } from '@kotodayori/hono';

const app = new Hono();
const router = new StripeWebhookRouter();

router.on('invoice.paid', async (event) => {
  console.log('Invoice:', event.data.object.id);
});

app.post('/webhook', honoAdapter(router, {
  verifier: createStripeVerifier(
    new Stripe(process.env.STRIPE_API_KEY!),
    process.env.STRIPE_WEBHOOK_SECRET!
  ),
}));

export default {
  port: 3000,
  fetch: app.fetch,
};
```

## Error Responses

The adapter automatically returns appropriate HTTP responses:

### Success (200 OK)

```json
{
  "success": true
}
```

### Verification Failed (401 Unauthorized)

```json
{
  "error": "Webhook verification failed"
}
```

### Handler Error (500 Internal Server Error)

```json
{
  "error": "Webhook processing failed"
}
```

## Testing

### Unit Testing with Hono

```typescript
import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { StripeWebhookRouter } from '@kotodayori/stripe';
import { honoAdapter } from '@kotodayori/hono';

describe('Webhook handler', () => {
  it('processes payment_intent.succeeded events', async () => {
    const router = new StripeWebhookRouter();
    let processed = false;

    router.on('payment_intent.succeeded', async () => {
      processed = true;
    });

    const app = new Hono();
    app.post('/webhook', honoAdapter(router, {
      verifier: mockVerifier,
    }));

    const res = await app.request('/webhook', {
      method: 'POST',
      body: mockPayload,
    });

    expect(res.status).toBe(200);
    expect(processed).toBe(true);
  });
});
```

## Requirements

- Node.js >= 18 (or Deno, Bun, Cloudflare Workers runtime)
- TypeScript >= 5.3
- Hono >= 4.0.0

## Related Packages

- [`@kotodayori/core`](../core) - Core webhook routing logic
- [`@kotodayori/stripe`](../stripe) - Stripe-specific type definitions and verifier
- [`@kotodayori/express`](../express) - Express framework adapter
- [`@kotodayori/lambda`](../lambda) - AWS Lambda adapter
- [`@kotodayori/eventbridge`](../eventbridge) - AWS EventBridge adapter
- [`@kotodayori/zod`](../zod) - Zod schema validation helpers

## Documentation

For more examples and guides, see the [main documentation](../../README.md).

## License

MIT
