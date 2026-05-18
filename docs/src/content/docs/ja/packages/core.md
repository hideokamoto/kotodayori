---
title: "@kotodayori/core"
description: フレームワーク非依存の Webhook ルーティングエンジン
---

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
