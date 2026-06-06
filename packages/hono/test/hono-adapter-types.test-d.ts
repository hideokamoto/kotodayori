import { describe, it, expectTypeOf } from 'vitest';
import { honoAdapter } from '../src/index.js';
import { WebhookRouter, type Verifier, type WebhookEvent, type WebhookDispatcher } from '@kotodayori/core';

/**
 * Type-level regression tests for `honoAdapter` generic inference.
 *
 * Previously the verifier event type was coupled to the router's event map
 * (`HonoAdapterOptions<TEventMap[keyof TEventMap]>`). When a verifier returned
 * a union that differed from the map (e.g. a Stripe SDK that ships events the
 * hand-maintained `StripeEventMap` doesn't have yet), inference fell back to
 * `Record<string, WebhookEvent>` and the typed router was rejected.
 *
 * The verifier event type is now an independently-inferred generic, so router
 * typing is preserved regardless of the verifier's exact event union.
 */

interface CreatedEvent extends WebhookEvent {
  type: 'thing.created';
  data: { object: { id: string } };
}

interface UpdatedEvent extends WebhookEvent {
  type: 'thing.updated';
  data: { object: { id: string } };
}

type EventMap = {
  'thing.created': CreatedEvent;
  'thing.updated': UpdatedEvent;
};

// A verifier whose event union is WIDER than the router's map (simulates SDK drift).
interface DriftEvent extends WebhookEvent {
  type: 'thing.brand_new';
  data: { object: unknown };
}

describe('honoAdapter nominal decoupling', () => {
  it('accepts any structurally-compatible dispatcher (no nominal coupling to WebhookRouter)', () => {
    class ExternalRouter {
      private secret = 1; // makes it nominally distinct from WebhookRouter
      async dispatch(_event: WebhookEvent): Promise<void> {}
    }
    const verifier: Verifier<CreatedEvent> = () => ({ event: { id: 'e', type: 'thing.created', data: { object: { id: 'x' } } } });
    const handler = honoAdapter(new ExternalRouter(), { verifier });
    expectTypeOf(handler).toBeFunction();
  });

  it('accepts a dispatcher narrowly typed to only the verified event (WebhookDispatcher<TEvent>)', () => {
    // A consumer dispatcher typed to handle ONLY their verified event, not any
    // WebhookEvent. The router param is `WebhookDispatcher<TEvent>` so this is
    // accepted; it would be rejected by a hardcoded `WebhookDispatcher<WebhookEvent>`.
    const narrowDispatcher: WebhookDispatcher<CreatedEvent> = {
      async dispatch(_event: CreatedEvent): Promise<void> {},
    };
    const verifier: Verifier<CreatedEvent> = () => ({ event: { id: 'e', type: 'thing.created', data: { object: { id: 'x' } } } });
    const handler = honoAdapter(narrowDispatcher, { verifier });
    expectTypeOf(handler).toBeFunction();
  });
});

describe('honoAdapter generic inference', () => {
  it('accepts a typed router with a verifier whose event union matches the map', () => {
    const router = new WebhookRouter<EventMap>();
    const verifier: Verifier<CreatedEvent | UpdatedEvent> = () => ({
      event: { id: 'e', type: 'thing.created', data: { object: { id: 'x' } } },
    });

    const handler = honoAdapter(router, { verifier });
    expectTypeOf(handler).toBeFunction();
  });

  it('preserves typed-router inference when the verifier union is wider (SDK drift)', () => {
    const router = new WebhookRouter<EventMap>();
    const verifier: Verifier<CreatedEvent | UpdatedEvent | DriftEvent> = () => ({
      event: { id: 'e', type: 'thing.brand_new', data: { object: null } },
    });

    // Must compile without falling back / requiring a cast on the router.
    const handler = honoAdapter(router, {
      verifier,
      onError: (_error, event) => {
        // onError receives the verifier's event type, not `unknown`.
        expectTypeOf(event).toEqualTypeOf<
          CreatedEvent | UpdatedEvent | DriftEvent | undefined
        >();
      },
    });
    expectTypeOf(handler).toBeFunction();
  });
});
