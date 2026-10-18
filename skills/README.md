# Kotodayori agent skills (distributable)

このディレクトリは [Vercel Labs の agent-skills](https://github.com/vercel-labs/agent-skills) と同じ慣習で、**`skills/<skill-name>/SKILL.md`** 形式のエージェント向けスキルを置いています。[npm の `skills` CLI](https://www.npmjs.com/package/skills)（`npx skills add …`）から GitHub 上のサブツリーを直接取り込めます。

## 含まれるスキル

| ディレクトリ | `name` (frontmatter) | 用途 |
| --- | --- | --- |
| [`kotodayori-webhooks/`](./kotodayori-webhooks/SKILL.md) | `kotodayori-webhooks` | Kotodayori / Stripe Webhook / アダプター / `create-kotodayori` |
| [`create-kotodayori/`](./create-kotodayori/SKILL.md) | `create-kotodayori` | `create-kotodayori` CLI での新規プロジェクト生成（対話なしの実行、事前プレビュー、npm・Stripe に触れる操作の承認） |

## インストール（`npx skills add`）

リポジトリの **既定ブランチ（通常 `main`）** が GitHub にマージ済みである前提です。PR ブランチだけにある版を試す場合は、URL のブランチ名を差し替えてください（例: `tree/cursor/kotodayori-agent-skill-abe1/skills/kotodayori-webhooks`）。

```bash
# このリポジトリから kotodayori-webhooks だけをプロジェクトに入れる
npx skills add hideokamoto/kotodayori --skill kotodayori-webhooks -y

# create-kotodayori CLI 用のスキル
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

## メンテナンス

- `create-kotodayori` の CLI（オプション、受け付ける値、Node.js の要件、`--help` に書いた挙動）を変えたら、同じ PR で [`create-kotodayori/SKILL.md`](./create-kotodayori/SKILL.md) も更新してください。値がずれると `packages/create-kotodayori/src/skill.test.ts` が失敗します。
- `kotodayori-webhooks/SKILL.md` は create-kotodayori の `--skill` 用に `packages/create-kotodayori/templates/skill/SKILL.md` へコピーされます（`prebuild` の `scripts/sync-skill.mjs`）。編集したらビルドしてコピーも更新してください。
- 変更後は [Agent Skills 仕様](https://agentskills.io/specification) の検証ツールで確認します。

```bash
uvx --from skills-ref agentskills validate skills/create-kotodayori
uvx --from skills-ref agentskills validate skills/kotodayori-webhooks
```
