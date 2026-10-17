import { describe, it, expectTypeOf } from 'vitest';
import {
  WebhookRouter,
  type WebhookEvent,
  type WebhookDispatcher,
  type EventHandler,
  type Middleware,
} from '../src/index.js';

/**
 * Type-level tests for the per-dispatch context (second argument of
 * `dispatch()`, forwarded to handlers and middleware).
 *
 * Runtimes such as Cloudflare Workers only expose bindings (D1, KV, secrets)
 * on the per-request object, while routers are defined once at module scope.
 * The context type parameter lets handlers receive those values with types.
 */

interface PaidEvent extends WebhookEvent {
  type: 'order.paid';
  data: { object: { orderId: string } };
}

interface RefundedEvent extends WebhookEvent {
  type: 'order.refunded';
  data: { object: { orderId: string } };
}

type OrderEventMap = {
  'order.paid': PaidEvent;
  'order.refunded': RefundedEvent;
};

interface AppContext {
  db: { insert(id: string): Promise<void> };
}

const paid: PaidEvent = { id: 'evt', type: 'order.paid', data: { object: { orderId: 'o' } } };
const appContext: AppContext = { db: { insert: async () => {} } };

describe('handler context typing', () => {
  it('types the second handler argument as the router context', () => {
    const router = new WebhookRouter<OrderEventMap, AppContext>();
    router.on('order.paid', async (event, context) => {
      expectTypeOf(event).toEqualTypeOf<PaidEvent>();
      expectTypeOf(context).toEqualTypeOf<AppContext>();
    });
  });

  it('keeps handlers that ignore the context valid', () => {
    const router = new WebhookRouter<OrderEventMap, AppContext>();
    const handler: EventHandler<PaidEvent> = async () => {};
    router.on('order.paid', handler);
  });

  it('defaults the context to unknown', () => {
    const router = new WebhookRouter<OrderEventMap>();
    router.on('order.paid', async (_event, context) => {
      expectTypeOf(context).toEqualTypeOf<unknown>();
    });
  });

  it('types the context for group() handlers', () => {
    const router = new WebhookRouter<OrderEventMap, AppContext>();
    router.group('order', (g) => {
      g.on('paid', async (event, context) => {
        expectTypeOf(event).toEqualTypeOf<PaidEvent>();
        expectTypeOf(context).toEqualTypeOf<AppContext>();
      });
    });
  });

  it('types the context for fanout() handlers', () => {
    const router = new WebhookRouter<OrderEventMap, AppContext>();
    router.fanout('order.paid', [
      async (_event, context) => {
        expectTypeOf(context).toEqualTypeOf<AppContext>();
      },
    ]);
  });

  it('types the third middleware argument as the router context', () => {
    const router = new WebhookRouter<OrderEventMap, AppContext>();
    router.use(async (_event, next, context) => {
      expectTypeOf(context).toEqualTypeOf<AppContext>();
      await next();
    });
  });

  it('accepts middleware that ignores the context', () => {
    const router = new WebhookRouter<OrderEventMap, AppContext>();
    const middleware: Middleware = async (_event, next) => {
      await next();
    };
    router.use(middleware);
  });
});

describe('dispatch() context argument', () => {
  it('requires the context when the router declares one', () => {
    const router = new WebhookRouter<OrderEventMap, AppContext>();
    void router.dispatch(paid, appContext);
    // @ts-expect-error -- context is required
    void router.dispatch(paid);
    // @ts-expect-error -- context must match the declared type
    void router.dispatch(paid, { db: 'not a db' });
  });

  it('keeps the context optional when none is declared', () => {
    const router = new WebhookRouter<OrderEventMap>();
    void router.dispatch(paid);
    void router.dispatch(paid, { anything: true });
  });

  it('keeps the context optional when it may be undefined', () => {
    const router = new WebhookRouter<OrderEventMap, AppContext | undefined>();
    void router.dispatch(paid);
    void router.dispatch(paid, appContext);
  });
});

describe('WebhookDispatcher context', () => {
  it('lets a context-typed router satisfy a context-typed dispatcher', () => {
    const router = new WebhookRouter<OrderEventMap, AppContext>();
    const dispatcher: WebhookDispatcher<PaidEvent, AppContext> = router;
    void dispatcher.dispatch(paid, appContext);
  });

  it('keeps one-argument dispatch on the default dispatcher', () => {
    const dispatcher: WebhookDispatcher = new WebhookRouter();
    void dispatcher.dispatch(paid);
  });

  it('rejects a router whose context the caller cannot provide', () => {
    const router = new WebhookRouter<OrderEventMap, AppContext>();
    // @ts-expect-error -- a dispatcher providing `{ other: string }` cannot drive a router that needs AppContext
    const dispatcher: WebhookDispatcher<PaidEvent, { other: string }> = router;
    void dispatcher;
  });
});

describe('route() context', () => {
  it('mounts a nested router with the same context', () => {
    const parent = new WebhookRouter<OrderEventMap, AppContext>();
    const child = new WebhookRouter<Record<string, WebhookEvent>, AppContext>();
    parent.route('order', child);
  });

  it('mounts a nested router that does not use the context', () => {
    const parent = new WebhookRouter<OrderEventMap, AppContext>();
    const child = new WebhookRouter();
    parent.route('order', child);
  });

  it('rejects a nested router that needs a different context', () => {
    const parent = new WebhookRouter<OrderEventMap, AppContext>();
    const child = new WebhookRouter<Record<string, WebhookEvent>, { other: string }>();
    // @ts-expect-error -- the parent cannot provide `{ other: string }`
    parent.route('order', child);
  });
});
