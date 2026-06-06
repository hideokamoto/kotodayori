import type { Request, Response, NextFunction } from 'express';
import type { WebhookDispatcher, WebhookEvent, Verifier } from '@kotodayori/core';

/**
 * Options for the Express adapter
 */
export interface ExpressAdapterOptions<T extends WebhookEvent = WebhookEvent> {
  /** Webhook verifier function for signature validation and event parsing */
  verifier: Verifier<T>;
  /** Custom error handler */
  onError?: (error: Error, event: T) => Promise<void> | void;
}

/**
 * Creates an Express middleware for handling webhooks
 *
 * IMPORTANT: This adapter requires `req.body` to be a raw Buffer or string.
 * Use `express.raw({ type: 'application/json' })` middleware on your webhook route.
 *
 * @example
 * ```typescript
 * import express from 'express';
 * import { expressAdapter } from '@kotodayori/express';
 * import { createStripeVerifier, StripeWebhookRouter } from '@kotodayori/stripe';
 *
 * const router = new StripeWebhookRouter();
 * const app = express();
 *
 * app.post('/webhook',
 *   express.raw({ type: 'application/json' }),
 *   expressAdapter(router, {
 *     verifier: createStripeVerifier(stripe, 'whsec_...'),
 *   })
 * );
 * ```
 *
 * @param router - A WebhookDispatcher (any object with a `dispatch(event)` method, e.g. WebhookRouter)
 * @param options - Adapter options including a verifier function
 * @returns Express middleware function
 */
export function expressAdapter<
  TEvent extends WebhookEvent = WebhookEvent,
>(
  router: WebhookDispatcher<TEvent>,
  options: ExpressAdapterOptions<TEvent>
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  const { verifier, onError } = options;

  return async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    // Validate request body exists and is the correct type
    if (req.body == null) {
      res.status(400).json({ error: 'Request body is required' });
      return;
    }

    // Get raw body (Buffer or string)
    let rawBody: string | Buffer;
    if (Buffer.isBuffer(req.body)) {
      rawBody = req.body;
    } else if (typeof req.body === 'string') {
      rawBody = req.body;
    } else {
      res.status(400).json({
        error: 'Request body must be a raw Buffer or string. Use express.raw({ type: "application/json" }) middleware.',
      });
      return;
    }

    // Convert Buffer to string if needed, then validate it's not empty or whitespace-only
    const bodyString = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : rawBody;
    if (!bodyString.trim()) {
      res.status(400).json({ error: 'Request body cannot be empty' });
      return;
    }

    // Collect headers for verifier
    const headers: Record<string, string | undefined> = {};
    for (const [key, value] of Object.entries(req.headers)) {
      headers[key.toLowerCase()] = Array.isArray(value) ? value[0] : value;
    }

    let event: TEvent;

    // Verify signature and parse event
    try {
      const result = await verifier(rawBody, headers);
      event = result.event;
    } catch (err) {
      console.error('Webhook verification failed:', err);
      res.status(400).json({ error: 'Verification failed' });
      return;
    }

    // Dispatch the event
    try {
      await router.dispatch(event);
      res.status(200).json({ received: true });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));

      if (onError) {
        try {
          await onError(error, event);
        } catch {
          // Ignore errors from onError handler to preserve original error response
        }
      }

      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

// Re-export core types
export { WebhookRouter, type WebhookDispatcher, type WebhookEvent, type EventHandler, type Middleware, type Verifier, type VerifyResult } from '@kotodayori/core';
