---
title: "@kotodayori/eventbridge"
description: AWS EventBridge adapter for Kotodayori
---

[![npm version](https://img.shields.io/npm/v/%40kotodayori%2Feventbridge.svg?logo=npm&label=npm)](https://www.npmjs.com/package/@kotodayori/eventbridge)
[![npm downloads](https://img.shields.io/npm/dm/%40kotodayori%2Feventbridge.svg)](https://www.npmjs.com/package/@kotodayori/eventbridge)
[![license](https://img.shields.io/npm/l/%40kotodayori%2Feventbridge.svg)](https://www.npmjs.com/package/@kotodayori/eventbridge)

The EventBridge adapter runs a Kotodayori router when invoked by an AWS EventBridge event. Because EventBridge delivers events from within your AWS account, no signature verification is required.

## Installation

```bash
pnpm add @kotodayori/eventbridge
```

## Usage

```typescript
import type { EventBridgeEvent } from 'aws-lambda';
import { WebhookRouter } from '@kotodayori/core';
import { eventBridgeAdapter } from '@kotodayori/eventbridge';

const router = new WebhookRouter<MyEventMap>();

router.on('my.event', async (event) => {
  console.log('Event:', event.data.object);
});

export const handler = eventBridgeAdapter(router, {
  onError: async (error) => console.error(error),
});
```

## API

```typescript
function eventBridgeAdapter<TEventMap>(
  router: WebhookRouter<TEventMap>,
  options: {
    onError?: (error: Error, event?: WebhookEvent) => Promise<void>;
  }
): Handler<EventBridgeEvent<string, unknown>, void>
```

The adapter expects the webhook payload in `event.detail`. There is no `verifier` option: EventBridge guarantees event authenticity within your account.
