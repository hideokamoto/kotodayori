[English](./README.md) | **日本語**

# @kotodayori/stripe

Kotodayori 向けの、Stripe 固有の型定義、ルーター、Webhook 検証ロジック。

## 概要

`@kotodayori/stripe` は、253 種類以上のすべての Stripe イベント型に対する完全な型定義、型安全なイベント処理を備えた専用ルーター、署名検証ユーティリティを提供し、Stripe Webhook を第一級でサポートします。

## インストール

```bash
npm install @kotodayori/stripe stripe
# または
pnpm add @kotodayori/stripe stripe
# または
yarn add @kotodayori/stripe stripe
```

**注意**: `stripe` はピア依存関係であり、個別にインストールする必要があります。

## 特徴

- **完全な型カバレッジ**: 253 種類以上のすべての Stripe イベント型を、完全な TypeScript サポート付きで提供します
- **型安全なルーター**: すべての Stripe イベントを補完できる `StripeWebhookRouter`
- **署名検証**: Webhook のセキュリティのための組み込み `createStripeVerifier()`
- **イベントのグループ化**: イベントのプレフィックス（例: `payment_intent`、`customer`）ごとにハンドラーを整理できます
- **設定不要**: Stripe SDK とそのまま動作します

## クイックスタート

### 基本的な例

```typescript
import Stripe from 'stripe';
import { StripeWebhookRouter, createStripeVerifier } from '@kotodayori/stripe';
import { honoAdapter } from '@kotodayori/hono';
import { Hono } from 'hono';

const stripe = new Stripe(process.env.STRIPE_API_KEY!);
const router = new StripeWebhookRouter();

// 完全な型安全性を備えたイベントハンドラーを登録する
router.on('payment_intent.succeeded', async (event) => {
  // event.data.object は Stripe.PaymentIntent として型付けされます
  console.log('Payment succeeded:', event.data.object.id);
  console.log('Amount:', event.data.object.amount);
});

router.on('customer.subscription.created', async (event) => {
  // event.data.object は Stripe.Subscription として型付けされます
  console.log('New subscription:', event.data.object.id);
  console.log('Customer:', event.data.object.customer);
});

const app = new Hono();

app.post('/webhook', honoAdapter(router, {
  verifier: createStripeVerifier(stripe, process.env.STRIPE_WEBHOOK_SECRET!),
}));

export default app;
```

## API リファレンス

### StripeWebhookRouter

完全な型安全性を備えた、Stripe Webhook イベント専用のルーターです。

```typescript
import { StripeWebhookRouter } from '@kotodayori/stripe';

const router = new StripeWebhookRouter();
```

