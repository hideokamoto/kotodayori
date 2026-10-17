import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Stripe from 'stripe';
import { createStripeVerifier, StripeWebhookRouter } from '@kotodayori/stripe';
import { fetchAdapter } from '../src/index.js';

/**
 * End-to-end check with real Stripe signatures: the raw body read from a
 * Web-standard Request must verify through Stripe's constructEventAsync.
 */

const WEBHOOK_SECRET = 'whsec_test_secret';
const stripe = new Stripe('sk_test_dummy');

const payload = JSON.stringify({
  id: 'evt_fetch_123',
  object: 'event',
  type: 'payment_intent.succeeded',
  data: { object: { id: 'pi_123', object: 'payment_intent', amount: 1000 } },
});

async function signedRequest(body: string, secret = WEBHOOK_SECRET): Promise<Request> {
  const signature = await stripe.webhooks.generateTestHeaderStringAsync({ payload: body, secret });
  return new Request('https://example.com/webhook', {
    method: 'POST',
    body,
    headers: { 'Content-Type': 'application/json', 'Stripe-Signature': signature },
  });
}

describe('fetchAdapter + createStripeVerifier', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('verifies a genuinely signed request and dispatches the typed event', async () => {
    const router = new StripeWebhookRouter();
    const handler = vi.fn(async (event: Stripe.PaymentIntentSucceededEvent) => {
      void event;
    });
    router.on('payment_intent.succeeded', handler);
    const handle = fetchAdapter(router, { verifier: createStripeVerifier(stripe, WEBHOOK_SECRET) });

    const res = await handle(await signedRequest(payload));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: true });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0]?.[0].data.object.id).toBe('pi_123');
  });

  it('rejects a request signed with a different secret', async () => {
    const handle = fetchAdapter(new StripeWebhookRouter(), {
      verifier: createStripeVerifier(stripe, WEBHOOK_SECRET),
    });

    const res = await handle(await signedRequest(payload, 'whsec_other_secret'));

    expect(res.status).toBe(400);
  });

  it('rejects a body altered after signing', async () => {
    const handle = fetchAdapter(new StripeWebhookRouter(), {
      verifier: createStripeVerifier(stripe, WEBHOOK_SECRET),
    });
    const signed = await signedRequest(payload);
    const tampered = new Request(signed.url, {
      method: 'POST',
      headers: signed.headers,
      body: payload.replace('1000', '9999'),
    });

    const res = await handle(tampered);

    expect(res.status).toBe(400);
  });

  it('rejects a request without a stripe-signature header', async () => {
    const handle = fetchAdapter(new StripeWebhookRouter(), {
      verifier: createStripeVerifier(stripe, WEBHOOK_SECRET),
    });

    const res = await handle(new Request('https://example.com/webhook', { method: 'POST', body: payload }));

    expect(res.status).toBe(400);
  });
});
