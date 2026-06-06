---
title: Cloudflare Workers
description: Hono アダプターを使って Kotodayori の Webhook ハンドラーを Cloudflare Workers にデプロイする
---

Cloudflare Workers は Webhook ハンドラーに最適なランタイムです。リクエストはエッジで処理され、コールドスタートはほぼゼロであり、[Hono アダプター](/packages/hono)とも自然に統合できます。Node.js との主な違いは、**`process.env` が存在しない**ことです。シークレットやバインディング（D1、KV、キューなど）は、グローバル変数ではなくリクエストごとに `c.env` 経由で提供されます。

このガイドでは、ルーターとハンドラーを**モジュールスコープ**（リクエストごとに再作成せず、一度だけ登録）に保ちながら、ハンドラー内でリクエストごとのバインディングにアクセスする方法を説明します。

## `wrangler.jsonc` の設定

Stripe SDK は Node.js 互換の API を必要とします。`nodejs_compat` フラグで有効化してください。このフラグは後述の `contextStorage()` パターンで使用される `nodejs_als`（AsyncLocalStorage）も有効にします。

```jsonc
{
  "name": "my-worker",
  "main": "src/index.ts",
  "compatibility_date": "2024-11-01",
  "compatibility_flags": ["nodejs_compat"]
}
```

### シークレットの管理

本番環境では Wrangler CLI でシークレットを設定し、ローカル開発では `.dev.vars` ファイルを使用します。

```bash
# 本番環境（シークレットごとに1回実行）
wrangler secret put STRIPE_API_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET
```

```bash
# .dev.vars  (gitignore に追加すること — ローカル専用)
STRIPE_API_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
```

TypeScript でバインディングを型定義しておくと型チェックが効きます。

```typescript
interface Bindings {
  STRIPE_API_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  SLACK_WEBHOOK_URL: string;
  DB: D1Database;
}
```

## 基本セットアップ：モジュールスコープのルーターとリクエストごとの Stripe クライアント

Workers では、デフォルトの Node.js HTTP アダプターが利用できないため、Stripe クライアントは `fetch` ベースの HTTP クライアントを**必ず**使用してください。`c.env` にアクセスできるルートハンドラー内でクライアントを構築します。

```typescript
import Stripe from 'stripe';
import { Hono } from 'hono';
import { honoAdapter } from '@kotodayori/hono';
import { StripeWebhookRouter, createStripeVerifier } from '@kotodayori/stripe';

interface Bindings {
  STRIPE_API_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
}

// ルーターとハンドラーをモジュールスコープに一度だけ登録する。
// ルーター自体はシークレットを保持しない — イベントとハンドラーのマップのみ。
const router = new StripeWebhookRouter();

router.on('payment_intent.succeeded', async (event) => {
  const paymentIntent = event.data.object;
  console.log('支払い成功:', paymentIntent.id);
});

router.on('customer.subscription.deleted', async (event) => {
  const subscription = event.data.object;
  console.log('サブスクリプションキャンセル:', subscription.id);
});

// Hono アプリを構築する。
const app = new Hono<{ Bindings: Bindings }>();

app.post('/webhook', (c) => {
  // このリクエストコンテキストの env を使って、リクエストごとに Stripe クライアントを構築する。
  // Workers では Node.js HTTP アダプターがないため Stripe.createFetchHttpClient() が必須。
  const stripe = new Stripe(c.env.STRIPE_API_KEY, {
    httpClient: Stripe.createFetchHttpClient(),
  });

  // createStripeVerifier は内部で constructEventAsync() を使用する。
  // Workers の Web Crypto SubtleCryptoProvider は非同期検証のみサポートするため必須。
  // @kotodayori/stripe 1.1.0 以降、エッジ環境でそのまま動作する。
  return honoAdapter(router, {
    verifier: createStripeVerifier(stripe, c.env.STRIPE_WEBHOOK_SECRET),
  })(c);
});

export default app;
```

> **注意:** Workers ではモジュールスコープで `new Stripe(...)` を呼び出してはいけません。モジュール初期化時点ではリクエストコンテキストが存在しないため、`c.env` にアクセスできません。Stripe クライアントはルートハンドラー内で構築してください。

## ハンドラー内での `env` へのアクセス

Kotodayori のハンドラーが受け取るのは `event` のみです。`c` パラメーターはありません。ハンドラーがバインディング（D1 への書き込み、Slack への送信、シークレットの読み取りなど）にアクセスする必要がある場合、以下の 2 つの方法があります。

### 推奨：Hono の `contextStorage()` + `getContext()`

Hono が提供する `contextStorage()` ミドルウェアは、AsyncLocalStorage をバックエンドとして、各リクエストのライフタイム中に現在の `Context` を保持します。そのリクエスト中に実行されるコード（Kotodayori のハンドラーを含む）は、`c` を引き回すことなく `getContext()` を呼び出してコンテキストを取得できます。

