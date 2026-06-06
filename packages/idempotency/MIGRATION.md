# Migration: add `@kotodayori/idempotency` to an existing app

> 🚧 **Preview / forward-looking.** The `idempotency`, `InMemoryStore`, and `DynamoDBStore` exports are the **intended v1.0 design** and are **not yet implemented**. The snippets below are illustrative.

Adding idempotency to an existing Kotodayori router is roughly **3 lines**: install, create a store, register one middleware. No handler changes are required.

## 1. Install

```bash
pnpm add @kotodayori/idempotency
# For the DynamoDB store (production / multi-instance):
pnpm add @aws-sdk/client-dynamodb
```

## 2. Add the middleware (before your handlers)

```diff
  import { StripeWebhookRouter } from '@kotodayori/stripe';
+ import { idempotency, DynamoDBStore } from '@kotodayori/idempotency';
+ import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

  const router = new StripeWebhookRouter();

+ router.use(idempotency({
+   store: new DynamoDBStore({ client: new DynamoDBClient({}), tableName: 'webhook-idempotency' }),
+ }));

  router.on('payment_intent.succeeded', async (event) => { /* unchanged */ });
```

For local development, swap `DynamoDBStore` for `InMemoryStore` (no external dependencies):

```typescript
import { idempotency, InMemoryStore } from '@kotodayori/idempotency';

router.use(idempotency({ store: new InMemoryStore() }));
```

## Notes

- Register the middleware **before** `router.on(...)` so it guards every event.
- The middleware keys on the event's unique ID (`event.id` for Stripe); duplicates are skipped automatically.
- See the package [README](./README.md) for store selection guidance and TTL configuration.
