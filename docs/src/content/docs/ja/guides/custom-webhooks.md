---
title: カスタム Webhook
description: Kotodayori をあらゆる Webhook プロバイダーで使用する
---

Kotodayori は Stripe 専用ではありません。次の 2 つを用意すれば、コアルーターを任意の Webhook プロバイダー（CircleCI、LINE、独自 API など）で使えます。

1. **イベント型マップ**: イベント型の文字列と型付きイベントの対応表。各ハンドラーが正しい型を受け取れるようにします。
2. **Verifier**: 生のボディに対してリクエストの署名を検証し、`{ event }` を返す関数。

このガイドでは、Webhook の届き方が異なる 2 つのプロバイダーについて、この 2 つを作ります。CircleCI は 1 リクエストに 1 イベント、LINE は 1 リクエストに複数のイベントをまとめて送ります。以下のコードを動く形にしたものが [`examples/custom-webhooks-demo`](https://github.com/hideokamoto/kotodayori/tree/main/examples/custom-webhooks-demo) にあり、[StackBlitz で開く](https://stackblitz.com/github/hideokamoto/kotodayori/tree/main/examples/custom-webhooks-demo?file=src/routers.ts)こともできます。

## HMAC 署名の検証

多くのプロバイダーは、生のリクエストボディを HMAC-SHA256 で署名します。Web Crypto の `crypto.subtle.verify` は署名を定時間で比較し、同じコードが Node.js 20 以降、Cloudflare Workers などのエッジランタイムでも動きます。

```typescript
const encoder = new TextEncoder();

async function verifyHmacSha256(secret: string, body: string | Uint8Array, signature: Uint8Array) {
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
  );
  const data = typeof body === 'string' ? encoder.encode(body) : new Uint8Array(body);
  return crypto.subtle.verify('HMAC', key, new Uint8Array(signature), data);
}
```

署名は、受け取ったままの生のボディ（`string` または `Buffer`）に対して検証してください。先に JSON をパースして再シリアライズするとバイト列が変わり、署名が一致しなくなります。シークレットはログに出力しないでください。

## 1 リクエストに 1 イベント: CircleCI

CircleCI の [outbound webhooks](https://circleci.com/docs/guides/integration/outbound-webhooks/) は、イベントの種類を `circleci-event-type` ヘッダー（`workflow-completed` または `job-completed`）で送り、ボディの署名を `circleci-signature: v1=<hex>` に入れます。

### イベント型

```typescript
import type { WebhookEvent } from '@kotodayori/core';

interface WorkflowCompletedEvent extends WebhookEvent {
  type: 'workflow-completed';
  data: {
    object: {
      id: string;
      project: { slug: string };
      workflow: { name: string; status: 'success' | 'failed' | 'error' | 'canceled' | 'unauthorized'; url: string };
    };
  };
}

interface JobCompletedEvent extends WebhookEvent {
  type: 'job-completed';
  data: {
    object: {
      id: string;
      job: { name: string; number: number; status: 'success' | 'failed' | 'canceled' | 'unauthorized' };
    };
  };
}

type CircleCIEventMap = {
  'workflow-completed': WorkflowCompletedEvent;
  'job-completed': JobCompletedEvent;
};
```

### Verifier

このヘッダーには複数のバージョンが並ぶことがあります（`v1=...,v2=...`）。CircleCI のドキュメントは、ダウングレード攻撃を防ぐために最新のバージョンだけを検証するよう求めています。現時点で最新かつ唯一のバージョンは `v1` です。

```typescript
import type { Verifier } from '@kotodayori/core';

function hexToBytes(hex: string): Uint8Array | null {
  if (!/^(?:[0-9a-f]{2})+$/i.test(hex)) return null;
  return new Uint8Array(hex.match(/../g)!.map((pair) => parseInt(pair, 16)));
}

function createCircleCIVerifier(secret: string): Verifier {
  return async (payload, headers) => {
    const header = headers['circleci-signature'];
    if (!header) throw new Error('Missing circleci-signature header');

    const v1 = header.split(',').map((part) => part.trim()).find((part) => part.startsWith('v1='));
    const signature = v1 ? hexToBytes(v1.slice('v1='.length)) : null;
    if (!signature || !(await verifyHmacSha256(secret, payload, signature))) {
      throw new Error('Invalid signature');
    }

    const type = headers['circleci-event-type'];
    if (!type) throw new Error('Missing circleci-event-type header');

    const body = JSON.parse(payload.toString());
    return { event: { id: body.id, type, data: { object: body } } };
  };
}
```

### ルーターとアダプター

```typescript
import { Hono } from 'hono';
import { WebhookRouter } from '@kotodayori/core';
import { honoAdapter } from '@kotodayori/hono';

const router = new WebhookRouter<CircleCIEventMap>();

router.on('workflow-completed', async (event) => {
  const { workflow, project } = event.data.object;
  if (workflow.status !== 'success') {
    console.log(`Workflow ${workflow.name} ${workflow.status} on ${project.slug}: ${workflow.url}`);
  }
});

router.on('job-completed', async (event) => {
  console.log(`Job ${event.data.object.job.name}: ${event.data.object.job.status}`);
});

const app = new Hono();
app.post('/webhooks/circleci', honoAdapter(router, {
  verifier: createCircleCIVerifier(process.env.CIRCLECI_WEBHOOK_SECRET!),
}));
```

ハンドラーを登録していないイベントの種類（CircleCI が今後追加する種類など）は、`200` を返して無視されます。

## 1 リクエストに複数イベント: LINE

[LINE Messaging API](https://developers.line.biz/ja/reference/messaging-api/) は `{ destination, events: [...] }` を送り、ボディの署名を base64 で `x-line-signature` に入れます。1 リクエストに複数のイベントが入りうるため、検証とルーティングを 2 段階に分けます。

1. Verifier は署名を 1 回だけ検証し、ボディ全体を 1 つの `line.callback` イベントとして返します。
2. 小さな `WebhookDispatcher` がそのまとまりを受け取り、LINE の各イベントをルーターに 1 件ずつディスパッチします。アダプターは `dispatch(event)` メソッドを持つオブジェクトなら何でも受け付けるので、ルーターの代わりにこの分割役をアダプターに渡します。

メッセージイベントはメッセージの種類ごと（`message.text`、`message.sticker` など）にルーティングし、各ハンドラーが絞り込まれたメッセージ型を受け取れるようにします。ペイロードの型は LINE 公式の [`@line/bot-sdk`](https://github.com/line/line-bot-sdk-nodejs) パッケージのものを使います。

```typescript
import { Hono } from 'hono';
import { WebhookRouter, type Verifier, type WebhookDispatcher, type WebhookEvent } from '@kotodayori/core';
import { honoAdapter } from '@kotodayori/hono';
import type { webhook } from '@line/bot-sdk';

interface LineEvent<TType extends string, TEvent> extends WebhookEvent {
  type: TType;
  data: { object: TEvent };
}
type MessageEventOf<T extends webhook.MessageContent> = Omit<webhook.MessageEvent, 'message'> & { message: T };

type LineEventMap = {
  'message.text': LineEvent<'message.text', MessageEventOf<webhook.TextMessageContent>>;
  'message.sticker': LineEvent<'message.sticker', MessageEventOf<webhook.StickerMessageContent>>;
  follow: LineEvent<'follow', webhook.FollowEvent>;
};

interface LineCallbackEvent extends WebhookEvent {
  type: 'line.callback';
  data: { object: webhook.CallbackRequest };
}

function createLineVerifier(channelSecret: string): Verifier<LineCallbackEvent> {
  return async (payload, headers) => {
    const header = headers['x-line-signature'];
    if (!header) throw new Error('Missing x-line-signature header');

    let signature: Uint8Array;
    try {
      signature = Uint8Array.from(atob(header), (c) => c.charCodeAt(0));
    } catch {
      throw new Error('Invalid signature');
    }
    if (!(await verifyHmacSha256(channelSecret, payload, signature))) {
      throw new Error('Invalid signature');
    }

    const body = JSON.parse(payload.toString()) as webhook.CallbackRequest;
    return { event: { id: crypto.randomUUID(), type: 'line.callback', data: { object: body } } };
  };
}

function splitLineEvents(router: WebhookDispatcher): WebhookDispatcher<LineCallbackEvent> {
  return {
    async dispatch(batch) {
      for (const event of batch.data.object.events) {
        const type = event.type === 'message' ? `message.${event.message.type}` : event.type;
        await router.dispatch({ id: event.webhookEventId, type, data: { object: event } });
      }
    },
  };
}

const router = new WebhookRouter<LineEventMap>();

router.on('message.text', async (event) => {
  console.log('Text:', event.data.object.message.text);
});

router.on('follow', async (event) => {
  console.log('New friend:', event.data.object.source?.type);
});

const app = new Hono();
app.post('/webhooks/line', honoAdapter(splitLineEvents(router), {
  verifier: createLineVerifier(process.env.LINE_CHANNEL_SECRET!),
}));
```

## イベントの種類の決め方

ルーターが受け取る `type` は Verifier が決めます。プロバイダーが実際に送ってくる内容から組み立ててください。イベント名をヘッダーに、細かい動作をボディに入れるプロバイダーなら、両方を組み合わせて、ハンドラーを登録する型にします。Verifier が一度も作らない型にハンドラーを登録しても、そのハンドラーは呼ばれません。しかもリクエストには `200` が返るので、この誤りは表に出ません。実際の（または実際に近い）配信で Verifier を試し、ハンドラーが動くことを確かめてください。
