[English](./README.md) | **日本語**

# @kotodayori/core

あらゆるイベントソースに対応する型安全な Webhook ルーティングフレームワーク。

## 概要

`@kotodayori/core` は、型安全な Webhook ハンドラーを構築するための基盤となるルーティングロジックを提供します。完全な TypeScript サポート、ミドルウェア機能、柔軟なルーティングパターンを備えた、フレームワーク非依存の柔軟な API を提供します。

## インストール

```bash
npm install @kotodayori/core
# または
pnpm add @kotodayori/core
# または
yarn add @kotodayori/core
```

## 特長

- **型安全なイベントルーティング**: ジェネリックなイベント型定義により、IDE の補完が完全に機能します
- **ミドルウェアサポート**: ロギングやエラーハンドリングなど、横断的な関心事を追加できます
- **柔軟なルーティング**: ハンドラーのグループ化、ネストしたルーターのマウント、ファンアウトパターンに対応します
- **プラガブルな検証**: 任意の Webhook プロバイダー向けに独自の Verifier を持ち込めます
- **フレームワーク非依存**: アダプターを介して任意の HTTP フレームワークと連携できます

## クイックスタート

### 基本的な使い方

```typescript
import { WebhookRouter, type WebhookEvent, type Verifier } from '@kotodayori/core';

// イベント型を定義する
interface MyEvent extends WebhookEvent {
  type: 'my.event';
  data: { object: { id: string; name: string } };
}

type MyEventMap = {
  'my.event': MyEvent;
};

// ルーターを作成する
const router = new WebhookRouter<MyEventMap>();

// イベントハンドラーを登録する
router.on('my.event', async (event) => {
  console.log('Event received:', event.data.object);
});

// イベントをディスパッチする
await router.dispatch({
  id: '123',
  type: 'my.event',
  data: { object: { id: '1', name: 'Test' } },
});
```

### カスタム Verifier を使う

```typescript
import crypto from 'crypto';

// GitHub Webhook 用の Verifier を作成する
function createGitHubVerifier(secret: string): Verifier {
  return (payload, headers) => {
    const signature = headers['x-hub-signature-256'];
    if (!signature) {
      throw new Error('Missing x-hub-signature-256 header');
    }

    const hmac = crypto.createHmac('sha256', secret);
    const digest = 'sha256=' + hmac.update(payload).digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))) {
      throw new Error('Invalid signature');
    }

    const body = JSON.parse(payload.toString());
    return {
      event: {
        id: headers['x-github-delivery'] ?? crypto.randomUUID(),
        type: headers['x-github-event'] ?? 'unknown',
        data: { object: body },
      },
    };
  };
}
```

## API リファレンス

### WebhookRouter

Webhook イベントを処理するためのメインのルータークラスです。

#### `on(event, handler)`

特定のイベント型に対するハンドラーを登録します。

```typescript
router.on('payment.succeeded', async (event) => {
  // 支払い成功を処理する
});

// 複数のイベントを同じハンドラーで処理する
router.on(['order.created', 'order.updated'], async (event) => {
  // 注文イベントを処理する
});
```

#### `use(middleware)`

イベントハンドラーの前に実行されるミドルウェアを登録します。

```typescript
router.use(async (event, next) => {
  console.log(`Processing ${event.type}`);
  await next();
});
```

#### `group(prefix, callback)`

共通のプレフィックスで関連するイベントハンドラーをグループ化します。

```typescript
router.group('payment', (r) => {
  r.on('succeeded', async (event) => {
    // 'payment.succeeded' を処理する
  });

  r.on('failed', async (event) => {
    // 'payment.failed' を処理する
  });
});
```

#### `route(prefix, router)`

ネストしたルーターをプレフィックスの下にマウントします。

