---
title: インストール
description: Kotodayori と依存パッケージのインストール
---

## 前提条件

- **Node.js** >= 18
- **パッケージマネージャー**: pnpm・npm・yarn のいずれか

## ユースケース別インストール

### Stripe + Hono

```bash
pnpm add @kotodayori/stripe @kotodayori/hono stripe
```

### Stripe + Express

```bash
pnpm add @kotodayori/stripe @kotodayori/express stripe
```

### Stripe + AWS Lambda

```bash
pnpm add @kotodayori/stripe @kotodayori/lambda stripe
```

### カスタム Webhook（Stripe なし）

コアルーターと任意のアダプターを組み合わせて使用します：

```bash
pnpm add @kotodayori/core @kotodayori/hono
# または @kotodayori/express、@kotodayori/lambda
```

### Zod によるランタイムバリデーション

型安全に加えてランタイムでのスキーマ検証が必要な場合：

```bash
pnpm add @kotodayori/stripe @kotodayori/zod @kotodayori/hono stripe zod
```

## create-kotodayori でスキャフォールディング

新規プロジェクトを最速で作成するには、スキャフォールディングツールを使用します：

```bash
npx create-kotodayori
```

対話形式で、希望のフレームワークとパッケージマネージャーを選択しながら新規プロジェクトを作成できます。

オプションを直接指定することも可能です：

```bash
# Hono ベースの Webhook ハンドラーを新規作成
npx create-kotodayori my-webhook-handler --fw=hono

# カスタムパッケージマネージャーを使用
npx create-kotodayori my-webhook-handler --fw=hono --pm=pnpm
```

## ピア依存関係

- **Stripe アダプター** (`@kotodayori/stripe`): `stripe` >= 17.0.0
- **Hono アダプター** (`@kotodayori/hono`): `hono` >= 4.0.0
- **Express アダプター** (`@kotodayori/express`): `express` >= 4.0.0
- **Zod 連携** (`@kotodayori/zod`): `zod` ^4.0.0

使用するパッケージに対応したピア依存関係をインストールしてください。
