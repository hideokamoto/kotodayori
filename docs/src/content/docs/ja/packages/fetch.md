---
title: "@kotodayori/fetch"
description: Kotodayori の Web 標準 fetch（Request/Response）アダプター
---

[![npm version](https://img.shields.io/npm/v/%40kotodayori%2Ffetch.svg?logo=npm&label=npm)](https://www.npmjs.com/package/@kotodayori/fetch)
[![license](https://img.shields.io/npm/l/%40kotodayori%2Ffetch.svg)](https://www.npmjs.com/package/@kotodayori/fetch)

fetch アダプターは、Kotodayori ルーターを `(request: Request) => Promise<Response>` の関数に変換します。Web 標準の `Request` を渡してくれる実行環境・フレームワークであれば、専用アダプターなしで使えます。Hono を使わない Cloudflare Workers、Bun、Deno、Next.js App Router、React Router v7 / Remix、`export default async (req: Request, context: Context) => ...` 形式で書いた Netlify Functions が対象です。

Node 形式の `(req, res)` を受け取るハンドラー（Express、Next.js Pages Router の `pages/api`）には対応していません。

## インストール

```bash
pnpm add @kotodayori/fetch
# 以下の Stripe の例には次も必要です:
pnpm add @kotodayori/stripe stripe
```

## 使い方

実行環境が提供するシークレットからハンドラーを作ります。Cloudflare Workers ではシークレットが `fetch` の `env` バインディングとして渡されるため、リクエストごとにハンドラーを作ります。それ以外の環境では `process.env` を使えます。

```typescript
import Stripe from 'stripe';
import { StripeWebhookRouter, createStripeVerifier } from '@kotodayori/stripe';
import { fetchAdapter } from '@kotodayori/fetch';

const router = new StripeWebhookRouter();

router.on('payment_intent.succeeded', async (event) => {
  console.log('支払い成功:', event.data.object.id);
});

export const createHandler = (apiKey: string, webhookSecret: string) =>
  fetchAdapter(router, {
    verifier: createStripeVerifier(new Stripe(apiKey), webhookSecret),
  });
```

### Cloudflare Workers

シークレットは `process.env` ではなく `env` バインディングから読みます（`wrangler secret put` で設定します）:

```typescript
export default {
  fetch: (request: Request, env: { STRIPE_API_KEY: string; STRIPE_WEBHOOK_SECRET: string }) =>
    createHandler(env.STRIPE_API_KEY, env.STRIPE_WEBHOOK_SECRET)(request),
};
```

### Bun / Deno

```typescript
const handle = createHandler(process.env.STRIPE_API_KEY!, process.env.STRIPE_WEBHOOK_SECRET!);

export default { fetch: handle };
```

### Next.js App Router

```typescript
export const POST = createHandler(process.env.STRIPE_API_KEY!, process.env.STRIPE_WEBHOOK_SECRET!);
```

### React Router v7 / Remix

```typescript
export const action = ({ request }: { request: Request }) =>
  createHandler(process.env.STRIPE_API_KEY!, process.env.STRIPE_WEBHOOK_SECRET!)(request);
```

## API

```typescript
function fetchAdapter<TEvent extends WebhookEvent>(
  router: WebhookDispatcher<TEvent>,
  options: {
    verifier: Verifier<TEvent>;
    onError?: (error: Error, event: TEvent) => Promise<void> | void;
  }
): (request: Request) => Promise<Response>
```

- **verifier** — 必須。リクエストを検証してイベントを返します（例: `createStripeVerifier`）。
- **onError** — オプション。ハンドラーがエラーをスローした場合に呼び出されます。

アダプターは生のリクエストボディを `request.text()` で取得し（署名検証に必要）、JSON の `Response` を返します（成功: 200・本文が空または検証失敗: 400・ハンドラーエラー: 500・POST 以外のメソッド: 405 と `Allow: POST`）。