```typescript
const paymentRouter = new WebhookRouter();
paymentRouter.on('succeeded', async (event) => { /* ... */ });
paymentRouter.on('failed', async (event) => { /* ... */ });

const mainRouter = new WebhookRouter();
mainRouter.route('payment', paymentRouter);
// paymentRouter のハンドラーは 'payment.succeeded'、'payment.failed' として利用可能になります
```

#### `fanout(event, handlers, options)`

同じイベントに対して複数のハンドラーを並列に実行します。

```typescript
router.fanout('user.created', [
  async (event) => await sendWelcomeEmail(event),
  async (event) => await createAnalyticsProfile(event),
  async (event) => await notifySlack(event),
], {
  strategy: 'best-effort', // 一部のハンドラーが失敗しても続行する
  onError: (error) => console.error('Handler failed:', error),
});
```

**戦略:**
- `all-or-nothing`（デフォルト）: すべてのハンドラーが成功する必要があり、失敗すると操作全体が失敗します
- `best-effort`: 一部のハンドラーが失敗してもハンドラーの実行を続行します

#### `dispatch(event)`

イベントを登録済みのハンドラーにディスパッチします。

```typescript
await router.dispatch({
  id: '123',
  type: 'payment.succeeded',
  data: { object: { amount: 1000 } },
});
```

### 型

#### WebhookEvent

すべての Webhook イベントの基底インターフェースです。

```typescript
interface WebhookEvent {
  id: string;
  type: string;
  data: { object: unknown };
}
```

#### EventHandler<T>

イベントを処理するためのハンドラー関数の型です。

```typescript
type EventHandler<T extends WebhookEvent> = (event: T) => Promise<void>;
```

#### Middleware<T>

横断的な関心事を扱うためのミドルウェア関数の型です。

```typescript
type Middleware<T extends WebhookEvent> = (
  event: T,
  next: () => Promise<void>
) => Promise<void>;
```

#### Verifier<T>

Webhook 署名を検証し、ペイロードを解析するための関数型です。

```typescript
type Verifier<T extends WebhookEvent> = (
  payload: string | Buffer,
  headers: Record<string, string | undefined>
) => VerifyResult<T> | Promise<VerifyResult<T>>;
```

## 応用的な使い方

### 1 つのイベントに対する複数のハンドラー

同じイベント型に対して複数のハンドラーを登録できます。

```typescript
router.on('user.created', async (event) => {
  await sendWelcomeEmail(event);
});

router.on('user.created', async (event) => {
  await createUserProfile(event);
});

router.on('user.created', async (event) => {
  await trackSignup(event);
});
// 3 つのハンドラーすべてが順番に実行されます
```

### ミドルウェアの例

#### ロギングミドルウェア

```typescript
router.use(async (event, next) => {
  const start = Date.now();
  console.log(`[${event.type}] Processing event ${event.id}`);

  await next();

  const duration = Date.now() - start;
  console.log(`[${event.type}] Completed in ${duration}ms`);
});
```

#### エラーハンドリングミドルウェア

```typescript
router.use(async (event, next) => {
  try {
    await next();
  } catch (error) {
    console.error(`Error processing ${event.type}:`, error);
    // エラートラッキングサービスに送信する
    await Sentry.captureException(error, {
      tags: { eventType: event.type, eventId: event.id },
    });
    throw error;
  }
});
```

## 既知の制限事項

### グループミドルウェアのスコープ

`group().use()` メソッドには、期待される挙動とは異なる既知の制限があります。

**現在の挙動**: `group()` 内で `.use()` を使って登録されたミドルウェアは、そのグループ内のハンドラーだけでなく、**ルーター全体**に適用されます。

```typescript
const router = new WebhookRouter();

router.use(async (event, next) => {
  console.log('Router-level middleware');
  await next();
});

router.group('payment', (group) => {
  // ⚠️ このミドルウェアは 'payment.*' だけでなく、すべてのイベントに対して実行されます
  group.use(async (event, next) => {
    console.log('Group middleware - runs for ALL events');
    await next();
  });

  group.on('succeeded', async (event) => {
    console.log('Handler executed');
  });
});

// どちらのミドルウェアも 'payment.succeeded' と 'user.created' の両方に対して実行されます
await router.dispatch({ type: 'payment.succeeded', ... });
await router.dispatch({ type: 'user.created', ... });
```

