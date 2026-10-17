import { describe, it, expectTypeOf } from 'vitest';
import type { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { WebhookRouter, type Verifier, type WebhookEvent } from '@kotodayori/core';
import { lambdaAdapter, type LambdaInvocation } from '../src/index.js';

const verifier: Verifier<WebhookEvent> = () => ({ event: { id: 'e', type: 't', data: { object: null } } });

describe('lambdaAdapter per-invocation context', () => {
  it('accepts a router whose context is LambdaInvocation without createContext', () => {
    const router = new WebhookRouter<Record<string, WebhookEvent>, LambdaInvocation>();
    router.on('t', async (_event, { event, context }) => {
      expectTypeOf(event).toEqualTypeOf<APIGatewayProxyEvent>();
      expectTypeOf(context).toEqualTypeOf<Context>();
    });
    lambdaAdapter(router, { verifier });
  });

  it('requires createContext when LambdaInvocation does not satisfy the router context', () => {
    const router = new WebhookRouter<Record<string, WebhookEvent>, { requestId: string }>();
    // @ts-expect-error -- createContext is required
    lambdaAdapter(router, { verifier });
    lambdaAdapter(router, {
      verifier,
      createContext: (_event, context) => ({ requestId: context.awsRequestId }),
    });
  });

  it('checks the createContext return type', () => {
    const router = new WebhookRouter<Record<string, WebhookEvent>, { requestId: string }>();
    lambdaAdapter(router, {
      verifier,
      // @ts-expect-error -- must return `{ requestId: string }`
      createContext: () => ({ requestId: 1 }),
    });
  });
});
