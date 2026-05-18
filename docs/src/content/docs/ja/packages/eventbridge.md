---
title: "@kotodayori/eventbridge"
description: Kotodayori の AWS EventBridge アダプター
---

EventBridge アダプターは、AWS EventBridge イベントによって呼び出されたときに Kotodayori ルーターを実行します。EventBridge はお客様の AWS アカウント内からイベントを配信するため、署名検証は不要です。

## インストール

```bash
pnpm add @kotodayori/eventbridge
```

## 使い方

```typescript
import type { EventBridgeEvent } from 'aws-lambda';
import { WebhookRouter } from '@kotodayori/core';
import { eventBridgeAdapter } from '@kotodayori/eventbridge';

const router = new WebhookRouter<MyEventMap>();

router.on('my.event', async (event) => {
  console.log('イベント:', event.data.object);
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

アダプターは `event.detail` に Webhook ペイロードが含まれていることを期待します。`verifier` オプションはありません。EventBridge はお客様のアカウント内でイベントの信頼性を保証します。
