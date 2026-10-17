import { describe, it, expectTypeOf } from 'vitest';
import type { Request } from 'express';
import { WebhookRouter, type Verifier, type WebhookEvent } from '@kotodayori/core';
import { expressAdapter } from '../src/index.js';

const verifier: Verifier<WebhookEvent> = () => ({ event: { id: 'e', type: 't', data: { object: null } } });

describe('expressAdapter per-request context', () => {
  it('accepts a router whose context is the Express Request without createContext', () => {
    const router = new WebhookRouter<Record<string, WebhookEvent>, Request>();
    router.on('t', async (_event, req) => {
      expectTypeOf(req).toEqualTypeOf<Request>();
    });
    expressAdapter(router, { verifier });
  });

  it('requires createContext when Request does not satisfy the router context', () => {
    const router = new WebhookRouter<Record<string, WebhookEvent>, { tenant: string }>();
    // @ts-expect-error -- createContext is required
    expressAdapter(router, { verifier });
    expressAdapter(router, {
      verifier,
      createContext: (req, res) => {
        expectTypeOf(res.locals).toBeObject();
        return { tenant: String(req.headers['x-tenant']) };
      },
    });
  });

  it('checks the createContext return type', () => {
    const router = new WebhookRouter<Record<string, WebhookEvent>, { tenant: string }>();
    expressAdapter(router, {
      verifier,
      // @ts-expect-error -- must return `{ tenant: string }`
      createContext: () => ({ tenant: 1 }),
    });
  });
});
