import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchAdapter } from '../src/index.js';
import { WebhookRouter, type WebhookEvent, type Verifier } from '@kotodayori/core';

const URL = 'https://example.com/webhook';

const testEvent: WebhookEvent = {
  id: 'evt_123',
  type: 'test.event',
  data: { object: { id: 'obj_123' } },
};

const okVerifier: Verifier = () => ({ event: testEvent });

function post(body: string, headers: Record<string, string> = {}): Request {
  return new Request(URL, { method: 'POST', body, headers });
}

describe('fetchAdapter', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('returns a (Request) => Promise<Response> handler', () => {
    const handler = fetchAdapter(new WebhookRouter(), { verifier: okVerifier });

    expect(typeof handler).toBe('function');
  });

  it('dispatches the verified event and responds 200 { received: true } as JSON', async () => {
    const router = new WebhookRouter();
    const handler = vi.fn(async () => {});
    router.on('test.event', handler);

    const res = await fetchAdapter(router, { verifier: okVerifier })(post('{"id":"evt_123"}'));

    expect(res).toBeInstanceOf(Response);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/^application\/json/);
    expect(await res.json()).toEqual({ received: true });
    expect(handler).toHaveBeenCalledWith(testEvent);
  });

  it('passes the raw body text to the verifier byte-for-byte', async () => {
    const verifier = vi.fn(okVerifier);
    const rawBody = '{"id":"evt_123",   "type":"test.event",\n"data":{}}';

    await fetchAdapter(new WebhookRouter(), { verifier })(post(rawBody));

    expect(verifier).toHaveBeenCalledWith(rawBody, expect.any(Object));
  });

  it('passes request headers to the verifier with lowercase keys', async () => {
    const verifier = vi.fn(okVerifier);

    await fetchAdapter(new WebhookRouter(), { verifier })(
      post('{}', { 'Stripe-Signature': 't=1,v1=abc', 'Content-Type': 'application/json' })
    );

    const headers = verifier.mock.calls[0]?.[1];
    expect(headers).toMatchObject({
      'stripe-signature': 't=1,v1=abc',
      'content-type': 'application/json',
    });
  });

  it.each(['GET', 'PUT', 'DELETE', 'PATCH'])('responds 405 with Allow: POST for %s', async (method) => {
    const verifier = vi.fn(okVerifier);
    const init: RequestInit = { method };
    if (method !== 'GET') init.body = '{}';

    const res = await fetchAdapter(new WebhookRouter(), { verifier })(new Request(URL, init));

    expect(res.status).toBe(405);
    expect(res.headers.get('allow')).toBe('POST');
    expect(await res.json()).toEqual({ error: 'Method not allowed' });
    expect(verifier).not.toHaveBeenCalled();
  });

  it.each([
    ['empty', ''],
    ['whitespace-only', '  \n '],
  ])('responds 400 for an %s body without calling the verifier', async (_label, body) => {
    const verifier = vi.fn(okVerifier);

    const res = await fetchAdapter(new WebhookRouter(), { verifier })(post(body));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Request body cannot be empty' });
    expect(verifier).not.toHaveBeenCalled();
  });

  it('responds 400 for a POST without a body', async () => {
    const res = await fetchAdapter(new WebhookRouter(), { verifier: okVerifier })(
      new Request(URL, { method: 'POST' })
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Request body cannot be empty' });
  });

  it('responds 400 and does not dispatch when verification fails', async () => {
    const router = new WebhookRouter();
    const handler = vi.fn(async () => {});
    router.on('test.event', handler);
    const verifier: Verifier = () => {
      throw new Error('Invalid signature');
    };

    const res = await fetchAdapter(router, { verifier })(post('{}'));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Verification failed' });
    expect(handler).not.toHaveBeenCalled();
  });

  it('responds 500 and calls onError with the error and event when a handler throws', async () => {
    const router = new WebhookRouter();
    router.on('test.event', async () => {
      throw new Error('Handler failed');
    });
    const onError = vi.fn();

    const res = await fetchAdapter(router, { verifier: okVerifier, onError })(post('{}'));

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Internal server error' });
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'Handler failed' }), testEvent);
  });

  it('still responds 500 when onError throws', async () => {
    const router = new WebhookRouter();
    router.on('test.event', async () => {
      throw new Error('Handler failed');
    });

    const res = await fetchAdapter(router, {
      verifier: okVerifier,
      onError: () => {
        throw new Error('onError failed');
      },
    })(post('{}'));

    expect(res.status).toBe(500);
  });

  it('can be reused across multiple requests', async () => {
    const router = new WebhookRouter();
    const handler = vi.fn(async () => {});
    router.on('test.event', handler);
    const handle = fetchAdapter(router, { verifier: okVerifier });

    const results = await Promise.all([handle(post('{}')), handle(post('{}')), handle(post('{}'))]);

    expect(results.map((r) => r.status)).toEqual([200, 200, 200]);
    expect(handler).toHaveBeenCalledTimes(3);
  });

  it('logs verification failures to the injected logger', async () => {
    const logger = { warn: vi.fn(), error: vi.fn() };
    const verificationError = new Error('Invalid signature');
    const verifier: Verifier = () => {
      throw verificationError;
    };

    await fetchAdapter(new WebhookRouter(), { verifier, logger })(post('{}'));

    expect(logger.error).toHaveBeenCalledWith('Webhook verification failed:', verificationError);
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });
});
