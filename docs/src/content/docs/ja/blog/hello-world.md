---
title: Hello, Kotodayori Blog!
date: 2026-06-18
authors:
  - hideokamoto
tags:
  - announcement
excerpt: Kotodayori のブログを開設しました。ライブラリのアップデートや使い方のヒントを発信していきます。
---

Kotodayori のブログへようこそ！

このブログでは、ライブラリのリリース情報・使い方のヒント・開発の裏側などを発信していきます。

## Kotodayori とは

Kotodayori は、Hono にインスパイアされた TypeScript 向けの型安全な Webhook ルーティングライブラリです。
Stripe・AWS EventBridge など、さまざまなプロバイダーの Webhook を統一的なインターフェースで処理できます。

```ts
import { KotodayoriApp } from '@kotodayori/stripe';

const app = new KotodayoriApp();

app.on('customer.subscription.created', async (event) => {
  console.log('New subscription:', event.data.object.id);
});
```

これから定期的に情報を発信していきますので、よろしくお願いします！
