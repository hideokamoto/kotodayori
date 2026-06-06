# idempotency-lambda

AWS Lambda + Stripe webhook handler showing how to wire [`@kotodayori/idempotency`](../../packages/idempotency) into a Kotodayori router using a durable, shared store.

> 🚧 **Preview.** `@kotodayori/idempotency` is currently a scaffold. The idempotency middleware + `DynamoDBStore` usage in `src/index.ts` is shown as a **forward-looking / commented** example (intended v1.0 API) and is not yet implemented. The rest of the handler (Lambda + Stripe verification + routing) runs as-is.

## What it shows

- Why Lambda especially needs idempotency: invocations scale horizontally and retry, so a **shared, durable** store (DynamoDB) is the right choice.
- Registering the idempotency middleware via `router.use(...)` **before** your handlers (see the preview block in `src/index.ts`).
- `DynamoDBStore` configuration including an optional TTL for auto-expiring processed records.

## Build

```bash
# From the repo root
pnpm install
pnpm build

cd examples/idempotency-lambda
pnpm build   # outputs dist/index.js — deploy as your Lambda handler (handler = "index.handler")
```

Set `STRIPE_API_KEY`, `STRIPE_WEBHOOK_SECRET`, and (for the preview store) `IDEMPOTENCY_TABLE_NAME` in the Lambda environment. The DynamoDB table needs a String partition key; enable TTL on the store's expiry attribute if you use `ttlSeconds`.

## Files

- `src/index.ts` — Lambda handler wiring + preview idempotency middleware (DynamoDBStore).
- `src/handlers/payment.ts` — example side-effecting handlers.
