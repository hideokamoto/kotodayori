import express from 'express';
import Stripe from 'stripe';
import {
  StripeWebhookRouter,
  createStripeVerifier,
} from '@kotodayori/stripe';
import { expressAdapter } from '@kotodayori/express';
// NOTE: @kotodayori/idempotency is currently a scaffold. Only `PACKAGE_NAME`
// is exported today; the `idempotency()` middleware and stores shown in the
// commented block below are FORWARD-LOOKING / PREVIEW (intended v1.0 API) and
// are not yet implemented. We import the placeholder so this example stays
// wired to the real package and typechecks against the current build.
import { PACKAGE_NAME } from '@kotodayori/idempotency';
import { paymentHandlers } from './handlers/payment.js';

// Validate required environment variables
const apiKey = process.env.STRIPE_API_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

if (!apiKey) {
  throw new Error('STRIPE_API_KEY environment variable is required');
}
if (!webhookSecret) {
  throw new Error('STRIPE_WEBHOOK_SECRET environment variable is required');
}

const stripe = new Stripe(apiKey, {
  apiVersion: '2026-05-27.dahlia',
});

const webhookRouter = new StripeWebhookRouter();

// ---------------------------------------------------------------------------
// 🚧 PREVIEW (forward-looking, NOT yet implemented in @kotodayori/idempotency)
//
// Once the package is implemented, add idempotency in ~3 lines by registering
// the middleware BEFORE your handlers so duplicate Stripe deliveries are
// skipped automatically:
//
//   import { idempotency, InMemoryStore } from '@kotodayori/idempotency';
//   webhookRouter.use(idempotency({ store: new InMemoryStore() }));
//
// For production use the DynamoDB-backed store instead:
//
//   import { idempotency, DynamoDBStore } from '@kotodayori/idempotency';
//   import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
//   webhookRouter.use(idempotency({
//     store: new DynamoDBStore({
//       client: new DynamoDBClient({}),
//       tableName: 'webhook-idempotency',
//     }),
//   }));
// ---------------------------------------------------------------------------
console.log(`[example] idempotency package: ${PACKAGE_NAME} (preview)`);

// Register handlers
paymentHandlers(webhookRouter);

// Logging middleware (idempotency middleware, once implemented, would be
// registered before this so duplicates never reach the log/handlers).
webhookRouter.use(async (event, next) => {
  console.log(`[${event.type}] Processing event ${event.id}`);
  await next();
});

const app = express();

app.get('/', (_req, res) => {
  res.json({ message: 'Kotodayori Idempotency Example (Express)', status: 'running' });
});

// IMPORTANT: Use express.raw() to preserve the raw body for Stripe signature
// verification.
app.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  expressAdapter(webhookRouter, {
    verifier: createStripeVerifier(stripe, webhookSecret),
    onError: async (error, event) => {
      console.error(`Failed to process ${event?.type}:`, error);
    },
  })
);

const port = process.env.PORT ?? 3000;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

export default app;
