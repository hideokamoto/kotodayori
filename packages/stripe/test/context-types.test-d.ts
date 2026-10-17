import { describe, it, expectTypeOf } from 'vitest';
import type Stripe from 'stripe';
import { StripeWebhookRouter, type WebhookDispatcher } from '../src/index.js';

interface AppContext {
  env: { DB: { prepare(sql: string): unknown } };
}

describe('StripeWebhookRouter context', () => {
  it('types the handler context from the router type parameter', () => {
    const router = new StripeWebhookRouter<AppContext>();
    router.on('checkout.session.completed', async (event, context) => {
      expectTypeOf(event.data.object).toEqualTypeOf<Stripe.Checkout.Session>();
      expectTypeOf(context).toEqualTypeOf<AppContext>();
    });
  });

  it('defaults the context to unknown and keeps one-argument dispatch', () => {
    const router = new StripeWebhookRouter();
    router.on('checkout.session.completed', async (_event, context) => {
      expectTypeOf(context).toEqualTypeOf<unknown>();
    });
    const dispatcher: WebhookDispatcher<Stripe.Event> = router;
    void dispatcher;
  });

  it('is usable as a context-typed dispatcher', () => {
    const router = new StripeWebhookRouter<AppContext>();
    const dispatcher: WebhookDispatcher<Stripe.Event, AppContext> = router;
    void dispatcher;
  });
});
