/**
 * Minimal fake Stripe events. Only the fields the demo handlers read are filled in;
 * real events from Stripe carry many more.
 */
const fixtures: Record<string, () => { object: string } & Record<string, unknown>> = {
  'payment_intent.succeeded': () => ({
    id: 'pi_demo_succeeded',
    object: 'payment_intent',
    amount: 1200,
    currency: 'jpy',
    status: 'succeeded',
  }),
  'payment_intent.payment_failed': () => ({
    id: 'pi_demo_failed',
    object: 'payment_intent',
    amount: 1200,
    currency: 'jpy',
    status: 'requires_payment_method',
    last_payment_error: { message: 'Your card was declined.' },
  }),
  'customer.subscription.created': () => ({
    id: 'sub_demo',
    object: 'subscription',
    status: 'active',
  }),
  'customer.subscription.deleted': () => ({
    id: 'sub_demo',
    object: 'subscription',
    status: 'canceled',
  }),
  'checkout.session.completed': () => ({
    id: 'cs_demo',
    object: 'checkout.session',
    amount_total: 3300,
    currency: 'jpy',
  }),
  // No handler is registered for this one: the router acknowledges it and does nothing
  'invoice.paid': () => ({
    id: 'in_demo',
    object: 'invoice',
    amount_paid: 3300,
  }),
};

export const eventTypes = Object.keys(fixtures);

/** Builds the JSON body Stripe would send for `type`. */
export function buildEventPayload(type: string): string {
  const fixture = fixtures[type];
  if (!fixture) {
    throw new Error(`Unknown demo event type: ${type}`);
  }
  return JSON.stringify(
    {
      id: `evt_demo_${Date.now()}`,
      object: 'event',
      api_version: '2026-09-30.endive',
      created: Math.floor(Date.now() / 1000),
      livemode: false,
      type,
      data: { object: fixture() },
    },
    null,
    2
  );
}
