import { Hono } from 'hono';
import Stripe from 'stripe';
import {
  StripeWebhookRouter,
  createStripeVerifier,
} from '@kotodayori/stripe';
import { honoAdapter } from '@kotodayori/hono';
import { paymentHandlers } from './handlers/payment.js';
import { subscriptionHandlers } from './handlers/subscription.js';

// Validate required environment variables
if (!process.env.STRIPE_API_KEY) {
  throw new Error('STRIPE_API_KEY environment variable is required');
}
if (!process.env.STRIPE_WEBHOOK_SECRET) {
  throw new Error('STRIPE_WEBHOOK_SECRET environment variable is required');
}

// Initialize Stripe
// apiVersion is left to the SDK default so this file stays in sync with the
// installed stripe package. Pin it explicitly if you need a specific version.
const stripe = new Stripe(process.env.STRIPE_API_KEY);

// --- Cloudflare Workers / Edge runtimes ---
// On Workers there is no `process.env`; read secrets from the `env` bindings
// inside the request handler instead, and use the fetch-based HTTP client:
//
//   const stripe = new Stripe(c.env.STRIPE_API_KEY, {
//     httpClient: Stripe.createFetchHttpClient(),
//   });
//
// `createStripeVerifier` already uses `constructEventAsync()` internally, so
// signature verification works on Workers without any extra configuration.

// Create webhook router
const webhookRouter = new StripeWebhookRouter();

// Register handlers
paymentHandlers(webhookRouter);
subscriptionHandlers(webhookRouter);

// Add logging middleware
webhookRouter.use(async (event, next) => {
  console.log(`[${event.type}] Processing event ${event.id}`);
  const start = Date.now();

  await next();

  const duration = Date.now() - start;
  console.log(`[${event.type}] Completed in ${duration}ms`);
});

// Create Hono app
const app = new Hono();

app.get('/', (c) => {
  return c.json({
    message: 'Kotodayori Webhook Handler',
    status: 'running',
  });
});

app.post(
  '/webhook',
  honoAdapter(webhookRouter, {
    verifier: createStripeVerifier(stripe, process.env.STRIPE_WEBHOOK_SECRET),
    onError: async (error, event) => {
      console.error(`Failed to process ${event?.type}:`, error);
    },
  })
);

export default app;