[`WebhookRouter`](../core#webhookrouter) のすべてのメソッドが、Stripe 固有の型付きで利用できます。

#### イベントハンドラー

```typescript
// 単一のイベント
router.on('charge.succeeded', async (event) => {
  // event は Stripe.ChargeSucceededEvent として型付けされます
  const charge = event.data.object; // Stripe.Charge
});

// 複数のイベント
router.on(['invoice.paid', 'invoice.payment_failed'], async (event) => {
  // event は Stripe.InvoicePaidEvent | Stripe.InvoicePaymentFailedEvent として型付けされます
});
```

#### イベントのグループ化

プレフィックスごとに関連するイベントをグループ化します。

```typescript
router.group('payment_intent', (r) => {
  r.on('succeeded', async (event) => {
    // 'payment_intent.succeeded' を処理する
  });

  r.on('payment_failed', async (event) => {
    // 'payment_intent.payment_failed' を処理する
  });

  r.on('canceled', async (event) => {
    // 'payment_intent.canceled' を処理する
  });
});

router.group('customer.subscription', (r) => {
  r.on('created', async (event) => {
    // 'customer.subscription.created' を処理する
  });

  r.on('updated', async (event) => {
    // 'customer.subscription.updated' を処理する
  });

  r.on('deleted', async (event) => {
    // 'customer.subscription.deleted' を処理する
  });
});
```

### createStripeVerifier

Stripe Webhook の署名検証を行う検証関数を作成します。

```typescript
import Stripe from 'stripe';
import { createStripeVerifier } from '@kotodayori/stripe';

const stripe = new Stripe(process.env.STRIPE_API_KEY!);

const verifier = createStripeVerifier(
  stripe,
  process.env.STRIPE_WEBHOOK_SECRET!
);
```

**パラメータ:**
- `stripe` - Stripe SDK のインスタンス
- `secret` - Stripe ダッシュボードで取得した Webhook 署名シークレット

この検証関数は次の処理を行います。
1. `stripe.webhooks.constructEventAsync()` を使って Webhook の署名を検証する
2. イベントペイロードをパースする
3. 型付けされた Stripe イベントを返す（`Promise<VerifyResult<Stripe.Event>>` として）

> **注意:** この検証関数は非同期であり、Stripe の `constructEventAsync()` を使用します。
> これは Node.js に加えて、Cloudflare Workers や Deno Deploy のような Edge ランタイムでも動作します。
> これらの環境では Stripe は Web Crypto の `SubtleCryptoProvider` に依存しており、非同期の署名検証のみをサポートします。
> Kotodayori のすべてのアダプターはすでに検証関数を `await` しているため、追加の配線は不要です。
> [Cloudflare Workers / Edge ランタイム](#cloudflare-workers--edge-ランタイムでの利用)を参照してください。

## フレームワークアダプターとの併用

### Hono との併用

```typescript
import { Hono } from 'hono';
import Stripe from 'stripe';
import { StripeWebhookRouter, createStripeVerifier } from '@kotodayori/stripe';
import { honoAdapter } from '@kotodayori/hono';

const stripe = new Stripe(process.env.STRIPE_API_KEY!);
const router = new StripeWebhookRouter();

router.on('payment_intent.succeeded', async (event) => {
  console.log('Payment:', event.data.object.id);
});

const app = new Hono();

app.post('/webhook', honoAdapter(router, {
  verifier: createStripeVerifier(stripe, process.env.STRIPE_WEBHOOK_SECRET!),
}));

export default app;
```

### Express との併用

```typescript
import express from 'express';
import Stripe from 'stripe';
import { StripeWebhookRouter, createStripeVerifier } from '@kotodayori/stripe';
import { expressAdapter } from '@kotodayori/express';

const stripe = new Stripe(process.env.STRIPE_API_KEY!);
const router = new StripeWebhookRouter();

router.on('charge.succeeded', async (event) => {
  console.log('Charge:', event.data.object.id);
});

const app = express();

app.post('/webhook',
  express.raw({ type: 'application/json' }),
  expressAdapter(router, {
    verifier: createStripeVerifier(stripe, process.env.STRIPE_WEBHOOK_SECRET!),
  })
);

app.listen(3000);
```

### AWS Lambda との併用

```typescript
import Stripe from 'stripe';
import { StripeWebhookRouter, createStripeVerifier } from '@kotodayori/stripe';
import { lambdaAdapter } from '@kotodayori/lambda';

const stripe = new Stripe(process.env.STRIPE_API_KEY!);
const router = new StripeWebhookRouter();

router.on('invoice.paid', async (event) => {
  console.log('Invoice paid:', event.data.object.id);
});

export const handler = lambdaAdapter(router, {
  verifier: createStripeVerifier(stripe, process.env.STRIPE_WEBHOOK_SECRET!),
});
```

### Cloudflare Workers / Edge ランタイムでの利用

Cloudflare Workers（および Deno Deploy のような他の Edge ランタイム）では、
Stripe SDK を `Stripe.createFetchHttpClient()` で構成します。このモードでは
SDK は Web Crypto の `SubtleCryptoProvider` を使用し、**非同期**の署名検証のみをサポートします。
`createStripeVerifier` は内部ですでに `constructEventAsync()` を使用しているため、
追加の設定なしで動作します。

```typescript
import { Hono } from 'hono';
import Stripe from 'stripe';
import { StripeWebhookRouter, createStripeVerifier } from '@kotodayori/stripe';
import { honoAdapter } from '@kotodayori/hono';

type Bindings = {
  STRIPE_API_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// ルーターを定義し、ハンドラーをモジュールスコープで一度だけ登録する
const router = new StripeWebhookRouter();
router.on('payment_intent.succeeded', async (event) => {
  console.log('Payment:', event.data.object.id);
});

app.post('/webhook', (c) => {
  // Workers では、シークレットは process.env ではなく `env` バインディングから取得します
  const stripe = new Stripe(c.env.STRIPE_API_KEY, {
    httpClient: Stripe.createFetchHttpClient(),
  });

  return honoAdapter(router, {
    verifier: createStripeVerifier(stripe, c.env.STRIPE_WEBHOOK_SECRET),
  })(c);
});

export default app;
```

> **これが重要な理由:** 同期版の `constructEvent()` を使うと、Edge ランタイムでは
> `SubtleCryptoProvider cannot be used in a synchronous context` というエラーが発生します。
> `createStripeVerifier` は非同期であり、アダプターがそれを `await` するため、
> 同じコードが Node.js でも Edge でも変更なしで動作します。

## よくあるユースケース

### 決済処理

```typescript
router.group('payment_intent', (r) => {
  r.on('succeeded', async (event) => {
    const payment = event.data.object;
    await fulfillOrder(payment.id, payment.amount);
  });

  r.on('payment_failed', async (event) => {
    const payment = event.data.object;
    await notifyPaymentFailure(payment.customer, payment.last_payment_error);
  });
});
```

### サブスクリプション管理

```typescript
router.group('customer.subscription', (r) => {
  r.on('created', async (event) => {
    const subscription = event.data.object;
    await sendWelcomeEmail(subscription.customer);
    await provisionAccess(subscription.customer, subscription.items);
  });

  r.on('updated', async (event) => {
    const subscription = event.data.object;
    await updateAccess(subscription.customer, subscription.items);
  });

  r.on('deleted', async (event) => {
    const subscription = event.data.object;
    await revokeAccess(subscription.customer);
  });
});
```

### ファンアウトによる複数ハンドラー

```typescript
router.fanout('checkout.session.completed', [
  async (event) => {
    await fulfillOrder(event.data.object);
  },
  async (event) => {
    await sendReceipt(event.data.object.customer_email);
  },
  async (event) => {
    await trackConversion(event.data.object);
  },
], {
  strategy: 'best-effort',
  onError: (error) => console.error('Handler failed:', error),
});
```

## サポートされるイベント型

このパッケージには、253 種類以上のすべての Stripe Webhook イベントの型定義が含まれます。代表的なものは次のとおりです。

### 決済 (Payments)
- `payment_intent.*`（succeeded、payment_failed、canceled など）
- `charge.*`（succeeded、failed、refunded など）
- `payment_method.*`（attached、detached、updated など）

### サブスクリプション (Subscriptions)
- `customer.subscription.*`（created、updated、deleted など）
- `invoice.*`（created、paid、payment_failed など）
- `subscription_schedule.*`

### 顧客 (Customers)
- `customer.*`（created、updated、deleted など）
- `customer.source.*`
- `customer.tax_id.*`

### チェックアウト (Checkout)
- `checkout.session.*`（completed、async_payment_succeeded など）

### その他多数...

完全な一覧については、[Stripe API ドキュメント](https://stripe.com/docs/api/events/types)を参照してください。

## セキュリティ

### Webhook の署名検証

すべての Webhook イベントは、真正性を保証し改ざんを防ぐために、Stripe が提供する署名を使って検証する必要があります。このパッケージには、HMAC-SHA256 を使った署名検証が組み込まれています。

```typescript
import Stripe from 'stripe';
import { createStripeVerifier } from '@kotodayori/stripe';

const stripe = new Stripe(process.env.STRIPE_API_KEY!);

const verifier = createStripeVerifier(
  stripe,
  process.env.STRIPE_WEBHOOK_SECRET!
);
```

**仕組み:**
1. Stripe は各 Webhook を、Webhook エンドポイントの署名シークレットを使って署名します
2. 署名は `stripe-signature` ヘッダーに含まれます
3. 検証関数は HMAC-SHA256 を使って署名を検証します
4. 署名内のタイムスタンプが許容範囲内（デフォルト: 5 分）であることを検証します

**タイムスタンプの許容範囲:**
デフォルトのタイムスタンプ許容範囲は 300 秒（5 分）です。これにより、古い Webhook が再送されるリプレイ攻撃を防ぎます。Stripe SDK は、署名ヘッダー内のタイムスタンプがこの範囲内であることを検証します。

### リプレイ攻撃の防止

同じ Webhook イベントを複数回処理しないようにするには、Webhook イベント ID を使ってべき等性のトラッキングを実装します。

```typescript
import Stripe from 'stripe';
import { StripeWebhookRouter, createStripeVerifier } from '@kotodayori/stripe';
import { honoAdapter } from '@kotodayori/hono';
import { Hono } from 'hono';

// デモ用のインメモリストア（本番ではデータベースを使用してください）
const processedEventIds = new Set<string>();

const stripe = new Stripe(process.env.STRIPE_API_KEY!);
const router = new StripeWebhookRouter();

// 重複イベントをチェックするミドルウェアを追加する
router.use(async (event, next) => {
  if (processedEventIds.has(event.id)) {
    console.log('Duplicate event ignored:', event.id);
    return;
  }

  processedEventIds.add(event.id);
  await next();
});

router.on('payment_intent.succeeded', async (event) => {
  console.log('Processing payment:', event.data.object.id);
  // ここにビジネスロジックを記述する
});

const app = new Hono();

app.post('/webhook', honoAdapter(router, {
  verifier: createStripeVerifier(stripe, process.env.STRIPE_WEBHOOK_SECRET!),
}));

export default app;
```

**本番環境での推奨事項:**
本番アプリケーションでは、処理済みのイベント ID を TTL 付きでデータベースに保存します。これにより、アプリケーションの再起動後でもべき等性が保証されます。

```typescript
// データベースを使った例（疑似コード）
router.use(async (event, next) => {
  const exists = await db.eventLog.findUnique({
    where: { id: event.id },
  });

  if (exists) {
    console.log('Duplicate event ignored:', event.id);
    return;
  }

  // 処理前にイベントを記録する
  await db.eventLog.create({
    data: { id: event.id, timestamp: new Date() },
  });

  try {
    await next();
  } catch (error) {
    // 処理が失敗した場合は、再試行用にマークすることを検討してください
    throw error;
  }
});
```

**イベント ID の形式:**
Stripe のイベント ID は、"evt_" プレフィックスに続いて、大文字・小文字の英字と数字が混在した英数字文字列が付きます（例: `evt_1NG8Du2eZvKYlo2CUI79vXWy`）。テストモードのイベント ID は "evt_test_" プレフィックスで表示されることがあります。これらの ID は、あなたのすべての Stripe イベントにわたって一意であることが保証されています。

### エラーハンドリングと情報漏洩

Webhook 検証によるエラーメッセージが、内部の詳細をクライアントに公開することは決してあってはなりません。このパッケージは、すべての検証エラーレスポンスをサニタイズします。

```typescript
// 次のようにエラーの詳細を公開する代わりに:
// { error: "Unable to verify signature: invalid timestamp" }

// アダプターは次のように応答します:
// { error: "Verification failed" }

// 実際のエラーの詳細はサーバー側でログに記録されます:
// console.error('Webhook verification failed:', err)
```

クライアントへのレスポンスを安全に保ちつつ、デバッグのためにこれらの詳細を記録できるようにロギングを構成してください。

```typescript
// アプリケーションのロギング（本番では適切なロギングサービスを使用してください）
router.on('payment_intent.succeeded', async (event) => {
  try {
    // 決済を処理する
  } catch (error) {
    console.error('Payment processing failed for event:', event.id, error);
    throw error; // このエラーは onError ハンドラーで処理されます
  }
});
```

## 型安全性の例

ルーターは完全な IntelliSense と型チェックを提供します。

```typescript
// TypeScript は正確な型を認識します
router.on('payment_intent.succeeded', async (event) => {
  const amount = event.data.object.amount; // number
  const currency = event.data.object.currency; // string
  const status = event.data.object.status; // "succeeded"
});

// 無効なイベント名はコンパイル時に検出されます
router.on('invalid.event.name', async (event) => {
  // ❌ TypeScript エラー: "invalid.event.name" は有効な Stripe イベント型ではありません
});
```

## イベント型のメンテナンス

イベント型定義は Stripe SDK から自動生成されます。最新であるかを確認するには次を実行します。

```bash
cd packages/stripe
pnpm run check-events
```

詳細は [MAINTAINING_STRIPE_EVENTMAP.md](./MAINTAINING_STRIPE_EVENTMAP.md) を参照してください。

## 動作要件

- Node.js >= 18
- TypeScript >= 5.3
- Stripe SDK >= 17.0.0

## 関連パッケージ

- [`@kotodayori/core`](../core) - コアとなる Webhook ルーティングロジック
- [`@kotodayori/hono`](../hono) - Hono フレームワークアダプター
- [`@kotodayori/express`](../express) - Express フレームワークアダプター
- [`@kotodayori/lambda`](../lambda) - AWS Lambda アダプター
- [`@kotodayori/eventbridge`](../eventbridge) - AWS EventBridge アダプター
- [`@kotodayori/zod`](../zod) - Zod スキーマ検証ヘルパー

## ドキュメント

その他の例やガイドについては、[メインドキュメント](../../README.md)を参照してください。

## ライセンス

MIT
