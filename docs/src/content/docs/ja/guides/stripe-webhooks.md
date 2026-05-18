---
title: Stripe Webhooks
description: Kotodayori で Stripe Webhook をセットアップする
---

このガイドでは、Stripe ルーターと任意のアダプターを使って Kotodayori で Stripe Webhook をセットアップする手順を説明します。

## 1. 依存パッケージのインストール

Hono の場合（他のフレームワークを使う場合は適宜置き換えてください）：

```bash
pnpm add @kotodayori/stripe @kotodayori/hono stripe
```

## 2. Webhook シークレットの取得

[Stripe ダッシュボード](https://dashboard.stripe.com/webhooks)で、あなたのルート（例: `https://your-app.com/webhook`）を指す Webhook エンドポイントを作成します。必要なイベントを選択してください。作成後、Stripe に**署名シークレット**（`whsec_` で始まる文字列）が表示されます。環境変数（例: `STRIPE_WEBHOOK_SECRET`）として安全に保管してください。

## 3. ルーターとハンドラーの作成

```typescript
import Stripe from 'stripe';
import { StripeWebhookRouter, createStripeVerifier } from '@kotodayori/stripe';

const stripe = new Stripe(process.env.STRIPE_API_KEY!);
const router = new StripeWebhookRouter();

router.on('payment_intent.succeeded', async (event) => {
  const paymentIntent = event.data.object;
  console.log('支払い成功:', paymentIntent.id, paymentIntent.amount);
});

router.on('customer.subscription.deleted', async (event) => {
  const subscription = event.data.object;
  console.log('サブスクリプションキャンセル:', subscription.id);
});
```

## 4. アダプターの接続

Hono の場合：

```typescript
import { Hono } from 'hono';
import { honoAdapter } from '@kotodayori/hono';

const app = new Hono();

app.post('/webhook', honoAdapter(router, {
  verifier: createStripeVerifier(stripe, process.env.STRIPE_WEBHOOK_SECRET!),
}));

export default app;
```

Express の場合は、アダプターの前に `express.raw({ type: 'application/json' })` を使用してください。Lambda の場合は `lambdaAdapter(router, { verifier })` からハンドラーをエクスポートしてください。

## 5. セキュリティ上の注意

- **常に署名を検証する** — `createStripeVerifier` を使用し、検証なしにリクエストボディを信頼しないこと。
- **生のリクエストボディを使用する** — アダプターは署名検証のために生のリクエストボディが必要です。Verifier の前に JSON をパースしないでください。
- **シークレットを安全に管理する** — `STRIPE_WEBHOOK_SECRET` をログ出力したり外部に露出させないこと。

## 型安全性

イベント名は自動補完され、ハンドラーは正確な Stripe イベント型（例: `Stripe.PaymentIntentSucceededEvent`）を受け取ります。利用可能なイベントの全一覧は [Stripe Events API](https://stripe.com/docs/api/events/types) と IDE で確認してください。
