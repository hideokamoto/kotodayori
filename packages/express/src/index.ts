import type { Request, Response, NextFunction } from 'express';
import {
  contextProvider,
  handleWebhook,
  headersFromIncomingHeaders,
  type ContextFactory,
  type ContextFactoryOption,
  type Logger,
  type WebhookDispatcher,
  type WebhookEvent,
  type Verifier,
} from '@kotodayori/core';

/**
 * Options for the Express adapter
 */
export interface ExpressAdapterOptions<T extends WebhookEvent = WebhookEvent, TContext = Request> {
  /** Webhook verifier function for signature validation and event parsing */
  verifier: Verifier<T>;
  /** Custom error handler */
  onError?: (error: Error, event: T) => Promise<void> | void;
  /** Logger for adapter diagnostics such as verification failures. Defaults to `consoleLogger`. */
  logger?: Logger;
  /**
   * Builds the per-request context passed to handlers as their second argument.
   * Defaults to passing the Express `req` itself. Required when the router's context
   * type is not satisfied by `Request`. Errors are handled like handler errors.
   */
  createContext?: ContextFactory<[req: Request, res: Response], TContext>;
}

/**
 * Express adapter options for a router with context `TContext`: `createContext` is
 * optional when `Request` already satisfies `TContext`, and required otherwise.
 */
export type ExpressAdapterOptionsFor<T extends WebhookEvent, TContext> = Omit<
  ExpressAdapterOptions<T, TContext>,
  'createContext'
> &
  ContextFactoryOption<Request, TContext, [req: Request, res: Response]>;

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
  TContext = unknown,
>(
  router: WebhookDispatcher<NoInfer<TEvent>, TContext>,
  options: ExpressAdapterOptionsFor<TEvent, NoInfer<TContext>>
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  const { createContext } = options as ExpressAdapterOptions<TEvent, TContext>;

  return async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    if (req.body == null) {
      res.status(400).json({ error: 'Request body is required' });
      return;
    }

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

    const { status, body } = await handleWebhook(
      router,
      options,
      rawBody,
      headersFromIncomingHeaders(req.headers),
      contextProvider(createContext, [req, res], req)
    );
    if (!res.headersSent) {
      res.status(status).json(body);
    }
  };
}

export { WebhookRouter, type WebhookDispatcher, type WebhookEvent, type EventHandler, type Middleware, type Verifier, type VerifyResult } from '@kotodayori/core';
