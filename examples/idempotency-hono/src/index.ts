import { Hono } from 'hono';
import Stripe from 'stripe';
import {
  StripeWebhookRouter,
  createStripeVerifier,
} from '@kotodayori/stripe';
import { honoAdapter } from '@kotodayori/hono';
// NOTE: @kotodayori/idempotency is currently a scaffold. Only `PACKAGE_NAME`
// is exported today; the `idempotency()` middleware and stores shown in the
// commented block below are FORWARD-LOOKING / PREVIEW (intended v1.0 API) and
// are not yet implemented. We import the placeholder so this example stays
// wired to the real package and typechecks against the current build.
import { PACKAGE_NAME } from '@kotodayori/idempotency';
import { paymentHandlers } from './handlers/payment.js';

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
// For production / edge deployments use a durable, shared store (e.g. the
// DynamoDB-backed store) instead of the in-memory one.
// ---------------------------------------------------------------------------
console.log(`[example] idempotency package: ${PACKAGE_NAME} (preview)`);

paymentHandlers(webhookRouter);

webhookRouter.use(async (event, next) => {
  console.log(`[${event.type}] Processing event ${event.id}`);
  await next();
});

const app = new Hono();

app.get('/', (c) => {
  return c.json({ message: 'Kotodayori Idempotency Example (Hono)', status: 'running' });
});

app.post(
  '/webhook',
  honoAdapter(webhookRouter, {
    verifier: createStripeVerifier(stripe, webhookSecret),
    onError: async (error, event) => {
      console.error(`Failed to process ${event?.type}:`, error);
    },
  })
);

export default app;
