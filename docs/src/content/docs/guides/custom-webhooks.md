---
title: Custom Webhooks
description: Use Kotodayori with any webhook provider
---

Kotodayori is not limited to Stripe. The core router works with any webhook provider (for example CircleCI, LINE, or your own API) once you give it two things:

1. **An event type map**: event type strings mapped to typed events, so each handler receives the right type.
2. **A verifier**: a function that checks the request signature against the raw body and returns `{ event }`.

This guide builds both for two providers that deliver webhooks in different shapes: CircleCI sends one event per request, LINE sends a batch of events per request. A runnable version of everything below is in [`examples/custom-webhooks-demo`](https://github.com/hideokamoto/kotodayori/tree/main/examples/custom-webhooks-demo), which you can also [open in StackBlitz](https://stackblitz.com/github/hideokamoto/kotodayori/tree/main/examples/custom-webhooks-demo?file=src/routers.ts).

## Verifying an HMAC signature

Most providers sign the raw request body with HMAC-SHA256. Web Crypto's `crypto.subtle.verify` compares signatures in constant time, and the same code runs on Node.js 20+, Cloudflare Workers and other edge runtimes:

```typescript
const encoder = new TextEncoder();

async function verifyHmacSha256(secret: string, body: string | Uint8Array, signature: Uint8Array) {
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
  );
  const data = typeof body === 'string' ? encoder.encode(body) : new Uint8Array(body);
  return crypto.subtle.verify('HMAC', key, new Uint8Array(signature), data);
}
```

Always verify the raw body (`string` or `Uint8Array`; a Node.js `Buffer` is a `Uint8Array`) exactly as received. Parsing and re-serializing the JSON first changes the bytes and breaks the signature. Never log secrets.

## One event per request: CircleCI

CircleCI [outbound webhooks](https://circleci.com/docs/guides/integration/outbound-webhooks/) send the event type in the `circleci-event-type` header (`workflow-completed` or `job-completed`) and sign the body in `circleci-signature: v1=<hex>`.

### Event types

```typescript
import type { WebhookEvent } from '@kotodayori/core';

interface WorkflowCompletedEvent extends WebhookEvent {
  type: 'workflow-completed';
  data: {
    object: {
      id: string;
      project: { slug: string };
      workflow: { name: string; status: 'success' | 'failed' | 'error' | 'canceled' | 'unauthorized'; url: string };
    };
  };
}

interface JobCompletedEvent extends WebhookEvent {
  type: 'job-completed';
  data: {
    object: {
      id: string;
      job: { name: string; number: number; status: 'success' | 'failed' | 'canceled' | 'unauthorized' };
    };
  };
}

type CircleCIEventMap = {
  'workflow-completed': WorkflowCompletedEvent;
  'job-completed': JobCompletedEvent;
};
```

### Verifier

The header can list several versions (`v1=...,v2=...`). CircleCI's docs say to check only the latest version, to prevent downgrade attacks; `v1` is the latest and only version today.

```typescript
import type { Verifier } from '@kotodayori/core';

function hexToBytes(hex: string): Uint8Array | null {
  if (!/^(?:[0-9a-f]{2})+$/i.test(hex)) return null;
  return new Uint8Array(hex.match(/../g)!.map((pair) => parseInt(pair, 16)));
}

function createCircleCIVerifier(secret: string): Verifier {
  return async (payload, headers) => {
    const header = headers['circleci-signature'];
    if (!header) throw new Error('Missing circleci-signature header');

    const v1 = header.split(',').map((part) => part.trim()).find((part) => part.startsWith('v1='));
    const signature = v1 ? hexToBytes(v1.slice('v1='.length)) : null;
    if (!signature || !(await verifyHmacSha256(secret, payload, signature))) {
      throw new Error('Invalid signature');
    }

    const type = headers['circleci-event-type'];
    if (!type) throw new Error('Missing circleci-event-type header');

    const text = typeof payload === 'string' ? payload : new TextDecoder().decode(payload);
    const body = JSON.parse(text);
    return { event: { id: body.id, type, data: { object: body } } };
  };
}
```

### Router and adapter

```typescript
import { Hono } from 'hono';
import { WebhookRouter } from '@kotodayori/core';
import { honoAdapter } from '@kotodayori/hono';

const router = new WebhookRouter<CircleCIEventMap>();

router.on('workflow-completed', async (event) => {
  const { workflow, project } = event.data.object;
  if (workflow.status !== 'success') {
    console.log(`Workflow ${workflow.name} ${workflow.status} on ${project.slug}: ${workflow.url}`);
  }
});

router.on('job-completed', async (event) => {
  console.log(`Job ${event.data.object.job.name}: ${event.data.object.job.status}`);
});

const app = new Hono();
app.post('/webhooks/circleci', honoAdapter(router, {
  verifier: createCircleCIVerifier(process.env.CIRCLECI_WEBHOOK_SECRET!),
}));
```

Event types without a handler (a type CircleCI adds later, for example) are acknowledged with `200` and ignored.

## Many events per request: LINE

The [LINE Messaging API](https://developers.line.biz/en/reference/messaging-api/) sends `{ destination, events: [...] }` and signs the body in `x-line-signature` as base64. Because one request can carry several events, verification and routing happen in two steps:

1. The verifier checks the signature once and returns the whole body as a single `line.callback` event.
2. A small `WebhookDispatcher` takes that batch and dispatches each LINE event to the router. Adapters accept any object with a `dispatch(event)` method, so you pass this splitter to the adapter instead of the router.

Message events are routed by message type (`message.text`, `message.sticker`, ...) so that each handler gets the narrowed message type. The payload types come from the official [`@line/bot-sdk`](https://github.com/line/line-bot-sdk-nodejs) package.

```typescript
import { Hono } from 'hono';
import { WebhookRouter, type Verifier, type WebhookDispatcher, type WebhookEvent } from '@kotodayori/core';
import { honoAdapter } from '@kotodayori/hono';
import type { webhook } from '@line/bot-sdk';

interface LineEvent<TType extends string, TEvent> extends WebhookEvent {
  type: TType;
  data: { object: TEvent };
}
type MessageEventOf<T extends webhook.MessageContent> = Omit<webhook.MessageEvent, 'message'> & { message: T };

type LineEventMap = {
  'message.text': LineEvent<'message.text', MessageEventOf<webhook.TextMessageContent>>;
  'message.sticker': LineEvent<'message.sticker', MessageEventOf<webhook.StickerMessageContent>>;
  follow: LineEvent<'follow', webhook.FollowEvent>;
};

interface LineCallbackEvent extends WebhookEvent {
  type: 'line.callback';
  data: { object: webhook.CallbackRequest };
}

function createLineVerifier(channelSecret: string): Verifier<LineCallbackEvent> {
  return async (payload, headers) => {
    const header = headers['x-line-signature'];
    if (!header) throw new Error('Missing x-line-signature header');

    let signature: Uint8Array;
    try {
      signature = Uint8Array.from(atob(header), (c) => c.charCodeAt(0));
    } catch {
      throw new Error('Invalid signature');
    }
    if (!(await verifyHmacSha256(channelSecret, payload, signature))) {
      throw new Error('Invalid signature');
    }

    const text = typeof payload === 'string' ? payload : new TextDecoder().decode(payload);
    const body = JSON.parse(text) as webhook.CallbackRequest;
    return { event: { id: crypto.randomUUID(), type: 'line.callback', data: { object: body } } };
  };
}

function splitLineEvents(router: WebhookDispatcher): WebhookDispatcher<LineCallbackEvent> {
  return {
    async dispatch(batch) {
      for (const event of batch.data.object.events) {
        const type = event.type === 'message' ? `message.${event.message.type}` : event.type;
        await router.dispatch({ id: event.webhookEventId, type, data: { object: event } });
      }
    },
  };
}

const router = new WebhookRouter<LineEventMap>();

router.on('message.text', async (event) => {
  console.log('Text:', event.data.object.message.text);
});

router.on('follow', async (event) => {
  console.log('New friend:', event.data.object.source?.type);
});

const app = new Hono();
app.post('/webhooks/line', honoAdapter(splitLineEvents(router), {
  verifier: createLineVerifier(process.env.LINE_CHANNEL_SECRET!),
}));
```

## Choosing the event type

The verifier decides which `type` the router sees, so build it from what the provider actually sends. If a provider puts the event name in a header and a sub-action in the body, combine both into the type you register handlers for. A handler registered for a type the verifier never produces is never called, and the request is still answered with `200`, so this mistake is silent. Test your verifier with a real (or realistic) delivery and check that the handler runs.
