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
```

## Quick Start

```typescript
import Stripe from 'stripe';
import { StripeWebhookRouter, createStripeVerifier } from '@kotodayori/stripe';
import { fetchAdapter } from '@kotodayori/fetch';

const stripe = new Stripe(process.env.STRIPE_API_KEY!);
const router = new StripeWebhookRouter();

router.on('payment_intent.succeeded', async (event) => {
  console.log('Payment succeeded:', event.data.object.id);
});

const handle = fetchAdapter(router, {
  verifier: createStripeVerifier(stripe, process.env.STRIPE_WEBHOOK_SECRET!),
});
```

### Cloudflare Workers / Bun / Deno

```typescript
export default { fetch: handle };
```

### Next.js App Router (`app/webhook/route.ts`)

```typescript
export const POST = handle;
```

### React Router v7 / Remix

```typescript
export const action = ({ request }: { request: Request }) => handle(request);
```

## API

```typescript
function fetchAdapter<TEvent extends WebhookEvent>(
  router: WebhookDispatcher<TEvent>,
  options: {
    verifier: Verifier<TEvent>;
    onError?: (error: Error, event: TEvent) => Promise<void> | void;
  }
): (request: Request) => Promise<Response>
```

The raw body is read with `request.text()` and passed to the verifier untouched, so signature verification sees the exact bytes that were signed.

| Situation | Status | Body |
|-----------|--------|------|
| Non-POST method | 405 (`Allow: POST`) | `{ "error": "Method not allowed" }` |
| Empty or whitespace-only body | 400 | `{ "error": "Request body cannot be empty" }` |
| Verification failed | 400 | `{ "error": "Verification failed" }` |
| Handler threw | 500 | `{ "error": "Internal server error" }` |
| Success | 200 | `{ "received": true }` |

Unlike the Hono adapter, non-POST requests are rejected with 405 because the handler may be mounted directly (e.g. `export default { fetch: handle }`) with no router in front of it.

## License

MIT