**回避策**: グループ内の特定のイベントにのみミドルウェアを適用するには、次のいずれかの方法を使用してください。

1. **ルーターミドルウェアでのイベントレベルのフィルタリング**:
```typescript
router.use(async (event, next) => {
  if (event.type.startsWith('payment.')) {
    console.log('Only for payment events');
  }
  await next();
});
```

2. **ハンドラーレベルのエラーハンドリング**:
```typescript
router.group('payment', (group) => {
  group.on('succeeded', async (event) => {
    try {
      // ハンドラーのロジック
    } catch (error) {
      console.error('Error in payment handler:', error);
      throw error;
    }
  });
});
```

3. **関心事ごとに別々のルーターを使う**:
```typescript
const paymentRouter = new WebhookRouter();
paymentRouter.use(async (event, next) => {
  console.log('Only for payment events');
  await next();
});

paymentRouter.on('succeeded', async (event) => {
  // 支払い成功を処理する
});

const mainRouter = new WebhookRouter();
mainRouter.route('payment', paymentRouter);
```

## フレームワークアダプターとの併用

`@kotodayori/core` はフレームワーク非依存です。フレームワーク固有のアダプターと組み合わせて使用します。

- [`@kotodayori/hono`](../hono) - Hono フレームワーク
- [`@kotodayori/express`](../express) - Express フレームワーク
- [`@kotodayori/lambda`](../lambda) - AWS Lambda
- [`@kotodayori/eventbridge`](../eventbridge) - AWS EventBridge

Hono を使った例:

```typescript
import { Hono } from 'hono';
import { WebhookRouter } from '@kotodayori/core';
import { honoAdapter } from '@kotodayori/hono';

const router = new WebhookRouter();
router.on('my.event', async (event) => {
  console.log('Event received');
});

const app = new Hono();
app.post('/webhook', honoAdapter(router, {
  verifier: createGitHubVerifier(process.env.GITHUB_WEBHOOK_SECRET!),
}));
```

## TypeScript のヒント

### 厳密なイベント型付け

```typescript
import type { WebhookEvent } from '@kotodayori/core';

// イベントを定義する
interface PaymentSucceededEvent extends WebhookEvent {
  type: 'payment.succeeded';
  data: {
    object: {
      id: string;
      amount: number;
      currency: string;
    };
  };
}

interface PaymentFailedEvent extends WebhookEvent {
  type: 'payment.failed';
  data: {
    object: {
      id: string;
      errorMessage: string;
    };
  };
}

// イベントマップを作成する
type EventMap = {
  'payment.succeeded': PaymentSucceededEvent;
  'payment.failed': PaymentFailedEvent;
};

// ルーターは完全な型安全性を備えています
const router = new WebhookRouter<EventMap>();

router.on('payment.succeeded', async (event) => {
  // TypeScript は event.data.object に amount や currency などがあることを認識します
  const amount = event.data.object.amount;
});
```

## 関連パッケージ

- [`@kotodayori/stripe`](../stripe) - Stripe 固有の型定義と Verifier
- [`@kotodayori/hono`](../hono) - Hono フレームワークアダプター
- [`@kotodayori/express`](../express) - Express フレームワークアダプター
- [`@kotodayori/lambda`](../lambda) - AWS Lambda アダプター
- [`@kotodayori/eventbridge`](../eventbridge) - AWS EventBridge アダプター
- [`@kotodayori/zod`](../zod) - Zod スキーマ検証ヘルパー

## ドキュメント

その他の例やガイドについては、[メインドキュメント](../../README.md)を参照してください。

## ライセンス

MIT
