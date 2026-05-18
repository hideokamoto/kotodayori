---
title: "@kotodayori/hono"
description: Kotodayori の Hono フレームワークアダプター
---

Hono アダプターは、Kotodayori ルーターを Hono アプリに接続し、生のリクエストボディの取得・署名検証・レスポンス生成を処理します。

## インストール

```bash
pnpm add @kotodayori/hono hono
```

**ピア依存関係**: `hono` >= 4.0.0

## 使い方

```typescript
import { Hono } from 'hono';
import Stripe from 'stripe';
import { StripeWebhookRouter, createStripeVerifier } from '@kotodayori/stripe';
import { honoAdapter } from '@kotodayori/hono';

const stripe = new Stripe(process.env.STRIPE_API_KEY!);
const router = new StripeWebhookRouter();

router.on('payment_intent.succeeded', async (event) => {
  console.log('支払い成功:', event.data.object.id);
});

const app = new Hono();

app.post('/webhook', honoAdapter(router, {
  verifier: createStripeVerifier(stripe, process.env.STRIPE_WEBHOOK_SECRET!),
  onError: async (error, event) => {
    console.error('ハンドラーエラー:', error);
  },
}));

export default app;
```

## API

```typescript
function honoAdapter<TEventMap>(
  router: WebhookRouter<TEventMap>,
  options: {
    verifier: Verifier;
    onError?: (error: Error, event?: WebhookEvent) => Promise<void>;
  }
): (c: Context) => Promise<Response>
```

- **verifier** — 必須。リクエストを検証してイベントを返します（例: `createStripeVerifier`）。
- **onError** — オプション。ハンドラーがエラーをスローした場合に呼び出されます。ロギングやエラー報告に活用できます。

アダプターは生のリクエストボディの取得に `c.req.text()` を使用し（署名検証に必要）、標準の Hono `Response` オブジェクトを返します（成功: 200・検証失敗: 400・ハンドラーエラー: 500）。
