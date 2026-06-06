---
title: "@kotodayori/lambda"
description: Kotodayori の AWS Lambda（API Gateway）アダプター
---

[![npm version](https://img.shields.io/npm/v/%40kotodayori%2Flambda.svg?logo=npm&label=npm)](https://www.npmjs.com/package/@kotodayori/lambda)
[![npm downloads](https://img.shields.io/npm/dm/%40kotodayori%2Flambda.svg)](https://www.npmjs.com/package/@kotodayori/lambda)
[![license](https://img.shields.io/npm/l/%40kotodayori%2Flambda.svg)](https://www.npmjs.com/package/@kotodayori/lambda)

Lambda アダプターは、API Gateway HTTP イベント（例: API Gateway 経由の Webhook エンドポイント）に応答して Kotodayori ルーターを実行します。

## インストール

```bash
pnpm add @kotodayori/lambda
```

## 使い方

```typescript
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import Stripe from 'stripe';
import { StripeWebhookRouter, createStripeVerifier } from '@kotodayori/stripe';
import { lambdaAdapter } from '@kotodayori/lambda';

const stripe = new Stripe(process.env.STRIPE_API_KEY!);
const router = new StripeWebhookRouter();

router.on('invoice.paid', async (event) => {
  console.log('請求書支払い済み:', event.data.object.id);
});

export const handler = lambdaAdapter(router, {
  verifier: createStripeVerifier(stripe, process.env.STRIPE_WEBHOOK_SECRET!),
  onError: async (error) => console.error(error),
}) as (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;
```

## API

```typescript
function lambdaAdapter<TEventMap>(
  router: WebhookRouter<TEventMap>,
  options: {
    verifier: Verifier;
    onError?: (error: Error, event?: WebhookEvent) => Promise<void>;
  }
): Handler<APIGatewayProxyEvent, APIGatewayProxyResult>
```

アダプターは `event.body` から生のリクエストボディを読み取り（API Gateway からの base64 エンコードペイロードも処理）、`event.headers` からヘッダーを取得し、`APIGatewayProxyResult` を返します（成功: 200・検証失敗: 400・ハンドラーエラー: 500）。
