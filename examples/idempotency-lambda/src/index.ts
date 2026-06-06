import Stripe from 'stripe';
import {
  StripeWebhookRouter,
  createStripeVerifier,
} from '@kotodayori/stripe';
import { lambdaAdapter } from '@kotodayori/lambda';
// NOTE: @kotodayori/idempotency is currently a scaffold. Only `PACKAGE_NAME`
// is exported today; the `idempotency()` middleware and `DynamoDBStore` shown
// in the commented block below are FORWARD-LOOKING / PREVIEW (intended v1.0
// API) and are not yet implemented. We import the placeholder so this example
// stays wired to the real package and typechecks against the current build.
import { PACKAGE_NAME } from '@kotodayori/idempotency';
import { paymentHandlers } from './handlers/payment.js';

if (!process.env.STRIPE_API_KEY) {
  throw new Error('STRIPE_API_KEY environment variable is required');
}
if (!process.env.STRIPE_WEBHOOK_SECRET) {
  throw new Error('STRIPE_WEBHOOK_SECRET environment variable is required');
}

const stripe = new Stripe(process.env.STRIPE_API_KEY, {
  apiVersion: '2026-05-27.dahlia',
});

const webhookRouter = new StripeWebhookRouter();

// ---------------------------------------------------------------------------
// 🚧 PREVIEW (forward-looking, NOT yet implemented in @kotodayori/idempotency)
//
// On Lambda you almost always want a DURABLE, SHARED store because invocations
// scale horizontally and retry. Once the package is implemented, register the
// DynamoDB-backed store BEFORE your handlers:
//
//   import { idempotency, DynamoDBStore } from '@kotodayori/idempotency';
//   import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
//
//   webhookRouter.use(idempotency({
//     store: new DynamoDBStore({
//       client: new DynamoDBClient({}),
//       tableName: process.env.IDEMPOTENCY_TABLE_NAME ?? 'webhook-idempotency',
//       ttlSeconds: 60 * 60 * 24 * 7, // expire processed records after 7 days
//     }),
//   }));
// ---------------------------------------------------------------------------
console.log(`[example] idempotency package: ${PACKAGE_NAME} (preview)`);

paymentHandlers(webhookRouter);

export const handler = lambdaAdapter(webhookRouter, {
  verifier: createStripeVerifier(stripe, process.env.STRIPE_WEBHOOK_SECRET),
  onError: async (error, event) => {
    console.error(`Failed to process ${event?.type}:`, error);
  },
});
