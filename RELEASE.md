# リリースガイド

Kotodayori のモノレポは **Changesets** を使った自動リリースフローを採用しています。

## リリースフロー概要

```
開発
  ↓
pnpm changeset で変更内容を記述
  ↓
PR を merge
  ↓
CircleCI (npm-monorepo-version-pr.yaml) が自動で "Version Packages" PR を作成
  ↓
"Version Packages" PR を merge
  ↓
CircleCI (npm-monorepo.yaml) が自動で npm に publish
```

> リリース用の CI 設定は別リポジトリ [`hideokamoto/circleci-configurations`](https://github.com/hideokamoto/circleci-configurations) の
> `workflows/publish/` にあり、[複数 Config File 機能](https://circleci.com/docs/guides/orchestrate/set-up-multiple-configuration-files-for-a-project/)で
> このリポジトリに紐づけています。**version PR 作成・publish ともに CircleCI に統一**しており、GitHub Actions（`changesets/action`）は使いません。
> npm 公開は **OIDC Trusted Publishing** で行うため、長期の npm トークンは不要です。

---

## ステップバイステップ

### 1. PR 作成時

変更をコードに加えた後、以下を実行します：

```bash
pnpm changeset
```

対話形式で以下を指定します：

- **どのパッケージが変更されたか** - パッケージを選択（複数選択可能）
- **バージョン種別** - `patch`, `minor`, `major` から選択
- **変更内容の説明** - CHANGELOG に記載される内容

すると `.changeset/*.md` ファイルが生成されます。例：

```markdown
# .changeset/pink-dogs-look.md

---
"@kotodayori/core": minor
"@kotodayori/stripe": patch
---

Added support for custom error handlers in event routing
```

このファイルも一緒に `git add` して PR に含めてください。

```bash
git add .
git commit -m "feat: add custom error handlers"
git push
```

### 2. main へのマージ後（自動）

main ブランチに PR が merge されると、CircleCI の `npm-monorepo-version-pr.yaml` が自動的に以下を行います：

1. **`pnpm changeset:version` の実行** - 未消化の `.changeset/*.md` ファイルをスキャン
2. **バージョン番号の更新** - `package.json` を更新
3. **CHANGELOG の生成** - 各パッケージの `CHANGELOG.md` を自動生成
4. **"Version Packages" PR の作成/更新** - 上記の差分を `changeset-release/main` ブランチにまとめて PR 化

この PR が作成されたら、内容を確認してマージしてください。

> 同じ main push で publish 側（`npm-monorepo.yaml`）も走りますが、まだ版が上がっていない（npm 公開済みと同じ）ため `changeset publish` は「未公開分なし」で何もしません（冪等）。

### 3. Version PR のマージ（自動 publish）

"Version Packages" PR を main に merge すると、CircleCI の `npm-monorepo.yaml` が自動的に以下を実行します：

```bash
pnpm build          # すべてのパッケージをビルド
changeset publish   # npm registry に publish（OIDC Trusted Publishing）
```

publish が完了すると、各パッケージの Git タグが作成され、origin へ push されます。

---

## ローカルでの手動リリース

CI 環境以外でリリースしたい場合（テスト目的など）：

### バージョン更新とビルド

```bash
# package.json とCHANGELOG.md を更新
pnpm changeset:version

# 確認して commit
git diff
git add .
git commit -m "chore: version packages"
```

### NPM への Publish

```bash
# ビルド → publish
pnpm changeset:publish
```

**注意**: ローカルから publish する場合、npm の認証が必要です。

```bash
npm adduser
# または
npm login
```

---

## 必要な設定（CircleCI）

npm 公開は **OIDC Trusted Publishing** を使うため、**長期の npm トークンは不要**です。代わりに以下を設定します。

### 1. npmjs.com 側：Trusted Publisher 登録（必須）

公開する **各パッケージ**ごとに、npmjs.com → 該当パッケージ → Settings → Trusted Publisher → CircleCI を登録します
（`@kotodayori/core` など全 8 パッケージ分）。設定項目の詳細は
[`circleci-configurations` の publish README](https://github.com/hideokamoto/circleci-configurations/blob/main/workflows/publish/README.md) を参照してください。

### 2. CircleCI 側：Context

| Context 名 | 用途 |
|-----------|------|
| `npm-publish-guard` | publish ジョブの実行を承認済みブランチ/ユーザーに限定（restricted context。npm トークンは入れない） |
| `github` | `gh` CLI 認証。Version PR の作成・`changeset-release/main` ブランチ push・publish 後のタグ push に使う GitHub トークン（PR 作成権限 + `contents:write` が必要） |

### 3. CircleCI 側：Config File 紐づけ

[複数 Config File 機能](https://circleci.com/docs/guides/orchestrate/set-up-multiple-configuration-files-for-a-project/)で、`circleci-configurations` の以下 2 ファイルを **両方**このプロジェクトに紐づけます。

- `workflows/publish/npm-monorepo-version-pr.yaml`（Version PR 作成）
- `workflows/publish/npm-monorepo.yaml`（publish）

---

## トラブルシューティング

### "Version Packages" PR が作成されない

- `.changeset/*.md` ファイルが commit されているか確認
- ファイルが存在する場合、CircleCI の `npm-monorepo-version-pr.yaml` 実行ログを確認
- `github` Context のトークンに PR 作成権限・`contents:write` があるか確認

### Publish が失敗する

- npmjs.com で対象パッケージに **Trusted Publisher（CircleCI）** が登録されているか確認
- `NODE_AUTH_TOKEN` / `NPM_TOKEN` や `.npmrc` の `_authToken` が残っていないか確認（残っていると OIDC 交換がスキップされ `ENEEDAUTH` / `E404` になる）
- Node 22.14 以上・npm 11.5.1 以上か確認（OIDC の必須要件）
- `pnpm build` が通っているか確認

### 特定のパッケージだけ publish したくない

`.changeset/config.json` の `ignore` 配列にパッケージ名を追加してください：

```json
{
  "ignore": ["@kotodayori/internal-only"]
}
```

---

## 参考リンク

- [Changesets - Getting Started](https://github.com/changesets/changesets/blob/main/docs/intro-to-changesets.md)
- [リリース用 CircleCI 設定（circleci-configurations）](https://github.com/hideokamoto/circleci-configurations/tree/main/workflows/publish)
- [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/)
- [pnpm Monorepo](https://pnpm.io/workspaces)
