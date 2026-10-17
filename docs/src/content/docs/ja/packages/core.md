---
title: "@kotodayori/core"
description: フレームワーク非依存の Webhook ルーティングエンジン
---

[![npm version](https://img.shields.io/npm/v/%40kotodayori%2Fcore.svg?logo=npm&label=npm)](https://www.npmjs.com/package/@kotodayori/core)
[![npm downloads](https://img.shields.io/npm/dm/%40kotodayori%2Fcore.svg)](https://www.npmjs.com/package/@kotodayori/core)
[![license](https://img.shields.io/npm/l/%40kotodayori%2Fcore.svg)](https://www.npmjs.com/package/@kotodayori/core)

コアパッケージは、フレームワーク依存ゼロの Webhook ルーティングエンジンを提供します。すべてのアダプター（Hono・Express・Lambda・EventBridge）はこのパッケージの上に構築されています。

## インストール

```bash
pnpm add @kotodayori/core
```

## 主なエクスポート

| エクスポート | 説明 |
|--------|-------------|
| `WebhookRouter<TEventMap>` | ジェネリクスによるイベント型サポートを持つベースルータークラス |
| `WebhookEvent` | ベースイベントインターフェース |
| `Verifier` | 署名検証関数の型 |
| `HandlerFunction<TEvent>` | イベントハンドラー関数の型 |
| `MiddlewareFunction` | ミドルウェア関数の型 |

## 主なメソッド

```typescript
class WebhookRouter<TEventMap extends Record<string, WebhookEvent>> {
  on(event: string | string[], handler: HandlerFunction): this
  use(middleware: MiddlewareFunction): this
  group(prefix: string, callback: (router: this) => void): this
  route(prefix: string, router: WebhookRouter): this
  fanout(event: string, handlers: HandlerFunction[], options?: FanoutOptions): this
  dispatch(event: WebhookEvent): Promise<void>
}
```

## イベント型マップ

カスタムイベントでコアルーターを使用する場合、イベント型文字列をイベントインターフェースにマッピングする型マップを定義します：

```typescript
import { WebhookRouter, type WebhookEvent } from '@kotodayori/core';

interface MyEvent extends WebhookEvent {
  type: 'my.event';
  data: { object: { id: string } };
}

type MyEventMap = {
  'my.event': MyEvent;
};

const router = new WebhookRouter<MyEventMap>();
router.on('my.event', async (event) => {
  // event は MyEvent として型付けされる
  console.log(event.data.object.id);
});
```

## ファンアウト戦略

`fanout()` で複数のハンドラーを並列実行する場合：

- **`all-or-nothing`**（デフォルト）— すべてのハンドラーが成功する必要があります。`Promise.all` を使用。
- **`best-effort`** — 一部のハンドラーが失敗しても継続します。`Promise.allSettled` を使用。

## ミドルウェア

ミドルウェアは登録順に実行されます。チェーンは適切なネストのために逆順で構築され、`next()` でフローを制御します：

```typescript
router.use(async (event, next) => {
  console.log(`${event.type} を処理中`);
  await next();
  console.log(`${event.type} 完了`);
});
```

詳細なパターンは[ミドルウェア](/ja/guides/middleware/)を参照してください。

## カスタム Verifier の `Uint8Array` 対応（次のメジャーリリースでの破壊的変更）

`Verifier` の `payload` 型は `string | Buffer` から `string | Uint8Array` に変わりました。公開型が `@types/node` に依存しなくなり、Cloudflare Workers や Deno でも型が解決できます。Node.js の `Buffer` は `Uint8Array` のサブクラスなので、Express や Lambda の実行時の動作は変わりません。自作の Verifier では次の 2 点を確認してください。

1. **型注釈。** `(payload: string | Buffer, headers) => ...` と書いた関数は、引数の反変性により `Verifier` に代入できなくなります。注釈を外して `Verifier` から推論させるか、`string | Uint8Array` と書いてください。
2. **`payload.toString()` / `payload.toString('utf8')`。** 素の `Uint8Array` に対する `toString()` は本文ではなく `"123,34,105,100"` のようなカンマ区切りの数値列を返し、`toString('utf8')` は型エラーになります。明示的にデコードしてください。

```typescript
// 変更前
const body = JSON.parse(payload.toString());

// 変更後: string・Uint8Array・Buffer のどれでも、どのランタイムでも動作します
const text = typeof payload === 'string' ? payload : new TextDecoder().decode(payload);
const body = JSON.parse(text);
```

署名検証は、デコードして再シリアライズした文字列ではなく、生の `payload` に対して行ってください（Web Crypto も `node:crypto` の HMAC も `Uint8Array` を受け取れます）。`createStripeVerifier` は変更不要です。
