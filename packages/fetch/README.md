# @kotodayori/fetch

[![npm version](https://img.shields.io/npm/v/%40kotodayori%2Ffetch.svg?logo=npm&label=npm)](https://www.npmjs.com/package/@kotodayori/fetch)
[![license](https://img.shields.io/npm/l/%40kotodayori%2Ffetch.svg)](https://www.npmjs.com/package/@kotodayori/fetch)

Web-standard fetch adapter for Kotodayori webhook router.

## Overview

`@kotodayori/fetch` turns a Kotodayori router into a `(request: Request) => Promise<Response>` handler. Any runtime or framework that hands you a standard `Request` can use it without a dedicated adapter:

- Cloudflare Workers (without Hono)
- Bun / Deno
- Next.js App Router route handlers
- React Router v7 / Remix actions
- Netlify Functions (`export default async (req: Request, context: Context) => ...` style)

Handlers that receive Node-style `(req, res)` objects (Express, Next.js Pages Router `pages/api`, Netlify's legacy `handler(event, context)` signature) are **not** supported — use `@kotodayori/express` or `@kotodayori/lambda` instead.

## Installation

```bash
pnpm add @kotodayori/fetch @kotodayori/core
# The Stripe example below also needs:
pnpm add @kotodayori/stripe stripe
```

## Quick Start

Build the handler from the secrets your runtime provides. Cloudflare Workers passes secrets to `fetch` as the `env` binding, so the handler is created per request there; elsewhere `process.env` works.

```typescript
import Stripe from 'stripe';
import { StripeWebhookRouter, createStripeVerifier } from '@kotodayori/stripe';
import { fetchAdapter } from '@kotodayori/fetch';

const router = new StripeWebhookRouter();

router.on('payment_intent.succeeded', async (event) => {
  console.log('Payment succeeded:', event.data.object.id);
});

export const createHandler = (apiKey: string, webhookSecret: string) =>
  fetchAdapter(router, {
    verifier: createStripeVerifier(new Stripe(apiKey), webhookSecret),
  });
```

### Cloudflare Workers

Secrets are read from the `env` binding (set with `wrangler secret put STRIPE_API_KEY` / `STRIPE_WEBHOOK_SECRET`), not from `process.env`:

```typescript
export default {
  fetch: (request: Request, env: { STRIPE_API_KEY: string; STRIPE_WEBHOOK_SECRET: string }) =>
    createHandler(env.STRIPE_API_KEY, env.STRIPE_WEBHOOK_SECRET)(request),
};
```

### Bun / Deno

```typescript
const handle = createHandler(process.env.STRIPE_API_KEY!, process.env.STRIPE_WEBHOOK_SECRET!);

export default { fetch: handle };
```

### Next.js App Router (`app/webhook/route.ts`)

```typescript
export const POST = createHandler(process.env.STRIPE_API_KEY!, process.env.STRIPE_WEBHOOK_SECRET!);
```

### React Router v7 / Remix

```typescript
export const action = ({ request }: { request: Request }) =>
  createHandler(process.env.STRIPE_API_KEY!, process.env.STRIPE_WEBHOOK_SECRET!)(request);
```

## API

```typescript
function fetchAdapter<TEvent extends WebhookEvent>(
  router: WebhookDispatcher<TEvent>,
  options: {
    verifier: Verifier<TEvent>;
    onError?: (error: Error, event: TEvent) => Promise<void> | void;
    logger?: Logger; // defaults to consoleLogger
  }
): (request: Request) => Promise<Response>
```

- **verifier** — Required. Verifies the request and returns the event (e.g. `createStripeVerifier`).
- **onError** — Optional. Called when a handler throws; errors thrown by `onError` itself are ignored and the response stays 500.
- **logger** — Optional. Receives adapter diagnostics, currently verification failures (`logger.error('Webhook verification failed:', err)`). Defaults to `consoleLogger`, which writes to `console`.

The raw body is read with `request.text()` and passed to the verifier untouched, so signature verification sees the exact bytes that were signed.

| Situation | Status | Body |
|-----------|--------|------|
| Non-POST method | 405 (`Allow: POST`) | `{ "error": "Method not allowed" }` |
| Empty or whitespace-only body | 400 | `{ "error": "Request body cannot be empty" }` |
| Verification failed | 400 | `{ "error": "Verification failed" }` |
| Handler threw | 500 | `{ "error": "Internal server error" }` |
| Success | 200 | `{ "received": true }` |

### Custom logger

Route verification failures to your own logger, or silence them:

```typescript
import { silentLogger } from '@kotodayori/core';

const handle = fetchAdapter(router, {
  verifier,
  logger: silentLogger, // or any object with `warn` and `error` methods
});
```

Unlike the Hono adapter, non-POST requests are rejected with 405 because the handler may be mounted directly (e.g. `export default { fetch: handle }`) with no router in front of it.

## License

MIT
