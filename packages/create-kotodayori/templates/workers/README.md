# {{PROJECT_NAME}}

A Stripe webhook handler built with [Kotodayori](https://github.com/hideokamoto/stripe-webhook-router) running on [Cloudflare Workers](https://workers.cloudflare.com).

## Getting Started

### 1. Install Dependencies

```bash
{{PACKAGE_MANAGER}} install
```

### 2. Configure Secrets Locally

Copy the example file and fill in your Stripe credentials:

```bash
cp .dev.vars.example .dev.vars
```

Then edit `.dev.vars` and add your Stripe API keys:

- `STRIPE_API_KEY`: Get from [Stripe Dashboard → API Keys](https://dashboard.stripe.com/apikeys)
- `STRIPE_WEBHOOK_SECRET`: Get from [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)

### 3. Run the Development Server

```bash
{{PACKAGE_MANAGER}} run dev
```

Wrangler starts a local Workers runtime on `http://localhost:8787`.

### 4. Test with Stripe CLI

Install the [Stripe CLI](https://stripe.com/docs/stripe-cli) and forward webhooks to your local server:

```bash
stripe listen --forward-to localhost:8787/webhook
```

Trigger a test event:

```bash
stripe trigger payment_intent.succeeded
```

## Project Structure

```
src/
├── index.ts              # Worker entry point (fetch handler)
├── handlers/
│   ├── payment.ts        # Payment-related event handlers
│   └── subscription.ts   # Subscription-related event handlers
wrangler.jsonc            # Cloudflare Workers configuration
.dev.vars.example         # Local secrets template (copy to .dev.vars)
```

## Adding New Handlers

To handle additional Stripe events, register them in the appropriate handler file:

```typescript
// src/handlers/payment.ts
router.on('payment_intent.created', async (event) => {
  const paymentIntent = event.data.object;
  // Your logic here
});
```

All Stripe event types are fully typed for TypeScript autocomplete and type safety.

## Deployment

### 1. Set production secrets

```bash
{{PACKAGE_MANAGER}} wrangler secret put STRIPE_API_KEY
{{PACKAGE_MANAGER}} wrangler secret put STRIPE_WEBHOOK_SECRET
```

### 2. Deploy

```bash
{{PACKAGE_MANAGER}} run deploy
```

### 3. Register the webhook endpoint

Point your Stripe webhook endpoint at `https://<your-worker>.<your-subdomain>.workers.dev/webhook`.

## Resources

- [Kotodayori Documentation](https://github.com/hideokamoto/stripe-webhook-router)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Stripe Event Types Reference](https://stripe.com/docs/api/events/types)
