import Stripe from 'stripe';
import {
  StripeWebhookRouter,
  createStripeVerifier,
} from '@kotodayori/stripe';
import { fetchAdapter } from '@kotodayori/fetch';
import { paymentHandlers } from './handlers/payment.js';
import { subscriptionHandlers } from './handlers/subscription.js';

// Configure secrets with `wrangler secret put STRIPE_API_KEY` /
// `wrangler secret put STRIPE_WEBHOOK_SECRET` for production,
// and `.dev.vars` for `wrangler dev` (see .dev.vars.example).
export interface Env {
  STRIPE_API_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
}

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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'POST' && url.pathname === '/webhook') {
      // Secrets arrive via the env binding, so the Stripe client and the
      // adapter are built per request. createFetchHttpClient() makes the
      // Stripe SDK use fetch instead of Node's http.
      const stripe = new Stripe(env.STRIPE_API_KEY, {
        httpClient: Stripe.createFetchHttpClient(),
      });

      return fetchAdapter(webhookRouter, {
        verifier: createStripeVerifier(stripe, env.STRIPE_WEBHOOK_SECRET),
        onError: async (error, event) => {
          console.error(`Failed to process ${event?.type}:`, error);
        },
      })(request);
    }

    return Response.json({
      message: 'Kotodayori Webhook Handler',
      status: 'running',
    });
  },
} satisfies ExportedHandler<Env>;
