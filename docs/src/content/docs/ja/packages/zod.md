---
title: "@kotodayori/zod"
description: ランタイムバリデーション用の Zod スキーマヘルパー
---

[![npm version](https://img.shields.io/npm/v/%40kotodayori%2Fzod.svg?logo=npm&label=npm)](https://www.npmjs.com/package/@kotodayori/zod)
[![npm downloads](https://img.shields.io/npm/dm/%40kotodayori%2Fzod.svg)](https://www.npmjs.com/package/@kotodayori/zod)
[![license](https://img.shields.io/npm/l/%40kotodayori%2Fzod.svg)](https://www.npmjs.com/package/@kotodayori/zod)

Zod パッケージは、Kotodayori の型安全なルーティングにランタイムスキーマ検証を追加します。外部または信頼性の低いソースからの Webhook ペイロードをランタイムで検証する必要がある場合に使用してください。

## インストール

```bash
pnpm add @kotodayori/zod zod
```

**ピア依存関係**: `zod` ^4.0.0

## 主なエクスポート

| エクスポート | 説明 |
|--------|-------------|
| `baseEventSchema` | Webhook イベントのベース Zod スキーマ |
| `createEventSchema(type, dataObjectSchema)` | 型付きイベントスキーマの作成 |
| `defineEvent(type, dataObjectSchema)` | イベントマップ用のイベントスキーマ定義 |
| `SchemaRegistry<TEventMap>` | ランタイムスキーマレジストリ |
| `withValidation(registry, options)` | ランタイム検証用ミドルウェア |
| `createZodVerifier(options)` | 署名検証後に Zod 検証を行う Verifier ラッパー |
| `WebhookValidationError` | バリデーション失敗時のカスタムエラー |
| `UnknownEventTypeError` | 未登録のイベント型に対するエラー |

## 基本的な使い方

`defineEvent` でイベントスキーマを定義し、`SchemaRegistry` に登録して、`withValidation` ミドルウェアを使用します：

```typescript
import { defineEvent, SchemaRegistry, withValidation } from '@kotodayori/zod';
import { z } from 'zod';

const issueOpened = defineEvent('issue.opened', z.object({
  id: z.number(),
  title: z.string(),
}));

const registry = new SchemaRegistry().registerAll({ issueOpened });

const router = new WebhookRouter<...>();
router.use(withValidation(registry));
```

## Verifier ラッパー

`createZodVerifier` を使用すると、検証時に Zod バリデーションを実行することもできます。既存の Verifier をラップし、パースされたイベントを返す前に Zod 検証を実行します。

## 未知のイベント

未知のイベント型の処理方法を設定できます（例: 拒否するか、ジェネリックな形式で許可するか）。詳細はパッケージの API とテストを参照してください。
