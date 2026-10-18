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
| `--framework <framework>` | `--fw` | フレームワーク: `hono`・`express`・`lambda`・`eventbridge` |
| `--package-manager <pm>` | `--pm` | パッケージマネージャー: `pnpm`・`npm`・`yarn`・`bun`。`<pm> install` の実行と、最後に表示する次の手順に使われます |
| `--skip-install` | — | ファイル生成後に `<pm> install` を実行しない |
| `--skill <agents>` | — | `kotodayori-webhooks` エージェントスキルを書き出す対象。`claude-code`（別名 `claude`）・`cursor`・`all`・`none` をカンマ区切りで指定。未知の名前は無視され、有効な名前が残らなければスキルは書き出されません |
| `--no-skill` | — | エージェントスキルを書き出さない（質問もしない） |
| `--help` | `-h` | ヘルプを表示して終了 |
| `--version` | `-v` | バージョンを表示して終了 |

動作:

- コマンドラインで指定しなかった項目（プロジェクト名・フレームワーク・パッケージマネージャー・インストール有無・エージェントスキル）は対話形式で質問されます。
- ファイルはカレントディレクトリ基準の `<project-name>` に書き出されます。存在しないか、空のディレクトリである必要があります。
- `--framework` / `--package-manager` に未対応の値を渡すと、何も書き出さずにエラー終了します。
- エージェントスキルは `.claude/skills/kotodayori-webhooks/SKILL.md`（Claude Code）や `.cursor/skills/kotodayori-webhooks/SKILL.md`（Cursor）に書き出されます。
- 未知のオプションは無視されます。

## 動作要件

- Node.js `>=20.19.0`（パッケージの `engines`。引数パーサー `cac` 7 の要件）
- pnpm・npm・yarn・bun のいずれか。CLI が実行するのは `<pm> install` のみです。

## 対応フレームワーク

- **Hono**（`--fw=hono`）
- **Express**（`--fw=express`）
- **AWS Lambda**（`--fw=lambda`）
- **AWS EventBridge**（`--fw=eventbridge`）

## 生成される構成（Hono の場合）

Hono テンプレートには以下が含まれます：

- Webhook ルートを持つメインアプリ
- 支払いとサブスクリプションイベントのサンプルハンドラー
- ロギングミドルウェア
- TypeScript・tsup・開発サーバーのセットアップ
- `.env.example` とテンプレート変数を含む README

必要に応じてハンドラーをカスタマイズし、イベントを追加してください。