```typescript
import Stripe from 'stripe';
import { Hono } from 'hono';
import { contextStorage, getContext } from 'hono/context-storage';
import { honoAdapter } from '@kotodayori/hono';
import { StripeWebhookRouter, createStripeVerifier } from '@kotodayori/stripe';

interface Bindings {
  STRIPE_API_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  SLACK_WEBHOOK_URL: string;
  DB: D1Database;
}

type AppContext = { Bindings: Bindings };

const router = new StripeWebhookRouter();

router.on('checkout.session.completed', async (event) => {
  // getContext() は contextStorage() が保持する Hono コンテキストを取得する。
  // このハンドラーに `c` を渡す必要はない。
  const { env } = getContext<AppContext>();

  // D1 への書き込み
  await env.DB.prepare(
    'INSERT INTO orders (session_id, amount) VALUES (?, ?)'
  )
    .bind(event.data.object.id, event.data.object.amount_total)
    .run();

  // Slack への送信
  await fetch(env.SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: `新しい注文: ${event.data.object.id}` }),
  });
});

const app = new Hono<AppContext>();

// Webhook ルートの前に contextStorage() を登録することで、
// ハンドラー実行中に getContext() が使用可能になる。
app.use(contextStorage());

app.post('/webhook', (c) => {
  const stripe = new Stripe(c.env.STRIPE_API_KEY, {
    httpClient: Stripe.createFetchHttpClient(),
  });
  return honoAdapter(router, {
    verifier: createStripeVerifier(stripe, c.env.STRIPE_WEBHOOK_SECRET),
  })(c);
});

export default app;
```

`contextStorage()` は AsyncLocalStorage を必要とします。Stripe SDK のために既に追加した `nodejs_compat`（または `nodejs_als`）互換フラグで有効になっています。このパターンはすべての Hono デプロイターゲット（Workers、Node.js、Bun、Deno）に移植可能です。

### 代替：`cloudflare:workers` の env インポート

Workers は `cloudflare:workers` 仮想モジュール経由でモジュールレベルの `env` バインディングを提供します。Hono を使わずに Workers ネイティブのアプローチを好む場合に利用できます。

```typescript
import { env } from 'cloudflare:workers';
import { StripeWebhookRouter } from '@kotodayori/stripe';

const router = new StripeWebhookRouter();

router.on('checkout.session.completed', async (event) => {
  // env はモジュールレベルで利用可能なリクエストごとのバインディングオブジェクト。
  await fetch(env.SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: `新しい注文: ${event.data.object.id}` }),
  });
});
```

これには最新の `compatibility_date` が必要です。Wrangler の互換日と [Cloudflare 互換フラグのドキュメント](https://developers.cloudflare.com/workers/configuration/compatibility-dates/) でサポートを確認してください。このアプローチは Workers 専用であり、Node.js、Express、Lambda には移植できません。

### `hono/adapter` の `env(c)` が使えない理由

Hono の `hono/adapter` が提供する `env(c)` ヘルパーは、`Context` オブジェクト（`c`）を受け取りプラットフォーム固有の環境変数を返すラッパーです。Kotodayori のハンドラーは `event` のみを受け取り `c` は受け取らないため、ハンドラー内で `env(c)` を使用することはできません。代わりに `hono/context-storage` の `getContext()` を使用してください。

## ローカル開発とテスト

`wrangler dev` でワーカーをローカル起動します。Wrangler は `.dev.vars` を自動的に読み込みます。

```bash
wrangler dev
```

Stripe CLI を使って実際の Stripe テストイベントをローカルサーバーに転送します。

```bash
stripe listen --forward-to localhost:8787/webhook
```

Stripe CLI はウェブフック署名シークレット（`whsec_` で始まる文字列）を出力します。それを `STRIPE_WEBHOOK_SECRET` として `.dev.vars` に追記して `wrangler dev` を再起動してください。テストイベントを発火してフロー全体を確認します。

```bash
stripe trigger payment_intent.succeeded
```

## よくある落とし穴

- **リクエストごとにルーターを再作成しないこと。** ルーターが保持するのはハンドラー登録のみです。モジュールスコープで一度だけ作成するのが正しい使い方です。リクエストごとに新しいルーターを作成するとメモリを無駄に消費し、ハンドラーのセットアップも毎回やり直しになります。
- **署名検証を自前で実装しないこと。** `@kotodayori/stripe` の `createStripeVerifier` は Workers の非同期 Web Crypto 要件を自動的に処理します。詳細は [Stripe Webhooks ガイド](/guides/stripe-webhooks) を参照してください。
- **`nodejs_compat` を忘れないこと。** Stripe SDK は Node.js 互換 API を必要とします。`wrangler.jsonc` に `"compatibility_flags": ["nodejs_compat"]` がないとランタイムエラーになります。このフラグは Hono の `contextStorage()` が必要とする `nodejs_als` フラグも有効にします。
- **モジュールスコープで Stripe クライアントを構築しないこと。** `c.env` はリクエストコンテキスト内でのみ存在します。`new Stripe(c.env.STRIPE_API_KEY, ...)` はルートハンドラー内で構築してください。
