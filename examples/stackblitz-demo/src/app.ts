import { Hono } from 'hono';
import Stripe from 'stripe';
import { createStripeVerifier } from '@kotodayori/stripe';
import { honoAdapter } from '@kotodayori/hono';
import { activity, router } from './router.js';
import { buildEventPayload, eventTypes } from './events.js';
import { renderPage } from './page.js';

// Demo-only values. The verifier never calls the Stripe API, so no real key is needed.
// In production, read both from environment variables.
const WEBHOOK_SECRET = 'whsec_kotodayori_demo';
const stripe = new Stripe('sk_test_kotodayori_demo_not_a_real_key');

export type SendMode = 'valid' | 'tampered' | 'unsigned';
const sendModes: SendMode[] = ['valid', 'tampered', 'unsigned'];

export const app = new Hono();

// The real webhook endpoint: verify the raw body, then dispatch to the router
app.post(
  '/webhook',
  honoAdapter(router, {
    verifier: createStripeVerifier(stripe, WEBHOOK_SECRET),
    onError: async (error, event) => {
      console.error(`Failed to process ${event?.type}:`, error);
    },
  })
);

app.get('/', (c) => c.html(renderPage(eventTypes, sendModes)));

/**
 * Plays the role of Stripe: builds a fake event, signs it with the webhook secret,
 * and POSTs it to /webhook in-process.
 */
app.post('/demo/send', async (c) => {
  const { type, mode } = await c.req.json<{ type: string; mode: SendMode }>();
  if (!eventTypes.includes(type) || !sendModes.includes(mode)) {
    return c.json({ error: 'Unknown event type or mode' }, 400);
  }

  const payload = buildEventPayload(type);
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: WEBHOOK_SECRET });

  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (mode !== 'unsigned') {
    headers['stripe-signature'] = signature;
  }
  // 'tampered' changes the body after signing, as an attacker would
  const body = mode === 'tampered' ? payload.replace(/"livemode": false/, '"livemode": true') : payload;

  const activityStart = activity.length;
  const res = await app.request('/webhook', { method: 'POST', headers, body });

  return c.json({
    request: { headers, body },
    response: { status: res.status, body: await res.json() },
    activity: activity.slice(activityStart),
  });
});
