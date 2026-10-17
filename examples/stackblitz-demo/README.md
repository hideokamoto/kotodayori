# Kotodayori StackBlitz demo

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/hideokamoto/kotodayori/tree/main/examples/stackblitz-demo?file=src/router.ts)

A browser-runnable demo of [Kotodayori](https://github.com/hideokamoto/kotodayori) with Hono and Stripe. The demo page plays the role of Stripe: it builds a fake event, signs it with a demo webhook secret, and posts it to `/webhook`, where `honoAdapter` verifies the signature and `StripeWebhookRouter` dispatches it.

**No Stripe account or API key is needed.** The verifier only checks the HMAC signature locally and never calls the Stripe API.

## What to try

| Button | Result |
| --- | --- |
| Send signed event | `200`, the middleware and the matching handler run |
| Send tampered body | `400 Verification failed`, the body was changed after signing |
| Send without signature | `400 Verification failed`, the `stripe-signature` header is missing |

When verification fails, the activity panel shows the reason reported by the Stripe SDK (the HTTP response itself is always the same `400 Verification failed`).

Pick `invoice.paid` to see an event with no registered handler: it is acknowledged with `200` and only the middleware runs.

Edit `src/router.ts` to add handlers. The file ends with a commented-out handler that shows the type error you get when you read a field the event's object does not have.

## Files

```
src/
├── router.ts   # StripeWebhookRouter, middleware and handlers (start here)
├── app.ts      # Hono app: /webhook endpoint and the /demo/send helper that signs fake events
├── events.ts   # Fake event payloads
├── page.ts     # Demo page HTML
├── server.ts   # Node server entry point
└── smoke.ts    # Smoke test run in CI (npm run smoke)
```

## Run locally

```bash
npm install
npm run dev
```

Then open <http://localhost:3000>.

## How this differs from the other examples

Unlike `sample-hono-stripe` and `sample-express-stripe`, this project is excluded from the pnpm workspace and depends on the **published** `@kotodayori/*` packages, so StackBlitz can install it with npm on its own. It also hard-codes a demo webhook secret, and its npm scripts run Node with `--conditions=worker` so that the Stripe SDK loads its web-standard build: the Node build's signature comparison (`crypto.timingSafeEqual`) throws on StackBlitz WebContainers. Regular Node.js apps do not need this flag. For a real app, read `STRIPE_API_KEY` and `STRIPE_WEBHOOK_SECRET` from the environment as in `sample-hono-stripe`.
