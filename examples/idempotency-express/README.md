# idempotency-express

Express + Stripe webhook handler showing how to wire [`@kotodayori/idempotency`](../../packages/idempotency) into a Kotodayori router.

> 🚧 **Preview.** `@kotodayori/idempotency` is currently a scaffold. The idempotency middleware usage in `src/index.ts` is shown as a **forward-looking / commented** example (intended v1.0 API) and is not yet implemented. The rest of the app (Express + Stripe verification + routing) runs as-is.

## What it shows

- Registering the idempotency middleware via `router.use(...)` **before** your handlers (see the preview block in `src/index.ts`).
- Using `InMemoryStore` for local development and `DynamoDBStore` for production.
- Standard Express + Stripe raw-body signature verification.

## Run

```bash
# From the repo root
pnpm install
pnpm build

cd examples/idempotency-express
cp .env.example .env   # fill in your Stripe keys
pnpm dev
```

Forward Stripe events locally:

```bash
stripe listen --forward-to localhost:3000/webhook
```

## Files

- `src/index.ts` — app wiring + preview idempotency middleware.
- `src/handlers/payment.ts` — example side-effecting handlers.
