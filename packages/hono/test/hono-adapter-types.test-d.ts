import { describe, it, expectTypeOf } from 'vitest';
import { honoAdapter } from '../src/index.js';
import { Hono, type Context } from 'hono';
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
      async dispatch(event: WebhookEvent): Promise<void> {
        void event;
      }
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
      async dispatch(event: CreatedEvent): Promise<void> {
        void event;
      },
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

describe('honoAdapter per-request context', () => {
  type Bindings = { DB: { prepare(sql: string): unknown } };
  type AppEnv = { Bindings: Bindings };
  const verifier: Verifier<CreatedEvent> = () => ({
    event: { id: 'e', type: 'thing.created', data: { object: { id: 'x' } } },
  });

  it('accepts a router whose context is the Hono Context without createContext', () => {
    const router = new WebhookRouter<EventMap, Context<AppEnv>>();
    router.on('thing.created', async (_event, c) => {
      expectTypeOf(c.env).toEqualTypeOf<Bindings>();
    });
    const handler = honoAdapter(router, { verifier });
    expectTypeOf(handler).toBeFunction();
  });

  it('accepts a router whose context is a structural subset of Context (e.g. { env })', () => {
    const router = new WebhookRouter<EventMap, { env: Bindings }>();
    honoAdapter(router, { verifier });
  });

  it('requires createContext when the router context is not provided by Context', () => {
    const router = new WebhookRouter<EventMap, { db: Bindings['DB'] }>();
    // @ts-expect-error -- `{ db }` is not a Hono Context, so createContext is required
    honoAdapter(router, { verifier });
    honoAdapter(router, {
      verifier,
      createContext: (c: Context<AppEnv>) => ({ db: c.env.DB }),
    });
  });

  it('checks the createContext return type against the router context', () => {
    const router = new WebhookRouter<EventMap, { db: Bindings['DB'] }>();
    // @ts-expect-error -- createContext must return `{ db }`
    honoAdapter(router, {
      verifier,
      createContext: () => ({ notDb: 1 }),
    });
  });
});

describe('honoAdapter checks bindings against the app env', () => {
  type DB = { prepare(sql: string): unknown };
  type GoodEnv = { Bindings: { DB: DB } };
  type BadEnv = { Bindings: { OTHER: string } };
  const verifier: Verifier<CreatedEvent> = () => ({
    event: { id: 'e', type: 'thing.created', data: { object: { id: 'x' } } },
  });

  it('accepts a router needing { env: { DB } } on an app that has DB', () => {
    const router = new WebhookRouter<EventMap, { env: { DB: DB } }>();
    const app = new Hono<GoodEnv>();
    app.post('/webhook', honoAdapter(router, { verifier }));
  });

  it('rejects a router needing { env: { DB } } on an app without DB', () => {
    const router = new WebhookRouter<EventMap, { env: { DB: DB } }>();
    const app = new Hono<BadEnv>();
    // @ts-expect-error -- the app's Bindings have no DB
    app.post('/webhook', honoAdapter(router, { verifier }));
  });

  it('accepts a Context<Env> router on an app with the same env', () => {
    const router = new WebhookRouter<EventMap, Context<GoodEnv>>();
    const app = new Hono<GoodEnv>();
    app.post('/webhook', honoAdapter(router, { verifier }));
    app.post('/webhook', (c) => honoAdapter(router, { verifier })(c));
  });

  it('rejects a Context<Env> router on an app with a different env', () => {
    const router = new WebhookRouter<EventMap, Context<GoodEnv>>();
    const app = new Hono<BadEnv>();
    // @ts-expect-error -- Context<BadEnv> does not provide DB
    app.post('/webhook', honoAdapter(router, { verifier }));
  });

  it('checks the env when the adapter is invoked with c directly', () => {
    const router = new WebhookRouter<EventMap, { env: { DB: DB } }>();
    const app = new Hono<BadEnv>();
    app.post('/webhook', (c) =>
      // @ts-expect-error -- c.env has no DB
      honoAdapter(router, { verifier })(c)
    );
  });

  it('rejects an annotated createContext whose env the app does not have', () => {
    const router = new WebhookRouter<EventMap, { db: DB }>();
    const app = new Hono<BadEnv>();
    app.post(
      '/webhook',
      // @ts-expect-error -- createContext expects Context<GoodEnv>, the app provides Context<BadEnv>
      honoAdapter(router, { verifier, createContext: (c: Context<GoodEnv>) => ({ db: c.env.DB }) })
    );
  });

  it('accepts an annotated createContext whose env matches the app', () => {
    const router = new WebhookRouter<EventMap, { db: DB }>();
    const app = new Hono<GoodEnv>();
    app.post(
      '/webhook',
      honoAdapter(router, { verifier, createContext: (c: Context<GoodEnv>) => ({ db: c.env.DB }) })
    );
  });
});

describe('honoAdapter createContext without a Context annotation', () => {
  const verifier: Verifier<CreatedEvent> = () => ({
    event: { id: 'e', type: 'thing.created', data: { object: { id: 'x' } } },
  });

  it('does not silently type c.env as any', () => {
    const router = new WebhookRouter<EventMap, { db: string }>();
    honoAdapter(router, {
      verifier,
      createContext: (c) => {
        expectTypeOf(c.env).not.toBeAny();
        // @ts-expect-error -- annotate `c: Context<AppEnv>` to read bindings
        return { db: c.env.DB };
      },
    });
  });

  it('still allows createContext that ignores c', () => {
    const router = new WebhookRouter<EventMap, { db: string }>();
    honoAdapter(router, { verifier, createContext: () => ({ db: 'x' }) });
  });
});
