import type { StripeWebhookRouter } from '@kotodayori/stripe';

export function subscriptionHandlers(router: StripeWebhookRouter) {
  // Group subscription events together
  router.group('customer.subscription', (r) => {
    // New subscription created
    r.on('created', async (event) => {
      const subscription = event.data.object;
      console.log(`🎉 New subscription: ${subscription.id}`);
      console.log(`   Customer: ${subscription.customer}`);
      console.log(`   Status: ${subscription.status}`);

      // TODO: Add your business logic here
      // - Send welcome email
      // - Grant access to premium features
      // - Update customer record in database
      // - Track analytics
    });

    // Subscription updated
    r.on('updated', async (event) => {
      const subscription = event.data.object;
      const previousAttributes = event.data.previous_attributes;

      console.log(`📝 Subscription updated: ${subscription.id}`);
      console.log(`   Changes:`, previousAttributes);

      // TODO: Handle subscription update
      // - Check if plan changed
      // - Update access permissions
      // - Notify customer if needed
    });

    // Subscription deleted/canceled
    r.on('deleted', async (event) => {
      const subscription = event.data.object;
      console.log(`🔚 Subscription ended: ${subscription.id}`);

      // TODO: Handle subscription cancellation
      // - Revoke access to premium features
      // - Send cancellation confirmation
      // - Update database
      // - Trigger offboarding flow
    });
  });

  // Handle trial ending
  router.on('customer.subscription.trial_will_end', async (event) => {
    const subscription = event.data.object;
    console.log(`⏰ Trial ending soon: ${subscription.id}`);

    if (subscription.trial_end) {
      console.log(`   Trial ends: ${new Date(subscription.trial_end * 1000)}`);
    }

    // TODO: Remind customer about trial ending
    // - Send reminder email
    // - Offer upgrade incentives
  });

  // Handle invoice payments
  router.on('invoice.paid', async (event) => {
    const invoice = event.data.object;
    console.log(`✅ Invoice paid: ${invoice.id}`);

    // TODO: Process successful invoice payment
    // - Send receipt
    // - Extend subscription period
  });

  router.on('invoice.payment_failed', async (event) => {
    const invoice = event.data.object;
    console.log(`❌ Invoice payment failed: ${invoice.id}`);

    // TODO: Handle failed invoice payment
    // - Notify customer
    // - Update subscription status
    // - Trigger retry logic
  });
}
