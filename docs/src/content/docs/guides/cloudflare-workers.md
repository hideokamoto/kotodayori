---
title: Cloudflare Workers
description: Deploy Kotodayori webhook handlers on Cloudflare Workers with Hono
---

Cloudflare Workers is an excellent runtime for webhook handlers: requests are processed at the edge, cold starts are near-zero, and the [Hono adapter](/packages/hono) integrates naturally. The key difference from Node.js is that **there is no `process.env`** — secrets and bindings (D1, KV, queues) arrive per-request via `c.env` rather than as global variables.

This guide shows how to keep the router and its handlers at **module scope** (registered once, not rebuilt on every request) while still accessing per-request bindings inside handlers.

## `wrangler.jsonc` configuration

The Stripe SDK requires Node.js compatibility APIs. Enable them with the `nodejs_compat` flag, which also activates `nodejs_als` (AsyncLocalStorage) used by the optional `contextStorage()` pattern:

```jsonc
{
  "name": "my-worker",
  "main": "src/index.ts",
  "compatibility_date": "2024-11-01",
  "compatibility_flags": ["nodejs_compat"]
}
```

### Secrets

Store secrets with the Wrangler CLI for production, and in a `.dev.vars` file for local development:

```bash
# Production (run once per secret)
wrangler secret put STRIPE_API_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET
```

```bash
# .dev.vars  (gitignored — local only)
STRIPE_API_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
```

Declare the bindings in TypeScript so they are type-checked:

```typescript
interface Bindings {
  STRIPE_API_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  SLACK_WEBHOOK_URL: string;
  DB: D1Database;
}
```

## Basic setup: module-scope router with per-request Stripe client

On Workers, the Stripe client **must** use the `fetch`-based HTTP client because the default Node.js HTTP adapter is not available. Build it inside the route handler, where `c.env` is accessible:

```typescript
import Stripe from 'stripe';
import { Hono } from 'hono';
import { honoAdapter } from '@kotodayori/hono';
import { StripeWebhookRouter, createStripeVerifier } from '@kotodayori/stripe';

interface Bindings {
  STRIPE_API_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
}

// Register the router and all handlers ONCE at module scope.
// The router itself holds no secrets — only the event-to-handler map.
const router = new StripeWebhookRouter();

router.on('payment_intent.succeeded', async (event) => {
  const paymentIntent = event.data.object;
  console.log('Payment succeeded:', paymentIntent.id);
});

router.on('customer.subscription.deleted', async (event) => {
  const subscription = event.data.object;
  console.log('Subscription canceled:', subscription.id);
});

// Build the Hono app.
const app = new Hono<{ Bindings: Bindings }>();

app.post('/webhook', (c) => {
  // Build a fresh Stripe client per request using env from this request context.
  // Stripe.createFetchHttpClient() is required on Workers (no Node.js HTTP adapter).
  const stripe = new Stripe(c.env.STRIPE_API_KEY, {
    httpClient: Stripe.createFetchHttpClient(),
  });

  // createStripeVerifier uses constructEventAsync() internally — required on Workers
  // because the Web Crypto SubtleCryptoProvider only supports async verification.
  // This has worked out of the box since @kotodayori/stripe 1.1.0.
  return honoAdapter(router, {
    verifier: createStripeVerifier(stripe, c.env.STRIPE_WEBHOOK_SECRET),
  })(c);
});

export default app;
```

> **Note:** Do not call `new Stripe(...)` at module scope on Workers. At module initialisation time there is no request context, so `c.env` does not exist yet. Build the Stripe client inside the route handler instead.

## Accessing `env` inside handlers

Handlers receive the Hono context `c` as their **second argument**, so they can read per-request bindings (write to D1, post to Slack, read a secret) while the router itself stays at module scope. Declare the context type on the router to get `c.env` fully typed:

```typescript
import Stripe from 'stripe';
import { Hono, type Context } from 'hono';
import { honoAdapter } from '@kotodayori/hono';
import { StripeWebhookRouter, createStripeVerifier } from '@kotodayori/stripe';

interface Bindings {
  STRIPE_API_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  SLACK_WEBHOOK_URL: string;
  DB: D1Database;
}

type AppEnv = { Bindings: Bindings };

// Registered once at module scope; `c` arrives per request as the second argument
const router = new StripeWebhookRouter<Context<AppEnv>>();

router.on('checkout.session.completed', async (event, c) => {
  // Write to D1
  await c.env.DB.prepare(
    'INSERT INTO orders (session_id, amount) VALUES (?, ?)'
  )
    .bind(event.data.object.id, event.data.object.amount_total)
    .run();

  // Post to Slack
  await fetch(c.env.SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: `New order: ${event.data.object.id}` }),
  });
});

const app = new Hono<AppEnv>();

app.post('/webhook', (c) => {
  const stripe = new Stripe(c.env.STRIPE_API_KEY, {
    httpClient: Stripe.createFetchHttpClient(),
  });
  return honoAdapter(router, {
    verifier: createStripeVerifier(stripe, c.env.STRIPE_WEBHOOK_SECRET),
  })(c);
});

export default app;
```

