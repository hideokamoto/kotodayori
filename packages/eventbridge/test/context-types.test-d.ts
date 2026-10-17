import { describe, it, expectTypeOf } from 'vitest';
import type { EventBridgeEvent, Context } from 'aws-lambda';
import { WebhookRouter, type WebhookEvent } from '@kotodayori/core';
import { eventBridgeAdapter, type EventBridgeInvocation } from '../src/index.js';

describe('eventBridgeAdapter per-invocation context', () => {
  it('accepts a router without a context', () => {
    eventBridgeAdapter(new WebhookRouter());
  });

  it('accepts a router whose context is EventBridgeInvocation without createContext', () => {
    const router = new WebhookRouter<Record<string, WebhookEvent>, EventBridgeInvocation>();
    router.on('t', async (_event, { event, context }) => {
      expectTypeOf(event).toEqualTypeOf<EventBridgeEvent<string, unknown>>();
      expectTypeOf(context).toEqualTypeOf<Context>();
    });
    eventBridgeAdapter(router);
  });

  it('requires createContext when EventBridgeInvocation does not satisfy the router context', () => {
    const router = new WebhookRouter<Record<string, WebhookEvent>, { requestId: string }>();
    // @ts-expect-error -- createContext is required
    eventBridgeAdapter(router);
    // @ts-expect-error -- createContext is required
    eventBridgeAdapter(router, {});
    eventBridgeAdapter(router, {
      createContext: (_event, context) => ({ requestId: context.awsRequestId }),
    });
  });

  it('checks the createContext return type', () => {
    const router = new WebhookRouter<Record<string, WebhookEvent>, { requestId: string }>();
    eventBridgeAdapter(router, {
      // @ts-expect-error -- must return `{ requestId: string }`
      createContext: () => ({ requestId: 1 }),
    });
  });
});
