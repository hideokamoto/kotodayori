---
title: "@kotodayori/core"
description: Framework-agnostic webhook routing engine
---

[![npm version](https://img.shields.io/npm/v/%40kotodayori%2Fcore.svg?logo=npm&label=npm)](https://www.npmjs.com/package/@kotodayori/core)
[![npm downloads](https://img.shields.io/npm/dm/%40kotodayori%2Fcore.svg)](https://www.npmjs.com/package/@kotodayori/core)
[![license](https://img.shields.io/npm/l/%40kotodayori%2Fcore.svg)](https://www.npmjs.com/package/@kotodayori/core)

The core package provides the webhook routing engine with no framework dependencies. All adapters (Hono, Express, Lambda, EventBridge) build on top of it.

## Installation

```bash
pnpm add @kotodayori/core
```

## Main exports

| Export | Description |
|--------|-------------|
| `WebhookRouter<TEventMap>` | Base router class with generic event type support |
| `WebhookEvent` | Base event interface |
| `Verifier` | Type for signature verification functions |
| `HandlerFunction<TEvent>` | Type for event handler functions |
| `MiddlewareFunction` | Type for middleware functions |

## Key methods

```typescript
class WebhookRouter<TEventMap extends Record<string, WebhookEvent>> {
  on(event: string | string[], handler: HandlerFunction): this
  use(middleware: MiddlewareFunction): this
  group(prefix: string, callback: (router: this) => void): this
  route(prefix: string, router: WebhookRouter): this
  fanout(event: string, handlers: HandlerFunction[], options?: FanoutOptions): this
  dispatch(event: WebhookEvent): Promise<void>
}
```

## Event type map

When using the core router with custom events, define a type map that maps event type strings to your event interfaces:

```typescript
import { WebhookRouter, type WebhookEvent } from '@kotodayori/core';

interface MyEvent extends WebhookEvent {
  type: 'my.event';
  data: { object: { id: string } };
}

type MyEventMap = {
  'my.event': MyEvent;
};

const router = new WebhookRouter<MyEventMap>();
router.on('my.event', async (event) => {
  // event is typed as MyEvent
  console.log(event.data.object.id);
});
```

## Fanout strategies

When using `fanout()` to run multiple handlers in parallel:

- **`all-or-nothing`** (default) — All handlers must succeed; uses `Promise.all`
- **`best-effort`** — Continues even if some handlers fail; uses `Promise.allSettled`

## Middleware

Middleware runs in registration order. The chain builds in reverse for proper nesting, and you control flow with `next()`:

```typescript
router.use(async (event, next) => {
  console.log(`Processing ${event.type}`);
  await next();
  console.log(`Done ${event.type}`);
});
```

See [Middleware](/guides/middleware/) for more patterns.

## Migrating custom verifiers to `Uint8Array` (breaking in the next major release)

`Verifier` now takes `payload: string | Uint8Array` instead of `string | Buffer`, so the published types no longer need `@types/node` (Cloudflare Workers, Deno). Node.js `Buffer` is a `Uint8Array` subclass, so Express and Lambda behave the same at runtime. Two things in your own verifiers may need changes:

1. **Type annotations.** `(payload: string | Buffer, headers) => ...` is no longer assignable to `Verifier`, because function parameters are contravariant. Drop the annotation and let `Verifier` infer it, or write `string | Uint8Array`.
2. **`payload.toString()` / `payload.toString('utf8')`.** On a plain `Uint8Array`, `toString()` returns comma-separated numbers such as `"123,34,105,100"`, not the text, and `toString('utf8')` does not compile. Decode explicitly instead:

```typescript
// Before
const body = JSON.parse(payload.toString());

// After: works for string, Uint8Array and Buffer, on every runtime
const text = typeof payload === 'string' ? payload : new TextDecoder().decode(payload);
const body = JSON.parse(text);
```

Verify the signature over the raw `payload` (Web Crypto and `node:crypto` HMAC both accept `Uint8Array`), not over the decoded and re-serialized text. `createStripeVerifier` needs no change.
