# Kotodayori custom webhooks demo (CircleCI and LINE)

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/hideokamoto/kotodayori/tree/main/examples/custom-webhooks-demo?file=src/routers.ts)

Kotodayori's router is not tied to Stripe. This demo uses the generic `WebhookRouter` from `@kotodayori/core` with hand-written verifiers for two providers that deliver webhooks in different shapes:

| Provider | Signature header | One request carries | How it is routed |
| --- | --- | --- | --- |
| [CircleCI](https://circleci.com/docs/guides/integration/outbound-webhooks/) | `circleci-signature: v1=<hex HMAC-SHA256>` | one event | by the `circleci-event-type` header (`workflow-completed`, `job-completed`) |
| [LINE Messaging API](https://developers.line.biz/en/reference/messaging-api/) | `x-line-signature: <base64 HMAC-SHA256>` | a batch: `{ destination, events: [...] }` | each event by its `type`, and message events by message type (`message.text`, `message.sticker`, ...) |

The demo page plays the role of the provider: it signs a fake delivery with a demo secret and posts it to `/webhooks/circleci` or `/webhooks/line`. **No CircleCI or LINE account is needed.**

## What to try

| Button | Result |
| --- | --- |
| Send signed delivery | `200`, the middleware and the matching handlers run |
| Send tampered body | `400 Verification failed`, the body was changed after signing |
| Send without signature | `400 Verification failed`, the signature header is missing |

- **LINE: one request with 2 events** shows one HTTP request being split into a `follow` event and a `message.text` event, each handled on its own.
- **LINE: image message (no handler)** is acknowledged with `200`; only the middleware runs.
- When verification fails, the activity panel shows the reason (the HTTP response is always the same `400 Verification failed`).

Edit `src/routers.ts` to add handlers. The file ends with a commented-out handler that shows the type error you get when you read a field that the event does not have.

## How it works

- **`src/circleci.ts`**: payload types for `workflow-completed` and `job-completed`, and `createCircleCIVerifier()`. Following CircleCI's docs, it checks only the latest signature version (`v1`), so that an attacker cannot downgrade to an older scheme.
- **`src/line.ts`**: `createLineVerifier()` returns the whole request body as one `line.callback` event. `splitLineEvents(router)` is a `WebhookDispatcher` that the adapter calls instead of the router, and it dispatches each LINE event to the router in order. The LINE payload types come from the official [`@line/bot-sdk`](https://github.com/line/line-bot-sdk-nodejs) package (type-only import).
- **`src/hmac.ts`**: HMAC-SHA256 with Web Crypto (`crypto.subtle`). `crypto.subtle.verify` compares signatures in constant time, and the same code runs on Node.js 20+, StackBlitz WebContainers and edge runtimes such as Cloudflare Workers.

## Files

```
src/
├── routers.ts   # Routers, middleware and handlers (start here)
├── circleci.ts  # CircleCI payload types and verifier
├── line.ts      # LINE event map, verifier and batch splitter
├── hmac.ts      # Web Crypto HMAC helpers
├── app.ts       # Hono app: webhook endpoints and the /demo/send helper that signs fake deliveries
├── events.ts    # Fake deliveries
├── page.ts      # Demo page HTML
├── server.ts    # Node server entry point
└── smoke.ts     # Smoke test run in CI (npm run smoke)
```

The smoke test also checks the HMAC helper against the test vectors published in CircleCI's docs, and checks the LINE signatures the demo produces with `validateSignature` from `@line/bot-sdk`.

## Run locally

```bash
npm install
npm run dev
```

Then open <http://localhost:3000>. Requires Node.js 20 or later (for the global `crypto`).

## Using this in a real app

Read the secrets from the environment instead of the constants in `src/app.ts`: the CircleCI webhook's signing secret, and the LINE channel secret. Like the other examples, this project is excluded from the pnpm workspace and depends on the **published** `@kotodayori/*` packages, so StackBlitz can install it with npm on its own.
