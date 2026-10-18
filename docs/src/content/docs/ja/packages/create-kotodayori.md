---
title: create-kotodayori
description: 新規 Kotodayori プロジェクト用スキャフォールディングツール
---

[![npm version](https://img.shields.io/npm/v/create-kotodayori.svg?logo=npm&label=npm)](https://www.npmjs.com/package/create-kotodayori)
[![npm downloads](https://img.shields.io/npm/dm/create-kotodayori.svg)](https://www.npmjs.com/package/create-kotodayori)
[![license](https://img.shields.io/npm/l/create-kotodayori.svg)](https://www.npmjs.com/package/create-kotodayori)

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
| `--framework <framework>` | `--fw` | `hono`・`express`・`lambda`・`eventbridge`。それ以外の値はファイルを書き出す前にエラーになります |
| `--package-manager <pm>` | `--pm` | `pnpm`・`npm`・`yarn`・`bun`。`<pm> install` の実行と、表示される次の手順に使われます |
| `--skip-install` | — | `<pm> install` を実行しません。確認なしでインストールさせるには `--no-skip-install` を渡します |
| `--skill <agents>` | — | `kotodayori-webhooks` エージェントスキルをプロジェクトにコピーします。`claude-code`（別名 `claude`）・`cursor`・`all`・`none` をカンマ区切りで指定。知らない名前は無視されます |
| `--no-skill` | — | `--skill none` と同じ |
| `--help` | `-h` | ヘルプを表示して終了 |
| `--version` | `-v` | バージョンを表示して終了 |

- オプションで渡さなかった値は対話形式で尋ねられます。対話なしで実行するには（CI や AI エージェントから使う場合など）、プロジェクト名・`--fw`・`--pm`・`--skip-install` か `--no-skip-install`・`--skill` か `--no-skill` をすべて渡してください。
- `[project-name]` はカレントディレクトリからのパスとして解決されます。そのディレクトリが既にあり空でない場合は、何も書き出さずに終了コード 1 で終わります。
- ドライランモードはありません。未定義のオプションはエラーになります。

## 動作要件

- Node.js >= 20.19.0（パッケージの `engines`。依存している CLI ライブラリ `cac` 7 も同じ下限を宣言しています）
- pnpm・npm・yarn・bun のいずれか

## エージェントスキル

`--skill` を指定すると、新しいプロジェクト内の `.claude/skills/kotodayori-webhooks/`（Claude Code）や `.cursor/skills/kotodayori-webhooks/`（Cursor）に `SKILL.md` を書き出します。

## この CLI 用のエージェントスキル

リポジトリでは、AI コーディングエージェントがこの CLI を対話なしで実行し、本番の生成前に出力をプレビューし、npm や Stripe に触れるコマンドの前に確認を取るための `create-kotodayori` スキルも配布しています。[`skills` CLI](https://www.npmjs.com/package/skills) でインストールできます。

```bash
npx skills add hideokamoto/kotodayori --skill create-kotodayori
```

このサイトでもリポジトリと同じスキルファイルを配信しています。[`/skill.md`](/skill.md) が `create-kotodayori` スキル、各スキルは `/.well-known/agent-skills/<name>/SKILL.md`、一覧と SHA-256 ダイジェストは [`/.well-known/agent-skills/index.json`](/.well-known/agent-skills/index.json) にあります。[`/llms.txt`](/llms.txt) からもリンクしています。

スキルは CLI と同じリポジトリで管理しています。CLI のオプションや要件を変えるときは同じ PR で [`skills/create-kotodayori/SKILL.md`](https://github.com/hideokamoto/kotodayori/blob/main/skills/create-kotodayori/SKILL.md) も更新し、両者がずれるとテストが失敗します。

## 対応フレームワーク

フレームワークごとにテンプレート（`hono`・`express`・`lambda`・`eventbridge`）があり、どれから生成したプロジェクトもそのままインストール・型チェック・ビルドが通ります。

- **Hono** — Webhook ルートとサンプルハンドラーを含む Hono アプリ
- **Express** — Webhook ルートで `express.raw()` を使う Express アプリ
- **Lambda** — AWS Lambda の HTTP ハンドラー（Lambda 関数 URL または API Gateway）
- **EventBridge** — Amazon EventBridge 経由で届く Stripe イベント用の AWS Lambda ハンドラー

## 生成される構成（Hono の場合）

Hono テンプレートには以下が含まれます：

- Webhook ルートを持つメインアプリ
- 支払いとサブスクリプションイベントのサンプルハンドラー
- ロギングミドルウェア
- TypeScript・tsup・開発サーバーのセットアップ
- `.env.example` とテンプレート変数を含む README

必要に応じてハンドラーをカスタマイズし、イベントを追加してください。
