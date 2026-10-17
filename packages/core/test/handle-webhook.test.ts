import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebhookRouter, handleWebhook, type Verifier, type WebhookEvent } from '../src/index.js';

const testEvent: WebhookEvent = {
  id: 'evt_123',
  type: 'test.event',
  data: { object: { id: 'obj_123' } },
};

const okVerifier: Verifier = () => ({ event: testEvent });

describe('handleWebhook', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('dispatches the verified event and returns 200 { received: true }', async () => {
    const router = new WebhookRouter();
    const handler = vi.fn(async () => {});
    router.on('test.event', handler);

    const result = await handleWebhook(router, { verifier: okVerifier }, '{"id":"evt_123"}', {});

    expect(result).toEqual({ status: 200, body: { received: true } });
    expect(handler).toHaveBeenCalledWith(testEvent);
  });

  it('passes the raw body to the verifier untouched (string)', async () => {
    const verifier = vi.fn(okVerifier);
    const rawBody = '{"id":"evt_123",  "type":"test.event"}';

    await handleWebhook(new WebhookRouter(), { verifier }, rawBody, {});

    expect(verifier).toHaveBeenCalledWith(rawBody, expect.any(Object));
  });

  it('passes the raw body to the verifier untouched (Buffer)', async () => {
    const verifier = vi.fn(okVerifier);
    const rawBody = Buffer.from('{"id":"evt_123"}', 'utf8');

    await handleWebhook(new WebhookRouter(), { verifier }, rawBody, {});

    expect(verifier.mock.calls[0]?.[0]).toBe(rawBody);
  });

  it('passes a plain Uint8Array to the verifier untouched and lets it decode with TextDecoder', async () => {
    const rawBody = new TextEncoder().encode('{"id":"evt_こんにちは"}');
    let decoded = '';
    const verifier: Verifier = (payload) => {
      decoded = typeof payload === 'string' ? payload : new TextDecoder().decode(payload);
      return { event: testEvent };
    };

    const result = await handleWebhook(new WebhookRouter(), { verifier }, rawBody, {});

    expect(result.status).toBe(200);
    expect(decoded).toBe('{"id":"evt_こんにちは"}');
  });

  it('lowercases header keys before passing them to the verifier', async () => {
    const verifier = vi.fn(okVerifier);

    await handleWebhook(new WebhookRouter(), { verifier }, '{}', {
      'Stripe-Signature': 'sig',
      'X-Custom': undefined,
    });

    expect(verifier).toHaveBeenCalledWith('{}', {
      'stripe-signature': 'sig',
      'x-custom': undefined,
    });
  });

  it.each([
    ['empty string', ''],
    ['whitespace-only string', '  \n\t '],
    ['empty Buffer', Buffer.alloc(0)],
    ['whitespace-only Buffer', Buffer.from('   ', 'utf8')],
  ])('returns 400 without calling the verifier for an %s body', async (_label, rawBody) => {
    const verifier = vi.fn(okVerifier);

    const result = await handleWebhook(new WebhookRouter(), { verifier }, rawBody, {});

    expect(result).toEqual({ status: 400, body: { error: 'Request body cannot be empty' } });
    expect(verifier).not.toHaveBeenCalled();
  });

  it('returns 400 and does not dispatch when the verifier throws', async () => {
    const router = new WebhookRouter();
    const handler = vi.fn(async () => {});
    router.on('test.event', handler);
    const verifier: Verifier = () => {
      throw new Error('Invalid signature');
    };

    const result = await handleWebhook(router, { verifier }, '{}', {});

    expect(result).toEqual({ status: 400, body: { error: 'Verification failed' } });
    expect(handler).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('returns 400 when an async verifier rejects', async () => {
    const verifier: Verifier = async () => {
      throw new Error('Invalid signature');
    };

    const result = await handleWebhook(new WebhookRouter(), { verifier }, '{}', {});

    expect(result).toEqual({ status: 400, body: { error: 'Verification failed' } });
  });

  it('does not call onError when verification fails', async () => {
    const onError = vi.fn();
    const verifier: Verifier = () => {
      throw new Error('Invalid signature');
    };

    await handleWebhook(new WebhookRouter(), { verifier, onError }, '{}', {});

    expect(onError).not.toHaveBeenCalled();
  });

  it('returns 500 and calls onError with the error and event when a handler throws', async () => {
    const router = new WebhookRouter();
    router.on('test.event', async () => {
      throw new Error('Handler failed');
    });
    const onError = vi.fn();

    const result = await handleWebhook(router, { verifier: okVerifier, onError }, '{}', {});

    expect(result).toEqual({ status: 500, body: { error: 'Internal server error' } });
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'Handler failed' }), testEvent);
  });

  it('wraps non-Error throws into an Error before calling onError', async () => {
    const router = new WebhookRouter();
    router.on('test.event', async () => {
      throw 'string error';
    });
    const onError = vi.fn();

    await handleWebhook(router, { verifier: okVerifier, onError }, '{}', {});

    const [error] = onError.mock.calls[0] ?? [];
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe('string error');
  });

  it('still returns 500 when onError itself throws or rejects', async () => {
    const router = new WebhookRouter();
    router.on('test.event', async () => {
      throw new Error('Handler failed');
    });

    const syncThrow = await handleWebhook(
      router,
      {
        verifier: okVerifier,
        onError: () => {
          throw new Error('onError failed');
        },
      },
      '{}',
      {}
    );
    const asyncReject = await handleWebhook(
      router,
      {
        verifier: okVerifier,
        onError: async () => {
          throw new Error('onError failed');
        },
      },
      '{}',
      {}
    );

    expect(syncThrow).toEqual({ status: 500, body: { error: 'Internal server error' } });
    expect(asyncReject).toEqual({ status: 500, body: { error: 'Internal server error' } });
  });

  it('accepts any structural dispatcher, not only WebhookRouter', async () => {
    const dispatch = vi.fn(async () => {});

    const result = await handleWebhook({ dispatch }, { verifier: okVerifier }, '{}', {});

    expect(result.status).toBe(200);
    expect(dispatch).toHaveBeenCalledWith(testEvent);
  });

  describe('logger', () => {
    it('logs verification failures to the injected logger instead of console', async () => {
      const logger = { warn: vi.fn(), error: vi.fn() };
      const verificationError = new Error('Invalid signature');
      const verifier: Verifier = () => {
        throw verificationError;
      };

      await handleWebhook(new WebhookRouter(), { verifier, logger }, '{}', {});

      expect(logger.error).toHaveBeenCalledWith('Webhook verification failed:', verificationError);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('defaults to console.error when no logger is given', async () => {
      const verifier: Verifier = () => {
        throw new Error('Invalid signature');
      };

      await handleWebhook(new WebhookRouter(), { verifier }, '{}', {});

      expect(consoleErrorSpy).toHaveBeenCalledWith('Webhook verification failed:', expect.any(Error));
    });
  });
});
