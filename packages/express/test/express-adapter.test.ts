import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Request, Response } from 'express';
import { expressAdapter } from '../src/index.js';
import { WebhookRouter, type Verifier, type WebhookEvent } from '@kotodayori/core';

describe('expressAdapter', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let router: WebhookRouter;
  let mockVerifier: Verifier<WebhookEvent>;

  const testEvent = {
    id: 'evt_123',
    type: 'payment_intent.succeeded',
    data: { object: { id: 'pi_123' } },
  };

  beforeEach(() => {
    mockReq = {
      body: Buffer.from(JSON.stringify(testEvent)),
      headers: {
        'stripe-signature': 'test_signature',
      },
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    };

    router = new WebhookRouter();

    // Create mock verifier
    mockVerifier = vi.fn().mockReturnValue({ event: testEvent });
  });

  it('should return an express middleware function', () => {
    const middleware = expressAdapter(router, {
      verifier: mockVerifier,
    });

    expect(typeof middleware).toBe('function');
  });

  it('should call registered handlers when event matches', async () => {
    const handler = vi.fn().mockResolvedValue(undefined);
    router.on('payment_intent.succeeded', handler);

    const middleware = expressAdapter(router, {
      verifier: mockVerifier,
    });

    await middleware(mockReq as Request, mockRes as Response, vi.fn());

    expect(mockVerifier).toHaveBeenCalledWith(
      mockReq.body,
      expect.objectContaining({
        'stripe-signature': 'test_signature',
      })
    );
    expect(handler).toHaveBeenCalledOnce();
    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ received: true });
  });

  it('should accept string body', async () => {
    mockReq.body = JSON.stringify(testEvent);

    const handler = vi.fn().mockResolvedValue(undefined);
    router.on('payment_intent.succeeded', handler);

    const middleware = expressAdapter(router, {
      verifier: mockVerifier,
    });

    await middleware(mockReq as Request, mockRes as Response, vi.fn());

    expect(mockVerifier).toHaveBeenCalledWith(
      JSON.stringify(testEvent),
      expect.any(Object)
    );
    expect(handler).toHaveBeenCalledOnce();
    expect(mockRes.status).toHaveBeenCalledWith(200);
  });

  it('should return 400 when body is missing', async () => {
    mockReq.body = undefined;

    const middleware = expressAdapter(router, {
      verifier: mockVerifier,
    });

    await middleware(mockReq as Request, mockRes as Response, vi.fn());

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) })
    );
  });

  it('should return 400 when body is not a Buffer or string', async () => {
    mockReq.body = { parsed: 'json' }; // Object instead of Buffer/string

    const middleware = expressAdapter(router, {
      verifier: mockVerifier,
    });

    await middleware(mockReq as Request, mockRes as Response, vi.fn());

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.stringContaining('raw Buffer or string'),
      })
    );
  });

  it('should return 400 when verifier throws', async () => {
    (mockVerifier as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new Error('Invalid signature');
    });

    const middleware = expressAdapter(router, {
      verifier: mockVerifier,
    });

    await middleware(mockReq as Request, mockRes as Response, vi.fn());

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Verification failed' })
    );
  });

  describe('logger', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should log verification failures to the injected logger', async () => {
      const verificationError = new Error('Invalid signature');
      (mockVerifier as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw verificationError;
      });
      const logger = { warn: vi.fn(), error: vi.fn() };
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      const middleware = expressAdapter(router, {
        verifier: mockVerifier,
        logger,
      });

      await middleware(mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(logger.error).toHaveBeenCalledWith('Webhook verification failed:', verificationError);
      expect(consoleError).not.toHaveBeenCalled();
    });

    it('should log verification failures to console.error by default', async () => {
      const verificationError = new Error('Invalid signature');
      (mockVerifier as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw verificationError;
      });
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      const middleware = expressAdapter(router, {
        verifier: mockVerifier,
      });

      await middleware(mockReq as Request, mockRes as Response, vi.fn());

      expect(consoleError).toHaveBeenCalledWith('Webhook verification failed:', verificationError);
    });
  });

  it('should handle handler errors with 500 status', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('Handler error'));
    router.on('payment_intent.succeeded', handler);

    const middleware = expressAdapter(router, {
      verifier: mockVerifier,
    });

    await middleware(mockReq as Request, mockRes as Response, vi.fn());

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) })
    );
  });

  it('should call custom onError handler when provided', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('Handler error'));
    const onError = vi.fn();
    router.on('payment_intent.succeeded', handler);

    const middleware = expressAdapter(router, {
      verifier: mockVerifier,
      onError,
    });

    await middleware(mockReq as Request, mockRes as Response, vi.fn());

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ type: 'payment_intent.succeeded' })
    );
  });

  it('should handle async onError handler', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('Handler error'));
    const onError = vi.fn().mockResolvedValue(undefined);
    router.on('payment_intent.succeeded', handler);

    const middleware = expressAdapter(router, {
      verifier: mockVerifier,
      onError,
    });

    await middleware(mockReq as Request, mockRes as Response, vi.fn());

    expect(onError).toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(500);
  });

  it('should not crash if onError throws', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('Handler error'));
    const onError = vi.fn().mockRejectedValue(new Error('onError failed'));
    router.on('payment_intent.succeeded', handler);

    const middleware = expressAdapter(router, {
      verifier: mockVerifier,
      onError,
    });

    await middleware(mockReq as Request, mockRes as Response, vi.fn());

    expect(onError).toHaveBeenCalled();
    // Should still return 500 response
    expect(mockRes.status).toHaveBeenCalledWith(500);
  });

  it('should return 400 when body is an empty string', async () => {
    mockReq.body = '';

    const middleware = expressAdapter(router, {
      verifier: mockVerifier,
    });

    await middleware(mockReq as Request, mockRes as Response, vi.fn());

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Request body cannot be empty' })
    );
  });

  it('should return 400 when body is whitespace-only string', async () => {
    mockReq.body = '   \n\t  ';

    const middleware = expressAdapter(router, {
      verifier: mockVerifier,
    });

    await middleware(mockReq as Request, mockRes as Response, vi.fn());

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Request body cannot be empty' })
    );
  });

  it('should return 400 when body is an empty Buffer', async () => {
    mockReq.body = Buffer.from('');

    const middleware = expressAdapter(router, {
      verifier: mockVerifier,
    });

    await middleware(mockReq as Request, mockRes as Response, vi.fn());

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Request body cannot be empty' })
    );
  });

  it('should handle multi-value headers by taking the first value', async () => {
    mockReq.headers = {
      'stripe-signature': ['first_signature', 'second_signature'],
      'content-type': 'application/json',
    } as Record<string, string | string[]>;

    const handler = vi.fn().mockResolvedValue(undefined);
    router.on('payment_intent.succeeded', handler);

    const middleware = expressAdapter(router, {
      verifier: mockVerifier,
    });

    await middleware(mockReq as Request, mockRes as Response, vi.fn());

    expect(mockVerifier).toHaveBeenCalledWith(
      mockReq.body,
      expect.objectContaining({
        'stripe-signature': 'first_signature',
      })
    );
    expect(handler).toHaveBeenCalledOnce();
    expect(mockRes.status).toHaveBeenCalledWith(200);
  });

  describe('per-request context', () => {
    it('should pass the Express request to handlers by default', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      router.on('payment_intent.succeeded', handler);

      const middleware = expressAdapter(router, { verifier: mockVerifier });
      await middleware(mockReq as Request, mockRes as Response, vi.fn());

      expect(handler).toHaveBeenCalledWith(testEvent, mockReq);
    });

    it('should pass the value built by createContext(req, res) to handlers', async () => {
      const handler = vi.fn().mockResolvedValue(undefined);
      const typedRouter = new WebhookRouter<Record<string, WebhookEvent>, { tenant: string }>();
      typedRouter.on('payment_intent.succeeded', handler);
      const createContext = vi.fn(async () => ({ tenant: 'acme' }));

      const middleware = expressAdapter(typedRouter, { verifier: mockVerifier, createContext });
      await middleware(mockReq as Request, mockRes as Response, vi.fn());

      expect(createContext).toHaveBeenCalledWith(mockReq, mockRes);
      expect(handler).toHaveBeenCalledWith(testEvent, { tenant: 'acme' });
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should return 500 and call onError when createContext throws', async () => {
      const contextError = new Error('no tenant');
      const handler = vi.fn().mockResolvedValue(undefined);
      const onError = vi.fn();
      const typedRouter = new WebhookRouter<Record<string, WebhookEvent>, { tenant: string }>();
      typedRouter.on('payment_intent.succeeded', handler);

      const middleware = expressAdapter(typedRouter, {
        verifier: mockVerifier,
        onError,
        createContext: () => {
          throw contextError;
        },
      });
      await middleware(mockReq as Request, mockRes as Response, vi.fn());

      expect(handler).not.toHaveBeenCalled();
      expect(onError).toHaveBeenCalledWith(contextError, testEvent);
      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });

  describe('responses already sent by user code', () => {
    const markSent = (res: Partial<Response>) => {
      Object.defineProperty(res, 'headersSent', { value: true, configurable: true });
    };

    it('should not send a second response when createContext responded and threw', async () => {
      const onError = vi.fn();
      const typedRouter = new WebhookRouter<Record<string, WebhookEvent>, { user: string }>();
      typedRouter.on('payment_intent.succeeded', vi.fn().mockResolvedValue(undefined));

      const middleware = expressAdapter(typedRouter, {
        verifier: mockVerifier,
        onError,
        createContext: (_req, res) => {
          res.status(401).json({ error: 'unauthorized' });
          markSent(res);
          throw new Error('unauthorized');
        },
      });

      await expect(middleware(mockReq as Request, mockRes as Response, vi.fn())).resolves.toBeUndefined();

      expect(mockRes.status).toHaveBeenCalledTimes(1);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(onError).toHaveBeenCalledOnce();
    });

    it('should not send 200 when a handler already responded through req.res', async () => {
      router.on('payment_intent.succeeded', async (_event, req) => {
        (req as Request).res?.status(202).json({ queued: true });
        markSent(mockRes);
      });
      mockReq.res = mockRes as Response;

      const middleware = expressAdapter(router, { verifier: mockVerifier });
      await middleware(mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.status).toHaveBeenCalledTimes(1);
      expect(mockRes.status).toHaveBeenCalledWith(202);
    });
  });
});
