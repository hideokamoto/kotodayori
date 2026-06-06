# リリースガイド

Kotodayori のモノレポは **Changesets** を使った自動リリースフローを採用しています。

## リリースフロー概要

```
開発
  ↓
pnpm changeset で変更内容を記述（.changeset/*.md を PR に含める）
  ↓
PR を main に merge
  ↓
CircleCI (npm-monorepo.yaml) が一直線に自動実行:
  changeset version（版上げ＋CHANGELOG）
    → main へコミット & push（[skip ci]）
    → changeset publish（npm 公開・OIDC）
    → タグ push
```

> リリース用の CI 設定は別リポジトリ [`hideokamoto/circleci-configurations`](https://github.com/hideokamoto/circleci-configurations) の
> `workflows/publish/npm-monorepo.yaml` にあり、[複数 Config File 機能](https://circleci.com/docs/guides/orchestrate/set-up-multiple-configuration-files-for-a-project/)で
> このリポジトリに紐づけています。**version 上げも publish も CircleCI に統一**しており、GitHub Actions（`changesets/action`）や「Version Packages」PR は使いません。
> npm 公開は **OIDC Trusted Publishing** で行うため、長期の npm トークンは不要です。
> なお CI が**版上げコミットを main に直接 push** するため、main をブランチ保護する場合は bot/トークンに保護バイパスを許可してください。

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

### 2. main へのマージ後（自動・一直線）

`.changeset/*.md` を含む PR を main に merge すると、CircleCI の `npm-monorepo.yaml` が自動的に以下を順に実行します（**人手の確認 PR は挟みません**）：

1. **未消化 changeset の判定** - `.changeset/*.md`（README 以外）が無ければ `step halt` で即終了
2. **`changeset version` の実行** - `package.json` の版を上げ、`CHANGELOG.md` を生成し、取り込んだ `.changeset/*.md` を削除
3. **main へコミット & push** - `chore: release version packages [skip ci]`（`[skip ci]` でこの push 由来の再実行を抑止）
4. **`changeset publish`** - ビルドして未公開バージョンを npm に公開（OIDC Trusted Publishing）
5. **タグ push** - 生成された各パッケージの Git タグを origin へ反映

> **二重実行されない理由**: 手順 3 の push は `[skip ci]` 付き。仮に効かず再実行されても、その時点では changeset が消費済みのため手順 1 で halt します。`changeset publish` も未公開分しか出さないので二重公開しません。

> **公開が途中で失敗したら**: 手順 3（push）成功後に 4（publish）が失敗した場合、main は版上げ済みだが npm 未公開の状態になります。復旧は手動で `pnpm changeset:publish` を再実行してください（changeset ファイルが無くても package.json と npm を比較して未公開分を公開します。二重公開なし）。

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
| `npm-publish-guard` | release ジョブの実行を承認済みブランチ/ユーザーに限定（restricted context。npm トークンは入れない） |
| `github` | `gh` CLI 認証。**版上げコミットの main への push** と **publish 後のタグ push** に使う GitHub トークン（`contents:write` が必要。main をブランチ保護する場合は保護バイパスも） |

### 3. CircleCI 側：Config File 紐づけ

[複数 Config File 機能](https://circleci.com/docs/guides/orchestrate/set-up-multiple-configuration-files-for-a-project/)で、`circleci-configurations` の以下ファイルをこのプロジェクトに紐づけます。

- `workflows/publish/npm-monorepo.yaml`（version → publish を一括実行する単一ファイル）

### 4. main のブランチ保護（注意）

CI が版上げコミットを main に直接 push します。main を保護している場合は、CircleCI が使う bot/トークンに **保護バイパス**を許可してください（許可しないと手順 3 の push で失敗します）。

---

## トラブルシューティング

### リリースが走らない / 何も公開されない

- `.changeset/*.md`（README 以外）が main に commit されているか確認（無いと `step halt` で即終了します）
- CircleCI の `release` ジョブ実行ログを確認
- 版上げコミットの push で失敗する場合は、`github` Context のトークン権限（`contents:write`）と main のブランチ保護バイパスを確認

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
