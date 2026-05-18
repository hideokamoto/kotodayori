---
title: create-kotodayori
description: 新規 Kotodayori プロジェクト用スキャフォールディングツール
---

`create-kotodayori` は、選択したフレームワークとパッケージマネージャーで新規 Kotodayori プロジェクトをスキャフォールドする CLI ツールです。

## 使い方

```bash
npx create-kotodayori
```

オプションを指定する場合：

```bash
npx create-kotodayori my-webhook-handler --fw=hono --pm=pnpm
```

## オプション

| オプション | 短縮形 | 説明 |
|--------|-------|-------------|
| `--framework` | `--fw` | フレームワーク: `hono`・`express`・`lambda`・`eventbridge` |
| `--package-manager` | `--pm` | パッケージマネージャー: `pnpm`・`npm`・`yarn`・`bun` |
| `--skip-install` | — | スキャフォールド後の依存関係インストールをスキップ |

## 対応フレームワーク

- **Hono** — 完全対応。Webhook ルートとサンプルハンドラーを含む Hono アプリを生成
- **Express** — 近日公開予定
- **Lambda** — 近日公開予定
- **EventBridge** — 近日公開予定

## 生成される構成（Hono の場合）

Hono テンプレートには以下が含まれます：

- Webhook ルートを持つメインアプリ
- 支払いとサブスクリプションイベントのサンプルハンドラー
- ロギングミドルウェア
- TypeScript・tsup・開発サーバーのセットアップ
- `.env.example` とテンプレート変数を含む README

必要に応じてハンドラーをカスタマイズし、イベントを追加してください。
