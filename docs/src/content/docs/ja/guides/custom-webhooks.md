---
title: カスタム Webhook
description: Kotodayori をあらゆる Webhook プロバイダーで使用する
---

Kotodayori は Stripe に限定されません。カスタムイベント型マップと Verifier を使って、任意の Webhook プロバイダー（例: GitHub・Slack・独自 API）でコアルーターを使用できます。

## 1. イベント型の定義

`WebhookEvent` を拡張し、イベント型文字列をインターフェースにマッピングする型マップを定義します：

```typescript
import type { WebhookEvent } from '@kotodayori/core';

interface GitHubPushEvent extends WebhookEvent {
  type: 'push';
  data: { object: { ref: string; commits: Array<{ message: string }> } };
}

interface GitHubPREvent extends WebhookEvent {
  type: 'pull_request.opened' | 'pull_request.closed';
  data: { object: { number: number; title: string } };
}

type GitHubEventMap = {
  'push': GitHubPushEvent;
  'pull_request.opened': GitHubPREvent;
  'pull_request.closed': GitHubPREvent;
};
```

## 2. Verifier の実装

Verifier は生のペイロードとヘッダーを受け取り、リクエストを検証（例: 署名確認）して `{ event }` を返します。`Buffer | string` と `Record<string, string | undefined>` を受け付ける必要があります。

GitHub（X-Hub-Signature-256）の実装例：

```typescript
import crypto from 'crypto';
import type { Verifier } from '@kotodayori/core';

function createGitHubVerifier(secret: string): Verifier {
  return (payload, headers) => {
    const signature = headers['x-hub-signature-256'];
    if (!signature) throw new Error('x-hub-signature-256 ヘッダーがありません');

    const hmac = crypto.createHmac('sha256', secret);
    const digest = 'sha256=' + hmac.update(payload).digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))) {
      throw new Error('署名が無効です');
    }

    const body = JSON.parse(payload.toString());
    return {
      event: {
        id: headers['x-github-delivery'] ?? crypto.randomUUID(),
        type: headers['x-github-event'] ?? 'unknown',
        data: { object: body },
      },
    };
  };
}
```

署名の比較には定時間比較（例: `crypto.timingSafeEqual`）を使用し、シークレットをログ出力しないでください。

## 3. ルーターの作成とアダプターの使用

```typescript
import { WebhookRouter } from '@kotodayori/core';
import { Hono } from 'hono';
import { honoAdapter } from '@kotodayori/hono';

const router = new WebhookRouter<GitHubEventMap>();

router.on('push', async (event) => {
  console.log('プッシュ先:', event.data.object.ref);
});

router.on('pull_request.opened', async (event) => {
  console.log('PR オープン:', event.data.object.title);
});

const app = new Hono();

app.post('/github-webhook', honoAdapter(router, {
  verifier: createGitHubVerifier(process.env.GITHUB_WEBHOOK_SECRET!),
}));
```

ハンドラーは `GitHubEventMap` に従って完全に型付けされます。
