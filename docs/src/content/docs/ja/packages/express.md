---
title: "@kotodayori/express"
description: Kotodayori の Express フレームワークアダプター
---

Express アダプターは、Kotodayori ルーターを Express アプリに接続します。署名検証のために生のリクエストボディを提供する必要があります。

## インストール

```bash
pnpm add @kotodayori/express express
```

**ピア依存関係**: `express` >= 4.0.0

## 使い方

Webhook ルートでは **`express.raw({ type: 'application/json' })`** を使用して、生のリクエストボディを受け取るようにしてください。Webhook ルートに `express.json()` を使用しないでください。

```typescript
import express from 'express';
import Stripe from 'stripe';
import { StripeWebhookRouter, createStripeVerifier } from '@kotodayori/stripe';
import { expressAdapter } from '@kotodayori/express';

const stripe = new Stripe(process.env.STRIPE_API_KEY!);
const router = new StripeWebhookRouter();

router.on('charge.succeeded', async (event) => {
  console.log('チャージ成功:', event.data.object.id);
});

const app = express();

app.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  expressAdapter(router, {
    verifier: createStripeVerifier(stripe, process.env.STRIPE_WEBHOOK_SECRET!),
    onError: async (error) => console.error(error),
  })
);

app.listen(3000);
```

## API

```typescript
function expressAdapter<TEventMap>(
  router: WebhookRouter<TEventMap>,
  options: {
    verifier: Verifier;
    onError?: (error: Error, event?: WebhookEvent) => Promise<void>;
  }
): express.RequestHandler
```

ボディが既にパース済みの場合（例: `express.json()` 使用時）、アダプターはエラーをスローします。Webhook ルートでは、アダプターの前に必ず `express.raw({ type: 'application/json' })` を配置してください。
