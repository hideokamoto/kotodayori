# Examples

このディレクトリは `create-kotodayori` の CLI（`npx create-kotodayori` と同等）から生成したサンプルアプリを置いています。モノレポ内の `@kotodayori/*` を `workspace:*` で参照するため、ルートで `pnpm install` したあと各例の `pnpm dev` で動かせます。

## 含まれる例

| ディレクトリ | 内容 |
| --- | --- |
| `sample-hono-stripe` | Hono + Stripe 署名検証 + `StripeWebhookRouter` |
| `sample-express-stripe` | Express + `express.raw` + `expressAdapter` |
| `idempotency-express` | Express + `@kotodayori/idempotency` ミドルウェア（🚧 プレビュー） |
| `idempotency-lambda` | AWS Lambda + `DynamoDBStore`（🚧 プレビュー） |
| `idempotency-hono` | Hono + `@kotodayori/idempotency` ミドルウェア（🚧 プレビュー） |

## 再生成する場合

リポジトリルートで `create-kotodayori` をビルドしてから、`examples` 下で非対話オプションを付けて実行します。

```bash
pnpm --filter create-kotodayori build
cd examples
node ../packages/create-kotodayori/dist/index.js <新しいディレクトリ名> --fw=hono --pm=pnpm --skip-install
```

生成後、`package.json` の `@kotodayori/*` を `workspace:*` に差し替え、`private: true` を付けるとモノレポ向けになります。

## 共通の動かし方

```bash
# リポジトリルート
pnpm install
pnpm build

cd examples/sample-hono-stripe
cp .env.example .env
pnpm dev
```

Stripe CLI で転送する場合:

```bash
stripe listen --forward-to localhost:3000/webhook
```
