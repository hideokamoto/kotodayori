# Kotodayori agent skills (distributable)

このディレクトリは [Vercel Labs の agent-skills](https://github.com/vercel-labs/agent-skills) と同じ慣習で、**`skills/<skill-name>/SKILL.md`** 形式のエージェント向けスキルを置いています。[npm の `skills` CLI](https://www.npmjs.com/package/skills)（`npx skills add …`）から GitHub 上のサブツリーを直接取り込めます。

## 含まれるスキル

| ディレクトリ | `name` (frontmatter) | 用途 |
| --- | --- | --- |
| [`kotodayori-webhooks/`](./kotodayori-webhooks/SKILL.md) | `kotodayori-webhooks` | Kotodayori / Stripe Webhook / アダプター / `create-kotodayori` |
| [`create-kotodayori/`](./create-kotodayori/SKILL.md) | `create-kotodayori` | `create-kotodayori` CLI でのプロジェクト生成（プレビュー → 承認 → 実行の手順、Stripe CLI の制約） |

`create-kotodayori` CLI を変更したら（フラグ・受け付ける値・`engines.node`・生成物）、同じ PR で `create-kotodayori/SKILL.md` も更新してください。ずれると `packages/create-kotodayori/src/skill.test.ts` が失敗します。docs サイトはビルド時にこのファイルを読み込んで `/skill.md` と `/.well-known/agent-skills/` で配信します（コピーは持ちません）。

## インストール（`npx skills add`）

リポジトリの **既定ブランチ（通常 `main`）** が GitHub にマージ済みである前提です。PR ブランチだけにある版を試す場合は、URL のブランチ名を差し替えてください（例: `tree/cursor/kotodayori-agent-skill-abe1/skills/kotodayori-webhooks`）。

```bash
# このリポジトリから kotodayori-webhooks だけをプロジェクトに入れる
npx skills add hideokamoto/kotodayori --skill kotodayori-webhooks -y

# create-kotodayori スキル
npx skills add hideokamoto/kotodayori --skill create-kotodayori -y
```

サブツリー URLで指定する場合:

```bash
npx skills add https://github.com/hideokamoto/kotodayori/tree/main/skills/kotodayori-webhooks -y
```

グローバル（ユーザー配下のエージェント用ディレクトリ）へ入れる例:

```bash
npx skills add hideokamoto/kotodayori --skill kotodayori-webhooks -g -y
```

利用可能なフラグ（`-a` でエージェント指定など）は `npx skills add --help` を参照してください。

## インストール（`gh` + `npx skills add`）

リポジトリを浅く clone してから、ローカルパスを `skills` に渡します。

```bash
gh repo clone hideokamoto/kotodayori /tmp/kotodayori -- --depth 1
npx skills add /tmp/kotodayori/skills/kotodayori-webhooks --copy -y
rm -rf /tmp/kotodayori
```

## 手動コピー

`skills/kotodayori-webhooks/` 全体を、使用するエージェントのスキルディレクトリ（例: プロジェクトの `.cursor/skills/` や `~/.claude/skills/`）にコピーしても構いません。

## `skills.sh.json`

[skills.sh](https://skills.sh/) 向けのメタデータ用にルートに `skills.sh.json` を置いています（任意）。
