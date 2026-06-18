---
title: Edge ランタイムでの Stripe Webhook 署名検証
description: 同期版 constructEvent が Cloudflare Workers や Deno Deploy で失敗する理由と、非同期 Web Crypto によって単一の verifier がすべてのランタイムで動く仕組み
---

[Cloudflare Workers](https://developers.cloudflare.com/workers/) や [Deno Deploy](https://deno.com/deploy) のような Edge ランタイムへ、Node.js で動いていた検証コードのまま Stripe Webhook ハンドラーをデプロイすると、即座に失敗します。このリポジトリの `pnpm-lock.yaml` で解決されている stripe-node 22.2.0 では、SDK が次の例外を throw します。

```text
SubtleCryptoProvider cannot be used in a synchronous context.
Use `await constructEventAsync(...)` instead of `constructEvent(...)`
```

原因はシークレットの設定ミスでもボディの破損でもありません。同期版の `stripe.webhooks.constructEvent(...)` が Edge ランタイムではそもそも実行できないことが原因で、その理由は Stripe SDK がそこで HMAC 署名をどう計算するかにあります。

## なぜ同期版は Edge で実行できないのか

Edge ランタイムでは、Stripe SDK は Web Crypto API の [`SubtleCrypto`](https://developer.mozilla.org/ja/docs/Web/API/SubtleCrypto) インターフェース経由で暗号処理を行います。署名処理である `crypto.subtle.sign` は非同期で、`Promise` を返し、同期版の対応物がありません。Stripe の同期版 `constructEvent` は最終的に同期メソッドの `computeHMACSignature` を呼び出しますが、Web Crypto プロバイダーはこれを実装できません。検証を行う代わりに、このメソッドは最初の行で throw します。

これは SDK のコードそのものに現れています。`SubtleCryptoProvider` は同期版の署名メソッドを無条件に throw するようオーバーライドし、非同期版のみを実装しています。

```js
// node_modules/stripe/esm/crypto/SubtleCryptoProvider.js
computeHMACSignature(payload, secret) {
  throw new CryptoProviderOnlySupportsAsyncError('SubtleCryptoProvider cannot be used in a synchronous context.');
}
async computeHMACSignatureAsync(payload, secret) {
  // ...this.subtleCrypto.sign(...) を使用
}
```

どちらのプロバイダーになるかは、ランタイムが読み込むビルドによって決まります。stripe-node は 2 種類のビルドを同梱し、`package.json` の `exports` 条件でそれらを選び分けます。Edge ランタイムは `worker` / `workerd` / `deno` / `browser` のいずれかの条件にマッチし、`WebPlatformFunctions` で初期化されたビルドを読み込みます。その `createDefaultCryptoProvider()` は `SubtleCryptoProvider` を返します。一方 Node は `default` 条件にマッチし、デフォルトプロバイダーが `NodeCryptoProvider`（Node の同期 `crypto` モジュールに基づく）であるビルドを読み込みます。Node では同期 crypto なので同期呼び出しが動きますが、Edge では使える同期プリミティブが無いため throw します。

Edge 向けビルドを Node 上で直接実行すると、この差が確認できます。同期呼び出しは crypto エラーを throw し、非同期呼び出しは crypto のゲートを通過して実際の署名比較まで進みます（この例ではダミー署名を使っているため、署名不一致でのみ失敗します）。

```text
--- sync constructEvent (Edge build) ---
THROWN: "SubtleCryptoProvider cannot be used in a synchronous context.\nUse `await constructEventAsync(...)` instead of `constructEvent(...)`"
--- async constructEventAsync (Edge build) ---
THROWN: "No signatures found matching the expected signature for payload. ..."
```

2 つ目のメッセージは通常の「署名不一致」エラーで、検証が実際に試みられて初めて現れます。これは、同期版では到達できない非同期版が実行されていることの裏づけです。

## 手で検証する場合の 3 つの要件

ライブラリを使わずに Edge ランタイムで Stripe の署名を直接検証する場合、次の 3 点を満たす必要があります。

1 つ目は、`constructEvent` ではなく `constructEventAsync` を呼び、`await` することです。これはエラーメッセージが直接指示している要件です。Edge の crypto プロバイダーは非同期署名しか実装していないため、検証を完了できるのは非同期エントリポイントだけです。

```typescript
const event = await stripe.webhooks.constructEventAsync(
  rawBody,
  signature,
  webhookSecret,
);
```

2 つ目は、Stripe クライアントを fetch ベースの HTTP クライアント `Stripe.createFetchHttpClient()` で構築することです。これは署名検証そのものではなく、Stripe API への送信に関わる要件です。デフォルトの Node HTTP トランスポートは Node の `http` モジュールに依存しており Edge では利用できないため、ハンドラーが Stripe API を呼ぶ場合は fetch ベースのトランスポートが必要になります。Edge 向けビルドではこのトランスポートが既にデフォルト（`WebPlatformFunctions.createDefaultHttpClient()` が fetch クライアントを返す）ですが、明示的に指定することで要件を明確にし、誤って Node 向けビルドを読み込んだ場合の保険にもなります。

```typescript
const stripe = new Stripe(apiKey, {
  httpClient: Stripe.createFetchHttpClient(),
});
```

3 つ目は、生のリクエストボディを verifier に渡すことです。署名は Stripe が送信した正確なバイト列に対して計算されます。JSON をパースして再シリアライズするフレームワークは、キーの順序・空白・数値の表記といったバイト列を変えてしまい、署名は一致しなくなります。`constructEventAsync` に渡すボディは、未加工のリクエストペイロードを文字列または `Buffer` のまま渡す必要があります。

## `createStripeVerifier` が 1 つ目の要件をどう解決するか

`@kotodayori/stripe` の `createStripeVerifier` は、1 つ目の要件を呼び出し側から完全に取り除きます。同期版を一切使わず `constructEventAsync` を無条件に呼び出し（`packages/stripe/src/index.ts:454`）、`Verifier<Stripe.Event>` 型の `Promise` を返します（`packages/stripe/src/index.ts:443`）。

```typescript
// packages/stripe/src/index.ts
export function createStripeVerifier(
  stripe: Stripe,
  webhookSecret: string
): Verifier<Stripe.Event> {
  return async (payload, headers) => {
    const signature = headers['stripe-signature'];
    if (!signature) {
      throw new Error('Missing stripe-signature header');
    }
    const event = await stripe.webhooks.constructEventAsync(
      payload,
      signature,
      webhookSecret,
    );
    return { event };
  };
}
```

Kotodayori のすべてのアダプターは、ディスパッチ前に verifier を既に `await` しています。たとえば Hono アダプターは `packages/hono/src/index.ts:64` で `verifier(rawBody, headers)` を await します。そのため非同期 verifier は Node でもそのまま使えます。`constructEventAsync` は Node でも正しく動きます。Node の crypto プロバイダーが同期・非同期の両方のメソッドを実装しているためです。結果として、ランタイム固有の分岐なしに Node と Edge の両方をカバーする単一の verifier になります。この設計意図は関数自身のドキュメントに記録されており（`packages/stripe/src/index.ts:393-398`）、変更はコミット `55a69c4`（"feat(stripe): support Cloudflare Workers / Edge via async verifier"、`@kotodayori/stripe` 1.1.0 としてリリース）で入りました。

残る 2 つの要件は、検証ロジックではなく構築時の関心事であるため、引き続き呼び出し側の責務です。Stripe クライアントを構築して HTTP トランスポートを選ぶこと、生ボディが verifier に届くようルートを組むことです。verifier が持つのは検証呼び出しだけです。3 つすべてを満たす完全な Workers の構成は [Cloudflare Workers ガイド](/ja/guides/cloudflare-workers)に掲載しています。

## バージョン依存性と検証範囲

上記の挙動は stripe-node 22.2.0 で確認しました。このバージョンではパッケージの `exports` 条件によってランタイムが自動判別されるため、`constructEventAsync` の第 5 引数として crypto プロバイダーを渡す必要はありません。Edge 向けビルドが既に Web Crypto プロバイダーをデフォルトにしているためです。古い stripe-node ではこの方式でプロバイダーが選ばれず、明示的に `SubtleCryptoProvider` を渡す必要がありました。古いメジャーバージョンに固定している場合は、[Stripe の Webhook 署名ドキュメント](https://docs.stripe.com/webhooks/signature)で要件を確認してください。明示的なプロバイダーが必要かどうかはバージョン依存であり、ここで説明した単一 verifier の挙動はランタイムを自動判別する stripe-node のバージョンで成立します。

このガイドの再現は、Edge 向けビルドを Node.js 上で実行し、SDK レベルでの同期・非同期の差を確認したものです。個々の Edge プラットフォームでエンドツーエンドに同一の挙動になるかは、その観察の範囲を超えて断定していません。Cloudflare Workers の経路については、動作する構成とあわせて [Cloudflare Workers ガイド](/ja/guides/cloudflare-workers)で扱っています。
