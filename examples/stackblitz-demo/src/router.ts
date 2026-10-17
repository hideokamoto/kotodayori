import { StripeWebhookRouter } from '@kotodayori/stripe';

/** Lines written by the middleware and handlers, shown in the demo page. */
export const activity: string[] = [];

export function log(line: string) {
  activity.push(line);
  console.log(line);
}

export const router = new StripeWebhookRouter();

// Middleware runs around every handler
router.use(async (event, next) => {
  log(`→ [middleware] ${event.type} (${event.id})`);
  const start = Date.now();
  await next();
  log(`← [middleware] ${event.type} done in ${Date.now() - start}ms`);
});

// `event.data.object` is narrowed per event type: Stripe.PaymentIntent here
router.on('payment_intent.succeeded', async (event) => {
  const paymentIntent = event.data.object;
  log(`  ✅ payment_intent.succeeded: ${paymentIntent.id} ${paymentIntent.amount} ${paymentIntent.currency}`);
});

router.on('payment_intent.payment_failed', async (event) => {
  const paymentIntent = event.data.object;
  log(`  ❌ payment_intent.payment_failed: ${paymentIntent.id} (${paymentIntent.last_payment_error?.message ?? 'no message'})`);
});

// One handler for several event types: Stripe.Subscription here
router.on(['customer.subscription.created', 'customer.subscription.deleted'], async (event) => {
  const subscription = event.data.object;
  log(`  🔁 ${event.type}: ${subscription.id} status=${subscription.status}`);
});

// Stripe.Checkout.Session here
router.on('checkout.session.completed', async (event) => {
  const session = event.data.object;
  log(`  🛒 checkout.session.completed: ${session.id} total=${session.amount_total}`);
});

// Uncomment to see a type error: `amount` does not exist on Stripe.Customer
// router.on('customer.created', async (event) => {
//   console.log(event.data.object.amount);
// });
