---
title: ミドルウェア
description: ミドルウェアで横断的な処理を追加する
---

ミドルウェアは、ハンドラーの前後にあらゆるイベントに対して実行されます。ロギング・タイミング計測・エラーハンドリングなどの横断的な処理に使用します。

## 基本的な使い方

`use()` でミドルウェアを登録します。`next()` を呼び出すことで、次のミドルウェアまたはハンドラーに処理が移ります。実行順序は登録順に従い、チェーンは正しいネストのために逆順で構築されます。

```typescript
router.use(async (event, next) => {
  console.log(`[${event.type}] 開始`);
  const start = Date.now();

  await next();

  const duration = Date.now() - start;
  console.log(`[${event.type}] 完了 (${duration}ms)`);
});
```

## 短絡評価

`next()` を呼び出さない場合、ハンドラーとそれ以降のミドルウェアは実行されません。早期リターン（例: フィルタリングや認証）に活用できます：

```typescript
router.use(async (event, next) => {
  if (event.type.startsWith('customer.')) {
    await next();
  }
  // 他のイベントは無視される
});
```

## エラーハンドリング

`next()` を try/catch でラップすることで、ハンドラーや下流ミドルウェアのエラーを処理できます：

```typescript
router.use(async (event, next) => {
  try {
    await next();
  } catch (error) {
    console.error(`${event.type} の処理中にエラー:`, error);
    throw error; // アダプターに 500 を返させる場合は再スロー
  }
});
```

## 複数のミドルウェア

ミドルウェアは登録順に実行されます。「前処理」は上から下へ、「後処理」は下から上へ実行されます：

```typescript
router.use(loggingMiddleware);
router.use(timingMiddleware);
router.on('payment_intent.succeeded', handler);

// 実行順: logging（前）→ timing（前）→ handler
//      → timing（後）→ logging（後）
```

## バリデーションとの組み合わせ

`@kotodayori/zod` を使用する場合、`withValidation(registry)` をミドルウェアとして追加することで、イベントがハンドラーに渡る前に検証されます。パイプラインの任意の位置（例: ロギングの後、ハンドラーの前）に配置できます。

```typescript
import { SchemaRegistry, withValidation } from '@kotodayori/zod';

const registry = new SchemaRegistry();
// registry にイベントスキーマを登録...

router.use(loggingMiddleware);
router.use(withValidation(registry));
router.on('payment_intent.succeeded', handler);
```