`honoAdapter` passes `c` to `router.dispatch(event, c)`, which forwards it to every handler, `fanout()` handler and middleware (as the third argument).

### Passing only what handlers need: `createContext`

To keep handlers independent of Hono (easier to unit-test, reusable from other adapters), give the router a context type of your own and build it with `createContext`. When the router's context is not something Hono's `Context` satisfies, `createContext` is **required by the types**, so you cannot forget it:

```typescript
interface WebhookContext {
  db: D1Database;
  slackUrl: string;
}

const router = new StripeWebhookRouter<WebhookContext>();

router.on('checkout.session.completed', async (event, { db }) => {
  await db.prepare('INSERT INTO orders (session_id) VALUES (?)')
    .bind(event.data.object.id)
    .run();
});

app.post('/webhook', (c) => {
  const stripe = new Stripe(c.env.STRIPE_API_KEY, {
    httpClient: Stripe.createFetchHttpClient(),
  });
  return honoAdapter(router, {
    verifier: createStripeVerifier(stripe, c.env.STRIPE_WEBHOOK_SECRET),
    createContext: () => ({ db: c.env.DB, slackUrl: c.env.SLACK_WEBHOOK_URL }),
  })(c);
});
```

`createContext` may be async. If it throws, the adapter responds with 500 and calls `onError`, the same as a handler error.

### Alternative: Hono `contextStorage()` + `getContext()`

If code deep inside your handlers (not the handlers themselves) needs the context, Hono's `contextStorage()` middleware (backed by AsyncLocalStorage) stores the current `Context` for the lifetime of each request, and `getContext()` retrieves it anywhere during that request. Register `app.use(contextStorage())` before the webhook route, then call `getContext<AppEnv>()`. Note that the type parameter of `getContext()` is asserted by you rather than inferred from the router. This requires the `nodejs_compat` (or `nodejs_als`) compatibility flag.

### Alternative: `cloudflare:workers` env import

Workers provides a module-level `env` binding via the `cloudflare:workers` virtual module. This avoids Hono entirely if you prefer a Workers-native approach:

```typescript
import { env } from 'cloudflare:workers';
import { StripeWebhookRouter } from '@kotodayori/stripe';

const router = new StripeWebhookRouter();

router.on('checkout.session.completed', async (event) => {
  // env is the per-request bindings object, available at the module level.
  await fetch(env.SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: `New order: ${event.data.object.id}` }),
  });
});
```

This requires a recent `compatibility_date`. Check your Worker's compatibility date in Wrangler and the [Cloudflare compatibility flags docs](https://developers.cloudflare.com/workers/configuration/compatibility-dates/) to confirm support. This approach is Workers-only and does not port to Node.js, Express, or Lambda.

## Local development and testing

Start the Worker locally with `wrangler dev`. Wrangler automatically loads `.dev.vars`:

```bash
wrangler dev
```

Forward real Stripe test events to your local server with the Stripe CLI:

```bash
stripe listen --forward-to localhost:8787/webhook
```

The Stripe CLI prints a webhook signing secret (starts with `whsec_`). Put it in `.dev.vars` as `STRIPE_WEBHOOK_SECRET` and restart `wrangler dev`. Trigger a test event to verify the full flow:

```bash
stripe trigger payment_intent.succeeded
```

## Common pitfalls

- **Do not rebuild the router on every request.** The router holds only handler registrations — it is safe (and intended) to create it once at module scope. Creating a new router per request wastes memory and loses any handler setup work.
- **Do not hand-write a signature verifier.** `createStripeVerifier` from `@kotodayori/stripe` handles Workers' async Web Crypto requirement automatically. See the [Stripe Webhooks guide](/guides/stripe-webhooks) for full details.
- **Do not forget `nodejs_compat`.** The Stripe SDK needs Node.js-compatible APIs. Omitting `"compatibility_flags": ["nodejs_compat"]` in `wrangler.jsonc` causes runtime errors. This flag also enables the `nodejs_als` flag required by Hono's `contextStorage()`, if you use it.
- **Do not build the Stripe client at module scope.** `c.env` only exists inside a request context. Build `new Stripe(c.env.STRIPE_API_KEY, ...)` inside the route handler.
