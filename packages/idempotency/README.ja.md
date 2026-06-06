[English](./README.md) | **日本語**

# @kotodayori/idempotency

[Kotodayori](https://github.com/hideokamoto/kotodayori) の Webhook ルーティング向けの冪等性（idempotency）ミドルウェアと差し替え可能なストアです。Webhook の重複配信を検知し、安全に処理できるようにします。

> 🚧 **プレビュー / 先行ドキュメント。** このパッケージは現時点では構造的なスキャフォルドのみです。以下で説明する API は **v1.0 で予定している設計** であり、**まだ実装されていません**。コード例はあくまで説明用で、実装が後続の Issue で追加されるまではそのままでは動作しません。未実装の API を参照している箇所には *プレビュー* と明記しています。

## なぜ必要か

Stripe をはじめとする Webhook プロバイダは **「ちょうど 1 回（exactly-once）」の配信を保証しません**。同じイベント（同一の `event.id`）が、次のような理由で複数回配信されることがあります。

- ネットワークのタイムアウトとリトライ（Stripe は `2xx` を受け取るまで再送します）。
- プロバイダ側の at-least-once（最低 1 回）配信セマンティクス。
- ロードバランサやプロキシによるリクエストの再送。

ハンドラに副作用がある場合 — 課金、アクセス権の付与、メール送信、台帳への書き込みなど — 同じイベントを 2 回処理すると **二重処理**（メールの重複送信、二重出荷、残高の不整合）が発生します。

`@kotodayori/idempotency` は処理済みのイベントを記録し、重複を早期に打ち切ることで、各イベントのハンドラ実行を **最大 1 回** に抑えます。

## 使うべきとき

次のいずれかに当てはまる場合は冪等性を導入してください。

- ハンドラが **冪等でない副作用**（課金、出荷、メール、外部 API 呼び出し）を行う。
- Webhook エンドポイントを **複数インスタンス** で動かしており（水平スケール）、処理済みイベントの共有された永続的な記録が必要。
- ビジネスロジックが「ほぼ」冪等であっても、多層防御を入れておきたい。

## 不要なとき

次の場合は省略できます。

- ハンドラが **本質的に冪等**（安定した ID をキーにした純粋な `UPSERT`、または最新状態へのキャッシュ更新のみ）。
- 副作用のない **ログ出力** のみを行っている。
- データストア側で書き込み時点で event ID の一意性をすでに強制している（その場合、ここでの冪等性は任意の保険です）。

## インストール

```bash
npm install @kotodayori/idempotency
# または
pnpm add @kotodayori/idempotency
# または
yarn add @kotodayori/idempotency
```

本番（複数インスタンス）向けには、DynamoDB ストアの peer dependency も必要です。

```bash
pnpm add @aws-sdk/client-dynamodb
```

## クイックスタート

> ⚠️ **プレビュー:** 以下の `idempotency` とストアの export は先行公開であり、まだ実装されていません。

このパッケージは Kotodayori の標準ミドルウェアとして `router.use(...)` 経由で統合します。ディスパッチされるすべてのイベントをラップできるよう、ハンドラ登録の **前** に登録してください。

```typescript
// 🚧 プレビュー — v1.0 で予定している API。まだ未実装です。
import { StripeWebhookRouter, createStripeVerifier } from '@kotodayori/stripe';
import { expressAdapter } from '@kotodayori/express';
import { idempotency, InMemoryStore } from '@kotodayori/idempotency';

const router = new StripeWebhookRouter();

// すべてのハンドラを保護できるよう、冪等性ミドルウェアを最初に登録します。
router.use(idempotency({ store: new InMemoryStore() }));

// ハンドラは event.id ごとに最大 1 回だけ実行されます。
router.on('payment_intent.succeeded', async (event) => {
  await fulfillOrder(event.data.object);
});
```

ミドルウェアの動作:

1. イベントの一意キー（Stripe では `event.id`）を読み取る。
2. ストアを検索する。
3. すでに処理済みなら、後続のハンドラ（および `next()`）を **スキップ** する。
4. そうでなければハンドラを実行し、完了後にキーをストアへ記録する。

## ストアの選び方

ミドルウェアはストア非依存です。標準で 2 つのストアを同梱しており、`IdempotencyStore` インターフェースに沿って独自実装も可能です。

| ストア | 向いている用途 | 永続性 | インスタンス間共有 |
| --- | --- | --- | --- |
| `InMemoryStore` | ローカル開発、テスト、単一プロセス | 再起動で消失 | ❌ なし |
| `DynamoDBStore` | 本番、サーバーレス、複数インスタンス | 永続 | ✅ あり |

### InMemoryStore

設定不要・外部依存なし。開発やテストに適しています。処理済みイベントの集合が共有されず再起動で失われるため、複数インスタンスの本番には **適しません**。

```typescript
// 🚧 プレビュー
import { idempotency, InMemoryStore } from '@kotodayori/idempotency';

router.use(idempotency({ store: new InMemoryStore() }));
```

### DynamoDBStore

永続的でインスタンス間で共有されます。本番やサーバーレス（AWS Lambda）で推奨されるストアです。処理済みイベントごとに 1 アイテムを保存し、DynamoDB の TTL 属性を使って古いレコードを自動的に失効させることもできます。

```typescript
// 🚧 プレビュー
import { idempotency, DynamoDBStore } from '@kotodayori/idempotency';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

const store = new DynamoDBStore({
  client: new DynamoDBClient({}),
  tableName: 'webhook-idempotency',
  // 任意: N 秒後に処理済みレコードを自動失効させます。
  ttlSeconds: 60 * 60 * 24 * 7, // 7 日
});

router.use(idempotency({ store }));
```

DynamoDB テーブルにはパーティションキー（例: `String` 型の `pk`）が必要です。`ttlSeconds` を有効にする場合は、ストアが書き込む属性（例: `expiresAt`）に対してテーブルの TTL を設定してください。

## マイグレーション: 既存ルーターへの追加

> 🚧 **プレビュー** — 以下の API は先行公開です。[`MIGRATION.md`](./MIGRATION.md) も参照してください。

すでに動作している Kotodayori ルーターがあれば、import の追加・ストアの生成・ミドルウェア 1 つの登録だけで済みます。

```diff
  import { StripeWebhookRouter, createStripeVerifier } from '@kotodayori/stripe';
  import { expressAdapter } from '@kotodayori/express';
+ import { idempotency, DynamoDBStore } from '@kotodayori/idempotency';
+ import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

  const router = new StripeWebhookRouter();

+ // すべてのイベントを保護できるよう、ハンドラの前に登録します。
+ router.use(idempotency({
+   store: new DynamoDBStore({ client: new DynamoDBClient({}), tableName: 'webhook-idempotency' }),
+ }));

  router.on('payment_intent.succeeded', async (event) => { /* ... */ });
```

これだけです。ハンドラの変更は不要です。ローカル開発では `DynamoDBStore` の代わりに `InMemoryStore` を使ってください。

## サンプル

実行可能なプレビュー用サンプルは [`examples/`](../../examples) 配下にあります。

- [`examples/idempotency-express`](../../examples/idempotency-express) — Express + 冪等性ミドルウェア。
- [`examples/idempotency-lambda`](../../examples/idempotency-lambda) — AWS Lambda + `DynamoDBStore`。
- [`examples/idempotency-hono`](../../examples/idempotency-hono) — Hono + 冪等性ミドルウェア。

## ステータス

| 機能 | ステータス |
| --- | --- |
| `idempotency()` ミドルウェア | 🚧 予定 (v1.0) |
| `IdempotencyStore` インターフェース | 🚧 予定 (v1.0) |
| `InMemoryStore` | 🚧 予定 (v1.0) |
| `DynamoDBStore` | 🚧 予定 (v1.0) |

## ライセンス

MIT
