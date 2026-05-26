# Kotodayori agent skills (distributable)

このディレクトリは [Vercel Labs の agent-skills](https://github.com/vercel-labs/agent-skills) と同じ慣習で、**`skills/<skill-name>/SKILL.md`** 形式のエージェント向けスキルを置いています。[npm の `skills` CLI](https://www.npmjs.com/package/skills)（`npx skills add …`）から GitHub 上のサブツリーを直接取り込めます。

## 含まれるスキル

| ディレクトリ | `name` (frontmatter) | 用途 |
| --- | --- | --- |
| [`kotodayori-webhooks/`](./kotodayori-webhooks/SKILL.md) | `kotodayori-webhooks` | Kotodayori / Stripe Webhook / アダプター / `create-kotodayori` |

## インストール（`npx skills add`）

リポジトリの **既定ブランチ（通常 `main`）** が GitHub にある前提です。

```bash
# このリポジトリから kotodayori-webhooks だけをプロジェクトに入れる
npx skills add hideokamoto/kotodayori --skill kotodayori-webhooks -y
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
