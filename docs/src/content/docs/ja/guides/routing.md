---
title: ルーティング
description: ハンドラーのグルーピング・ネストしたルーター・ファンアウト
---

Kotodayori は柔軟なルーティングをサポートしています。プレフィックスによるグルーピング・ネストしたルーターのマウント・複数ハンドラーの並列実行（ファンアウト）が利用できます。

## プレフィックスによるグルーピング

`group(prefix, callback)` を使用すると、共通プレフィックスを繰り返すことなく、そのプレフィックス配下にハンドラーを登録できます：

```typescript
const router = new StripeWebhookRouter();

router.group('payment_intent', (r) => {
  r.on('succeeded', async (event) => {
    // payment_intent.succeeded を処理
  });
  r.on('payment_failed', async (event) => {
    // payment_intent.payment_failed を処理
  });
  r.on('canceled', async (event) => {
    // payment_intent.canceled を処理
  });
});
```

## 1 つのイベントに複数のハンドラー

同じイベントに複数のハンドラーを登録できます。順番に実行されます：

```typescript
router.on('customer.subscription.created', async (event) => {
  await sendWelcomeEmail(event.data.object.customer);
});

router.on('customer.subscription.created', async (event) => {
  await trackAnalytics(event);
});

router.on('customer.subscription.created', async (event) => {
  await notifySlack(event);
});
```

## ネストしたルーター

サブルーターを作成し、`route(prefix, router)` でプレフィックスの下にマウントします：

```typescript
const subscriptionRouter = new StripeWebhookRouter();
subscriptionRouter.on('created', async (event) => { /* ... */ });
subscriptionRouter.on('updated', async (event) => { /* ... */ });
subscriptionRouter.on('deleted', async (event) => { /* ... */ });

const mainRouter = new StripeWebhookRouter();
mainRouter.route('customer.subscription', subscriptionRouter);
```

`customer.subscription.created` のようなイベントは `subscriptionRouter` で処理されます。

## ファンアウト（並列ハンドラー）

`fanout()` を使用すると、1 つのイベントに対して複数のハンドラーを並列実行できます：

```typescript
router.fanout('payment_intent.succeeded', [
  async (event) => await updateDatabase(event),
  async (event) => await sendReceipt(event),
  async (event) => await trackRevenue(event),
], {
  strategy: 'best-effort', // または 'all-or-nothing'（デフォルト）
  onError: (error) => console.error('ハンドラーでエラー:', error),
});
```

- **`all-or-nothing`**（デフォルト）— `Promise.all` を使用。1 つでも失敗するとファンアウト全体が失敗します。
- **`best-effort`** — `Promise.allSettled` を使用。1 つが失敗しても他のハンドラーは実行を継続します。

ハンドラーが互いに独立していて、全体の処理時間を短縮したい場合にファンアウトを使用してください。
