import type { Request, Response, NextFunction } from 'express';
import { handleWebhook, type Logger, type WebhookDispatcher, type WebhookEvent, type Verifier } from '@kotodayori/core';

/**
 * Options for the Express adapter
 */
export interface ExpressAdapterOptions<T extends WebhookEvent = WebhookEvent> {
  /** Webhook verifier function for signature validation and event parsing */
  verifier: Verifier<T>;
  /** Custom error handler */
  onError?: (error: Error, event: T) => Promise<void> | void;
  /** Logger for adapter diagnostics such as verification failures. Defaults to `consoleLogger`. */
  logger?: Logger;
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

    // Collect headers for verifier
    const headers: Record<string, string | undefined> = {};
    for (const [key, value] of Object.entries(req.headers)) {
      headers[key] = Array.isArray(value) ? value[0] : value;
    }

    const { status, body } = await handleWebhook(router, options, rawBody, headers);
    res.status(status).json(body);
  };
}

// Re-export core types
export { WebhookRouter, type WebhookDispatcher, type WebhookEvent, type EventHandler, type Middleware, type Verifier, type VerifyResult } from '@kotodayori/core';
