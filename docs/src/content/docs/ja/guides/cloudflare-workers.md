---
title: Cloudflare Workers
description: Hono アダプターを使って Kotodayori の Webhook ハンドラーを Cloudflare Workers にデプロイする
---

Cloudflare Workers は Webhook ハンドラーに最適なランタイムです。リクエストはエッジで処理され、コールドスタートはほぼゼロであり、[Hono アダプター](/packages/hono)とも自然に統合できます。Node.js との主な違いは、**`process.env` が存在しない**ことです。シークレットやバインディング（D1、KV、キューなど）は、グローバル変数ではなくリクエストごとに `c.env` 経由で提供されます。

このガイドでは、ルーターとハンドラーを**モジュールスコープ**（リクエストごとに再作成せず、一度だけ登録）に保ちながら、ハンドラー内でリクエストごとのバインディングにアクセスする方法を説明します。

## `wrangler.jsonc` の設定

Stripe SDK は Node.js 互換の API を必要とします。`nodejs_compat` フラグで有効化してください。このフラグは、任意で使う `contextStorage()` パターンに必要な `nodejs_als`（AsyncLocalStorage）も有効にします。

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

ハンドラーは Hono のコンテキスト `c` を**第 2 引数**で受け取ります。ルーターをモジュールスコープに置いたまま、ハンドラーの中でリクエストごとのバインディング（D1 への書き込み、Slack への送信、シークレットの読み取りなど）を使えます。ルーターにコンテキストの型を指定すると、`c.env` にも型が付きます。

```typescript
import Stripe from 'stripe';
import { Hono, type Context } from 'hono';
import { honoAdapter } from '@kotodayori/hono';
import { StripeWebhookRouter, createStripeVerifier } from '@kotodayori/stripe';

interface Bindings {
  STRIPE_API_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  SLACK_WEBHOOK_URL: string;
  DB: D1Database;
}

type AppEnv = { Bindings: Bindings };

// モジュールスコープで一度だけ登録する。`c` はリクエストごとに第 2 引数で届く
const router = new StripeWebhookRouter<Context<AppEnv>>();

router.on('checkout.session.completed', async (event, c) => {
  // D1 への書き込み
  await c.env.DB.prepare(
    'INSERT INTO orders (session_id, amount) VALUES (?, ?)'
  )
    .bind(event.data.object.id, event.data.object.amount_total)
    .run();

  // Slack への送信
  await fetch(c.env.SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: `新しい注文: ${event.data.object.id}` }),
  });
});

const app = new Hono<AppEnv>();

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

`honoAdapter` は `router.dispatch(event, c)` の形で `c` を渡し、ルーターはそれをすべてのハンドラー、`fanout()` のハンドラー、ミドルウェア（第 3 引数）に転送します。

### ハンドラーに必要なものだけを渡す：`createContext`

ハンドラーを Hono に依存させたくない場合（単体テストしやすくしたい、他のアダプターでも使い回したいなど）は、独自のコンテキスト型をルーターに指定し、`createContext` で組み立てます。ルーターのコンテキストが Hono の `Context` で満たせない型のときは、`createContext` が**型の上で必須**になるため、指定し忘れることはありません。

```typescript
interface WebhookContext {
  db: D1Database;
  slackUrl: string;
}

const router = new StripeWebhookRouter<WebhookContext>();

router.on('checkout.session.completed', async (event, { db }) => {
  await db.prepare('INSERT INTO orders (session_id) VALUES (?)')
    .bind(event.data.object.id)
    .run();
});

app.post('/webhook', (c) => {
  const stripe = new Stripe(c.env.STRIPE_API_KEY, {
    httpClient: Stripe.createFetchHttpClient(),
  });
  return honoAdapter(router, {
    verifier: createStripeVerifier(stripe, c.env.STRIPE_WEBHOOK_SECRET),
    createContext: () => ({ db: c.env.DB, slackUrl: c.env.SLACK_WEBHOOK_URL }),
  })(c);
});
```

`createContext` は非同期関数でも構いません。例外を投げた場合、アダプターはハンドラーのエラーと同じく 500 を返し、`onError` を呼び出します。

### 代替：Hono の `contextStorage()` + `getContext()`

ハンドラー自身ではなく、ハンドラーから深く呼ばれるコードでコンテキストが必要な場合は、Hono の `contextStorage()` ミドルウェア（AsyncLocalStorage を利用）が使えます。各リクエストの間、現在の `Context` を保持し、そのリクエスト中であればどこからでも `getContext()` で取得できます。Webhook ルートより前に `app.use(contextStorage())` を登録し、`getContext<AppEnv>()` を呼び出してください。`getContext()` の型引数はルーターから推論されるのではなく、呼び出し側が指定するものである点に注意してください。`nodejs_compat`（または `nodejs_als`）互換フラグが必要です。

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
- **`nodejs_compat` を忘れないこと。** Stripe SDK は Node.js 互換 API を必要とします。`wrangler.jsonc` に `"compatibility_flags": ["nodejs_compat"]` がないとランタイムエラーになります。このフラグは、Hono の `contextStorage()` を使う場合に必要な `nodejs_als` フラグも有効にします。
- **モジュールスコープで Stripe クライアントを構築しないこと。** `c.env` はリクエストコンテキスト内でのみ存在します。`new Stripe(c.env.STRIPE_API_KEY, ...)` はルートハンドラー内で構築してください。
