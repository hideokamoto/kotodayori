---
title: 既存アプリへの追加
description: 既存の Hono・Express・Lambda アプリに Kotodayori を組み込む
---

すでに Hono（または Express / Lambda）アプリをお持ちなら、新規プロジェクトを生成しなくても Kotodayori を組み込めます。必要なパッケージをインストールし、ルーターを作成して既存のルートにマウントするだけです。

ゼロから始める場合は、`create-kotodayori` を使う [クイックスタート](/ja/getting-started/quick-start/) のほうが手軽です。

## 前提条件

- **Node.js** >= 18
- サポート対象フレームワーク（Hono・Express・Lambda）を使った既存アプリ

## 1. パッケージをインストールする

ユースケースに合った組み合わせを選びます：

### Stripe + Hono

```bash
pnpm add @kotodayori/stripe @kotodayori/hono stripe
```

### Stripe + Express

```bash
pnpm add @kotodayori/stripe @kotodayori/express stripe
```

### Stripe + AWS Lambda

```bash
pnpm add @kotodayori/stripe @kotodayori/lambda stripe
```

### カスタム Webhook（Stripe なし）

コアルーターと任意のアダプターを組み合わせて使用します：

```bash
pnpm add @kotodayori/core @kotodayori/hono
# または @kotodayori/express、@kotodayori/lambda
```

### Zod によるランタイムバリデーション

型安全に加えてランタイムでのスキーマ検証が必要な場合：

```bash
pnpm add @kotodayori/stripe @kotodayori/zod @kotodayori/hono stripe zod
```

## 2. ルーターを作成してマウントする

ルーターを追加し、既存の Hono アプリのルートに結線します：

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

// `app` は既存の Hono アプリケーション
app.post('/webhook', honoAdapter(router, {
  verifier: createStripeVerifier(stripe, process.env.STRIPE_WEBHOOK_SECRET!),
}));
```

Express の場合は、Verifier が生のボディを受け取れるよう、アダプターの前に `express.raw({ type: 'application/json' })` を使用してください。Lambda の場合は `lambdaAdapter(router, { verifier })` からハンドラーをエクスポートします。

## ピア依存関係

- **Stripe アダプター** (`@kotodayori/stripe`): `stripe` >= 17.0.0
- **Hono アダプター** (`@kotodayori/hono`): `hono` >= 4.0.0
- **Express アダプター** (`@kotodayori/express`): `express` >= 4.0.0
- **Zod 連携** (`@kotodayori/zod`): `zod` ^4.0.0

使用するパッケージに対応したピア依存関係をインストールしてください。

## 次のステップ

- [Stripe Webhooks](/ja/guides/stripe-webhooks/) — 型安全な Stripe Webhook のセットアップ
- [カスタム Webhook](/ja/guides/custom-webhooks/) — Kotodayori をあらゆる Webhook プロバイダーで使用
- [ルーティング](/ja/guides/routing/) — ハンドラーのグルーピングとネストしたルーターのマウント
