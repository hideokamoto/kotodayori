---
title: "@kotodayori/stripe"
description: Stripe 固有の型・ルーター・Verifier
---

Stripe パッケージは、コアルーターを Stripe 固有の型で拡張し、Stripe Webhook の署名検証機能を提供します。

## インストール

```bash
pnpm add @kotodayori/stripe stripe
```

## 主なエクスポート

| エクスポート | 説明 |
|--------|-------------|
| `StripeWebhookRouter` | 完全な Stripe イベント型推論を持つルーター |
| `StripeEventMap` | 351 種類以上の Stripe イベント型マップ |
| `createStripeVerifier(stripe, secret)` | Stripe 署名検証のファクトリ関数 |
| `@kotodayori/core` からの再エクスポート | `WebhookRouter`・`WebhookEvent`・`Verifier` など |

## 型安全なイベントハンドラー

イベント名は自動補完・検証され、ハンドラーは正確な Stripe イベント型を受け取ります：

```typescript
import { StripeWebhookRouter } from '@kotodayori/stripe';

const router = new StripeWebhookRouter();

router.on('payment_intent.succeeded', async (event) => {
  // event は Stripe.PaymentIntentSucceededEvent
  const amount = event.data.object.amount;
  const currency = event.data.object.currency;
});

router.on('customer.subscription.created', async (event) => {
  // event は Stripe.CustomerSubscriptionCreatedEvent
  const customerId = event.data.object.customer;
});
```

## 署名検証

Stripe インスタンスと Webhook 署名シークレットを使って `createStripeVerifier` を使用します：

```typescript
import Stripe from 'stripe';
import { createStripeVerifier } from '@kotodayori/stripe';

const stripe = new Stripe(process.env.STRIPE_API_KEY!);
const verifier = createStripeVerifier(stripe, process.env.STRIPE_WEBHOOK_SECRET!);

// アダプターに verifier を渡す（例: honoAdapter(router, { verifier })）
```

Verifier は `Stripe-Signature` ヘッダーを検証し、パースされたイベントを返します。検証前に Webhook ボディを JSON パースしないでください。

## Stripe イベントのカバレッジ

`StripeEventMap` は手動でメンテナンスされており、以下のカテゴリを含む 351 種類以上のイベント型をカバーしています：

- `account.*`・`charge.*`・`checkout.session.*`・`customer.*`
- `invoice.*`・`payment_intent.*`・`subscription.*` など

全一覧は [Stripe Events API](https://stripe.com/docs/api/events/types) を参照してください。Stripe SDK が更新された際は、stripe パッケージで `pnpm run check-events` を実行して、欠けているイベントや廃止されたイベントを確認してください。
