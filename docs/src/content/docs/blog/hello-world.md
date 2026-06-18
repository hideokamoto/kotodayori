---
title: Hello, Kotodayori Blog!
date: 2026-06-18
authors:
  - hideokamoto
tags:
  - announcement
excerpt: We've launched the Kotodayori blog! Stay tuned for library updates, tips, and behind-the-scenes posts.
---

Welcome to the Kotodayori blog!

This blog covers library release notes, usage tips, and development insights.

## What is Kotodayori?

Kotodayori is a Hono-inspired, type-safe webhook routing library for TypeScript.
It lets you handle webhooks from Stripe, AWS EventBridge, and more through a unified interface.

```ts
import { KotodayoriApp } from '@kotodayori/stripe';

const app = new KotodayoriApp();

app.on('customer.subscription.created', async (event) => {
  console.log('New subscription:', event.data.object.id);
});
```

We'll be posting regularly — stay tuned!
