---
title: nominal 型 vs structural 型 — 重複インストールと WebhookDispatcher
description: アダプターがかつて `as unknown as WebhookRouter` キャストを必要とした理由と、単一メソッドの structural なインターフェースが型推論を弱めずにそのキャストを取り除いた仕組み
---

`@kotodayori/core` 1.2.0 より前は、ルーターをアダプターに渡す際に、場違いに見えるキャストが必要になることがありました。どちらの値も同じライブラリ由来であるにもかかわらず、これが無いと型チェッカーが呼び出しを拒否したのです。

```typescript
honoAdapter(router as unknown as WebhookRouter, { verifier });
```

`as unknown as WebhookRouter` は二重アサーションです。値の型をいったん `unknown` に消し去り、改めて `WebhookRouter` として主張することで、型チェッカーを完全に無効化します。自分のルーターを自分のアダプターに渡すためにこれが必要になるのは、本来同一であるべき 2 つの `WebhookRouter` 型が別物として扱われているサインです。実際にそうなっていました。原因は、TypeScript がクラス型をどう比較するかと、モノレポや利用者のプロジェクトで `@kotodayori/core` のコピーが複数生まれうることの組み合わせにあります。

## なぜキャストが必要だったのか

`WebhookRouter` は private フィールドを持つクラスです。ハンドラーのマップとミドルウェアのリストが `private` として宣言されています（`packages/core/src/index.ts:122-123`）。

```typescript
export class WebhookRouter<...> implements WebhookDispatcher<...> {
  private handlers: Map<string, EventHandler<WebhookEvent>[]> = new Map();
  private middlewares: Middleware[] = [];
  // ...
}
```

TypeScript の型システムはそれ以外では [structural](https://www.typescriptlang.org/docs/handbook/type-compatibility.html)（構造的）です。2 つの型は、宣言された名前に関わらず、メンバーが一致すれば互換とみなされます。`private` または `protected` メンバーを持つクラスは、その文書化された例外です。ハンドブックには、インスタンスの互換性を判定する際、対象の型が private メンバーを含むなら、ソースの型は *同じ宣言に由来する* private メンバーを含まなければならない、と記されています。private フィールドはクラスを nominal（公称的）に振る舞わせます。つまり、値が `WebhookRouter` に代入可能なのは、それがまさにそのクラス宣言から来た場合に限られます。

この制約は `@kotodayori/core` のコピーが 1 つしか無い間は見えません。すべての `WebhookRouter` が同じ宣言を共有するためです。コピーが 2 つになった瞬間に顕在化します。`@kotodayori/stripe` と `@kotodayori/hono` をインストールした利用者は、その両方を通じて `@kotodayori/core` を取り込みます。パッケージマネージャがそれらを 2 つの異なるコピー（異なるバージョン、または dedupe されない同一バージョン）に解決すると、利用者が構築する `StripeWebhookRouter` はコピー A の `WebhookRouter` を継承し、一方 `honoAdapter` の引数型はコピー B の `WebhookRouter` を指します。両者は構造的には同一ですが、`private handlers` と `private middlewares` が異なるクラス宣言に由来するため、nominal な比較は代入を拒否します。`as unknown as WebhookRouter` は、利用者がやむなく手を伸ばした逃げ道でした。

## 解決策：structural なディスパッチインターフェース、2 つの要素

修正はコミット `cec7631`（`@kotodayori/core` 1.2.0、`@kotodayori/stripe` 1.1.1）で入り、2 つの要素から成ります。コピーの不一致を無害化する structural なインターフェースと、不一致そのものを生じさせない依存範囲の変更です。

1 つ目の要素が `WebhookDispatcher` です。`@kotodayori/core` は、アダプターがルーターに実際に必要とする唯一の能力、すなわち検証済みイベントをディスパッチする能力を記述したインターフェースを公開するようになりました（`packages/core/src/index.ts:110-112`）。

```typescript
export interface WebhookDispatcher<TEvent extends WebhookEvent = WebhookEvent> {
  dispatch(event: TEvent): Promise<void>;
}
```

インターフェースには private フィールドの nominal 制約が無いため、純粋に構造的に照合されます。適合する `dispatch` メソッドを持つオブジェクトは、そのクラスがどのコピーの core 由来であっても `WebhookDispatcher` を満たします。`WebhookRouter` は `implements WebhookDispatcher<...>` を宣言し（`packages/core/src/index.ts:121`）、すべてのアダプターは `router` 引数を具象クラスからインターフェースへ変更しました。`honoAdapter`・`expressAdapter`・`lambdaAdapter` は `WebhookDispatcher<TEvent>` を受け取り（`packages/hono/src/index.ts:41`、`packages/express/src/index.ts:44`、`packages/lambda/src/index.ts:40`）、`eventBridgeAdapter` は `WebhookDispatcher` を受け取ります（`packages/eventbridge/src/index.ts:23`）。不一致な core コピー由来のルーターも、その形状、すなわち `dispatch` メソッドの有無だけが比較されるため、型チェックを通過します。

2 つ目の要素は、そもそも重複インストールを防ぎます。core への内部依存範囲が、公開パッケージ全体で `workspace:*` から `workspace:^` に変更されました（コミット `cec7631`。現在の `packages/stripe/package.json` は `"@kotodayori/core": "workspace:^"` を示し、アダプター各パッケージも同様です）。公開時に `workspace:^` は `^1.2.0` のような caret 範囲に書き換えられ、パッケージマネージャがすべてのアダプターと Stripe パッケージを単一の core コピーへ dedupe できるようになります。structural なインターフェースが不一致を無害にし、caret 範囲が不一致の発生そのものを防ぎます。

## なぜ型推論は影響を受けないのか

具象のジェネリッククラスを単一メソッドのインターフェースに置き換えると、もっともな疑問が生じます。アダプターはイベント型を正しく推論し続けるのか、という点です。答えは、影響を受けない、です。verifier のイベント型とルーターのハンドラー型は独立した 2 か所から推論され、どちらも絞り込まれた引数を経由しないためです。

アダプターのイベント型 `TEvent` はアダプター関数の自由な型パラメータであり、ルーターではなく verifier によって確定します。`HonoAdapterOptions` は `verifier: Verifier<TEvent>` を持ち、`createStripeVerifier` は `Verifier<Stripe.Event>` を返すため（`packages/stripe/src/index.ts:443`）、`TEvent` は verifier オプションから `Stripe.Event` に解決されます。`router` 引数は `WebhookDispatcher<TEvent>` ですが、`dispatch` はメソッドであるためその引数は bivariant（双変）に比較されます。したがって、自身のイベント union が `TEvent` と異なるルーターを渡しても推論と矛盾しません。この verifier 推論とルーターの分離はコミット `486a755` で導入され、`@kotodayori/core` 1.1.0 の changelog に記述されています。

ハンドラーレベルの型は完全にルーター側に存在し、アダプターを経由することはありません。`StripeWebhookRouter` は `WebhookRouter<StripeEventMap>` を継承し（`packages/stripe/src/index.ts:385`）、`router.on('payment_intent.succeeded', handler)` のような呼び出しは、ルーター自身の `TEventMap` ジェネリックを通じて `StripeEventMap` からハンドラーのイベント型を推論します（`packages/core/src/index.ts:132-135`）。この推論は、ルーターがアダプターに渡される前に、ルータークラス上の `.on()` 呼び出し地点で行われます。アダプター引数を `WebhookDispatcher` に絞り込んでも、変わるのはルーターの渡し方だけで、ハンドラーの型付けには触れません。`.on(...)` 上の補完とイベント型の絞り込みは、この変更の前後でまったく同一です。
