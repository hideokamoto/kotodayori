---
title: クイックスタート（create-kotodayori）
description: create-kotodayori でゼロから新規 Kotodayori プロジェクトをセットアップ
---

ゼロから最速で始めるには、スキャフォールディングツール `create-kotodayori` を使います。選んだフレームワーク・サンプルハンドラー・開発環境がそろった、すぐ動くプロジェクトを生成します。

すでにあるアプリに Kotodayori を組み込みたい場合は、[既存アプリへの追加](/ja/getting-started/add-to-existing-app/) を参照してください。

## 前提条件

- **Node.js** >= 18
- **パッケージマネージャー**: pnpm・npm・yarn・bun のいずれか

## プロジェクトを生成する

ツールを実行し、対話形式でフレームワークとパッケージマネージャーを選択します：

```bash
npx create-kotodayori
```

オプションを直接指定して、対話をスキップすることもできます：

```bash
# Hono ベースの Webhook ハンドラーを新規作成
npx create-kotodayori my-webhook-handler --fw=hono

# パッケージマネージャーを指定
npx create-kotodayori my-webhook-handler --fw=hono --pm=pnpm
```

### オプション

| オプション | 短縮形 | 説明 |
|--------|-------|-------------|
| `--framework` | `--fw` | フレームワーク: `hono`・`express`・`lambda`・`eventbridge` |
| `--package-manager` | `--pm` | パッケージマネージャー: `pnpm`・`npm`・`yarn`・`bun` |
| `--skip-install` | — | 生成後の依存インストールをスキップ |

## 生成される内容（Hono）

Hono テンプレートには次が含まれます：

- Webhook ルートが結線済みの Hono アプリ
- 支払い・サブスクリプションイベント向けのサンプルハンドラー
- ロギングミドルウェア
- TypeScript・tsup・開発サーバーのセットアップ
- `.env.example` とテンプレート変数を記載した README

> **その他のフレームワーク**: Express・Lambda・EventBridge のテンプレートは近日対応予定です。現時点では Hono で生成するか、[既存アプリへの追加](/ja/getting-started/add-to-existing-app/) を参照してください。

## プロジェクトを実行する

生成が完了したら、開発サーバーを起動します：

```bash
cd my-webhook-handler
cp .env.example .env   # STRIPE_API_KEY と STRIPE_WEBHOOK_SECRET を設定
pnpm dev
```

あとは必要に応じてハンドラーをカスタマイズし、イベントを追加してください。

## 次のステップ

- [Stripe Webhooks](/ja/guides/stripe-webhooks/) — 型安全な Stripe Webhook のセットアップ
- [カスタム Webhook](/ja/guides/custom-webhooks/) — Kotodayori をあらゆる Webhook プロバイダーで使用
- [create-kotodayori](/ja/packages/create-kotodayori/) — CLI の詳細リファレンス
