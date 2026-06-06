import type { StripeWebhookRouter } from '@kotodayori/stripe';

export function paymentHandlers(router: StripeWebhookRouter) {
  // With idempotency middleware registered, this side-effecting handler
  // runs at most once per event.id even if Stripe redelivers the event.
  // This is especially important for Lambda, where retries and concurrent
  // invocations across instances are common.
  router.on('payment_intent.succeeded', async (event) => {
    const paymentIntent = event.data.object;
    console.log(`✅ Payment succeeded: ${paymentIntent.id}`);

    // TODO: Non-idempotent side effects go here (fulfill order, send email,
    // write a ledger row). These are exactly what idempotency protects.
  });

  router.on('payment_intent.payment_failed', async (event) => {
    const paymentIntent = event.data.object;
    console.log(`❌ Payment failed: ${paymentIntent.id}`);
  });
}
