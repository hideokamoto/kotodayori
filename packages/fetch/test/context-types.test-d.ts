import { describe, it, expectTypeOf } from 'vitest';
import { WebhookRouter, type Verifier, type WebhookEvent } from '@kotodayori/core';
import { fetchAdapter } from '../src/index.js';

const verifier: Verifier<WebhookEvent> = () => ({ event: { id: 'e', type: 't', data: { object: null } } });

describe('fetchAdapter per-request context', () => {
  it('accepts a router without a context', () => {
    fetchAdapter(new WebhookRouter(), { verifier });
  });

  it('accepts a router whose context is the Request without createContext', () => {
    const router = new WebhookRouter<Record<string, WebhookEvent>, Request>();
    router.on('t', async (_event, request) => {
      expectTypeOf(request).toEqualTypeOf<Request>();
    });
    fetchAdapter(router, { verifier });
  });

  it('requires createContext when Request does not satisfy the router context', () => {
    const router = new WebhookRouter<Record<string, WebhookEvent>, { db: string }>();
    // @ts-expect-error -- createContext is required
    fetchAdapter(router, { verifier });
    fetchAdapter(router, { verifier, createContext: () => ({ db: 'd1' }) });
  });

  it('checks the createContext return type', () => {
    const router = new WebhookRouter<Record<string, WebhookEvent>, { db: string }>();
    // @ts-expect-error -- createContext must return `{ db: string }`
    fetchAdapter(router, { verifier, createContext: () => ({ db: 1 }) });
  });
});
