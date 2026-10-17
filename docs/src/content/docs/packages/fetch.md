---
title: "@kotodayori/fetch"
description: Web-standard fetch (Request/Response) adapter for Kotodayori
---

[![npm version](https://img.shields.io/npm/v/%40kotodayori%2Ffetch.svg?logo=npm&label=npm)](https://www.npmjs.com/package/@kotodayori/fetch)
[![license](https://img.shields.io/npm/l/%40kotodayori%2Ffetch.svg)](https://www.npmjs.com/package/@kotodayori/fetch)

The fetch adapter turns a Kotodayori router into a `(request: Request) => Promise<Response>` handler. Any runtime or framework that passes a Web-standard `Request` can use it: Cloudflare Workers without Hono, Bun, Deno, Next.js App Router, React Router v7 / Remix, and Netlify Functions written as `export default async (req: Request, context: Context) => ...`.

Node-style `(req, res)` handlers (Express, Next.js Pages Router `pages/api`) are not supported.

## Installation

```bash
pnpm add @kotodayori/fetch
# The Stripe example below also needs:
pnpm add @kotodayori/stripe stripe
```

## Usage

Create the handler from the secrets your runtime provides. Cloudflare Workers passes secrets to `fetch` as the `env` binding, so the handler is created per request there; elsewhere `process.env` works.

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

Secrets come from the `env` binding (set with `wrangler secret put`), not from `process.env`:

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

### Next.js App Router

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
- **logger** — Optional. Receives adapter diagnostics, currently verification failures. Defaults to `consoleLogger`, which writes to `console`. Pass `silentLogger` from `@kotodayori/core` or any object with `warn` and `error`.

The adapter reads the raw body with `request.text()` (required for signature verification) and returns a JSON `Response`: 200 on success, 400 for an empty body or failed verification, 500 for handler errors, and 405 (`Allow: POST`) for non-POST methods.
