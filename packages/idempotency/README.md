**English** | [日本語](./README.ja.md)

# @kotodayori/idempotency

Idempotency middleware and pluggable stores for [Kotodayori](https://github.com/hideokamoto/kotodayori) webhook routing, so duplicate webhook deliveries can be detected and handled safely.

> 🚧 **Preview / forward-looking docs.** The package is currently a structural scaffold. The API described below is the **intended v1.0 design** and is **not yet implemented** — code snippets are illustrative and will not run as-is until the implementation lands in follow-up issues. Anything that references an unimplemented API is marked as *preview*.

## Why you need it

Webhook providers like Stripe **do not guarantee exactly-once delivery**. The same event (same `event.id`) can be delivered more than once because of:

- Network timeouts and retries (Stripe retries until it receives a `2xx`).
- Provider-side at-least-once delivery semantics.
- Load balancers or proxies replaying a request.

If your handler has side effects — charging a customer, provisioning access, sending an email, writing a ledger row — processing the same event twice causes **double-processing** (duplicate emails, double fulfillment, corrupted balances).

`@kotodayori/idempotency` records which events have already been processed and short-circuits duplicates, so each event runs your handlers **at most once**.

## When to use it

Use idempotency when **any** of the following is true:

- Your handlers perform **non-idempotent side effects** (payments, fulfillment, emails, external API calls).
- You run **multiple instances** of your webhook endpoint (horizontal scaling) and need a shared, durable record of processed events.
- You want defense-in-depth even though your business logic is "mostly" idempotent.

## When you DON'T need it

You can skip it when:

- Your handlers are **naturally idempotent** (e.g. a pure `UPSERT` keyed by a stable ID, or simply updating a cache to the latest state).
- You only **log** events with no downstream side effects.
- Your datastore already enforces uniqueness on the event ID at the point of write (in that case idempotency here is optional belt-and-suspenders).

## Installation

```bash
npm install @kotodayori/idempotency
# or
pnpm add @kotodayori/idempotency
# or
yarn add @kotodayori/idempotency
```

For production (multi-instance) deployments you'll also want the DynamoDB store's peer dependency:

```bash
pnpm add @aws-sdk/client-dynamodb
```

## Quick start

> ⚠️ **Preview:** `idempotency` and the store exports below are forward-looking and not yet implemented.

The package integrates as a standard Kotodayori middleware via `router.use(...)`. Register it **before** your handlers so it can wrap every dispatched event:

```typescript
// 🚧 PREVIEW — intended v1.0 API, not yet implemented.
import { StripeWebhookRouter, createStripeVerifier } from '@kotodayori/stripe';
import { expressAdapter } from '@kotodayori/express';
import { idempotency, InMemoryStore } from '@kotodayori/idempotency';

const router = new StripeWebhookRouter();

// Register idempotency middleware FIRST so it guards every handler.
router.use(idempotency({ store: new InMemoryStore() }));

// Your handlers run at most once per event.id.
router.on('payment_intent.succeeded', async (event) => {
  await fulfillOrder(event.data.object);
});
```

The middleware:

1. Reads the event's unique key (`event.id` for Stripe).
2. Looks it up in the store.
3. If already processed, **skips** the downstream handlers (and `next()`).
4. Otherwise runs the handlers, then records the key in the store.

## Choosing a store

The middleware is store-agnostic. Two stores ship in the box, and you can implement your own against the `IdempotencyStore` interface.

| Store | Best for | Durability | Shared across instances |
| --- | --- | --- | --- |
| `InMemoryStore` | Local dev, tests, single-process apps | Lost on restart | ❌ No |
| `DynamoDBStore` | Production, serverless, multi-instance | Durable | ✅ Yes |

### InMemoryStore

Zero-config, no external dependencies. Good for development and tests. **Not** suitable for production with more than one instance, because the processed-event set is not shared and is lost on restart.

```typescript
// 🚧 PREVIEW
import { idempotency, InMemoryStore } from '@kotodayori/idempotency';

router.use(idempotency({ store: new InMemoryStore() }));
```

### DynamoDBStore

Durable and shared across instances — the recommended choice for production and serverless (AWS Lambda). It stores one item per processed event and can use a DynamoDB TTL attribute to expire old records automatically.

```typescript
// 🚧 PREVIEW
import { idempotency, DynamoDBStore } from '@kotodayori/idempotency';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

const store = new DynamoDBStore({
  client: new DynamoDBClient({}),
  tableName: 'webhook-idempotency',
  // Optional: auto-expire processed records after N seconds.
  ttlSeconds: 60 * 60 * 24 * 7, // 7 days
});

router.use(idempotency({ store }));
```

The DynamoDB table needs a partition key (e.g. `pk` of type String). If you enable `ttlSeconds`, configure the table's TTL on the attribute the store writes (e.g. `expiresAt`).

## Migration: add idempotency to an existing router

> 🚧 **Preview** — the API below is forward-looking. See also [`MIGRATION.md`](./MIGRATION.md).

If you already have a working Kotodayori router, you only need to add an import, create a store, and register one middleware:

```diff
  import { StripeWebhookRouter, createStripeVerifier } from '@kotodayori/stripe';
  import { expressAdapter } from '@kotodayori/express';
+ import { idempotency, DynamoDBStore } from '@kotodayori/idempotency';
+ import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

  const router = new StripeWebhookRouter();

+ // Register BEFORE your handlers so it guards every event.
+ router.use(idempotency({
+   store: new DynamoDBStore({ client: new DynamoDBClient({}), tableName: 'webhook-idempotency' }),
+ }));

  router.on('payment_intent.succeeded', async (event) => { /* ... */ });
```

That's it — no handler changes required. Use `InMemoryStore` instead of `DynamoDBStore` for local development.

## Examples

Runnable preview examples live under [`examples/`](../../examples):

- [`examples/idempotency-express`](../../examples/idempotency-express) — Express + idempotency middleware.
- [`examples/idempotency-lambda`](../../examples/idempotency-lambda) — AWS Lambda + `DynamoDBStore`.
- [`examples/idempotency-hono`](../../examples/idempotency-hono) — Hono + idempotency middleware.

## Status

| Capability | Status |
| --- | --- |
| `idempotency()` middleware | 🚧 Planned (v1.0) |
| `IdempotencyStore` interface | 🚧 Planned (v1.0) |
| `InMemoryStore` | 🚧 Planned (v1.0) |
| `DynamoDBStore` | 🚧 Planned (v1.0) |

## License

MIT
