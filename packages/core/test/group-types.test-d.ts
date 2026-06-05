import { describe, it, expectTypeOf } from 'vitest';
import { WebhookRouter, type WebhookEvent, type EventHandler } from '../src/index.js';

/**
 * Type-level regression tests for `group()` / `PrefixedRouter`.
 *
 * Previously `group()` always exposed handlers as `EventHandler<WebhookEvent>`
 * (i.e. `data.object: unknown`), losing the event-map type information. These
 * tests lock in that the prefix + suffix is resolved back to the concrete
 * event type from the router's event map.
 */

interface FooCreatedEvent extends WebhookEvent {
  type: 'foo.created';
  data: { object: { fooId: string } };
}

interface FooUpdatedEvent extends WebhookEvent {
  type: 'foo.updated';
  data: { object: { fooId: string }; previous: Record<string, unknown> };
}

interface BarEvent extends WebhookEvent {
  type: 'bar.happened';
  data: { object: { barId: number } };
}

type TestEventMap = {
  'foo.created': FooCreatedEvent;
  'foo.updated': FooUpdatedEvent;
  'bar.happened': BarEvent;
};

describe('group() type inference', () => {
  it('resolves a single suffix to the concrete event type', () => {
    const router = new WebhookRouter<TestEventMap>();
    router.group('foo', (g) => {
      g.on('created', async (event) => {
        expectTypeOf(event).toEqualTypeOf<FooCreatedEvent>();
        expectTypeOf(event.data.object).toEqualTypeOf<{ fooId: string }>();
      });
    });
  });

  it('resolves an array of suffixes to the union of concrete event types', () => {
    const router = new WebhookRouter<TestEventMap>();
    router.group('foo', (g) => {
      g.on(['created', 'updated'], async (event) => {
        expectTypeOf(event).toEqualTypeOf<FooCreatedEvent | FooUpdatedEvent>();
      });
    });
  });

  it('rejects suffixes that do not exist for the prefix', () => {
    const router = new WebhookRouter<TestEventMap>();
    router.group('foo', (g) => {
      // @ts-expect-error 'happened' belongs to the 'bar' prefix, not 'foo'
      g.on('happened', async () => {});
      // @ts-expect-error 'missing' is not a valid suffix at all
      g.on('missing', async () => {});
    });
  });

  it('falls back to the open string behaviour for the default event map', () => {
    const router = new WebhookRouter();
    router.group('anything', (g) => {
      g.on('whatever', async (event) => {
        expectTypeOf(event).toEqualTypeOf<WebhookEvent>();
      });
      // Arbitrary handler shapes remain assignable for the open map.
      const handler: EventHandler<WebhookEvent> = async () => {};
      g.on('also-fine', handler);
    });
  });
});
