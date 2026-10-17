import type { Context } from 'hono';
import { consoleLogger, type Logger, type WebhookDispatcher, type WebhookEvent, type Verifier } from '@kotodayori/core';

/**
 * Options for the Hono adapter
 */
export interface HonoAdapterOptions<
  T extends WebhookEvent = WebhookEvent,
  TContext = Context,
  THonoContext extends Context = Context,
> {
  /** Webhook verifier function for signature validation and event parsing */
  verifier: Verifier<T>;
  /** Custom error handler */
  onError?: (error: Error, event?: T) => Promise<void> | void;
  /** Logger for adapter diagnostics such as verification failures. Defaults to `consoleLogger`. */
  logger?: Logger;
  /**
   * Builds the per-request context passed to handlers as their second argument.
   * Defaults to passing Hono's `c` itself, so handlers can read `c.env` bindings
   * (D1, KV, secrets) on Cloudflare Workers. Required when the router's context
   * type is not satisfied by Hono's `Context`. Errors are handled like handler errors.
   */
  createContext?: (c: THonoContext) => TContext | Promise<TContext>;
}

/**
 * Any Hono context. The returned handler is generic over the caller's concrete
 * `Context<Env, Path, Input>` and intersects it with the context the router needs, so
 * an app whose `Bindings` lack what the handlers use is rejected at `app.post(...)`.
 * (Plain `Context` cannot be used here: intersecting it with `Context<Env>` makes
 * Hono's `set()` signatures conflict.)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyContext = Context<any, any, any>;

/**
 * The `c` given to an unannotated `createContext`. Its `env` / `var` expose nothing,
 * so reading a binding without annotating `c: Context<AppEnv>` is a compile error
 * instead of an untyped `any` (TypeScript cannot infer the app's env here).
 */
type UnannotatedContext = Context<{ Bindings: object; Variables: object }>;

/**
 * What a required context demands from the caller's `c`. A Hono `Context<E>` is reduced
 * to its `env` / `var` shape, because intersecting two `Context` instantiations that
 * differ in path or input also makes their `set()` signatures conflict.
 */
type RequiredOfContext<T> = T extends Context<infer E, infer _P, infer _I>
  ? (E extends { Bindings: infer B } ? { env: B } : unknown) &
      (E extends { Variables: infer V } ? { var: Readonly<V> } : unknown)
  : T;

/**
 * Creates a Hono handler for handling webhooks
 *
 * Hono's `c.req.text()` retrieves the raw request body as a string,
 * which is used directly for signature verification.
 *
 * @example
 * ```typescript
 * import { Hono } from 'hono';
 * import { honoAdapter } from '@kotodayori/hono';
 * import { createStripeVerifier, StripeWebhookRouter } from '@kotodayori/stripe';
 *
 * const router = new StripeWebhookRouter();
 * const app = new Hono();
 *
 * app.post('/webhook', honoAdapter(router, {
 *   verifier: createStripeVerifier(stripe, process.env.STRIPE_WEBHOOK_SECRET!),
 * }));
 * ```
 *
 * @example
 * ```typescript
 * // Cloudflare Workers: handlers receive `c` as their second argument
 * type AppEnv = { Bindings: { DB: D1Database } };
 * const router = new StripeWebhookRouter<Context<AppEnv>>();
 * router.on('checkout.session.completed', async (event, c) => {
 *   await c.env.DB.prepare('INSERT INTO orders (id) VALUES (?)').bind(event.data.object.id).run();
 * });
 * ```
 *
 * @param router - A WebhookDispatcher (any object with a `dispatch(event)` method, e.g. WebhookRouter)
 * @param options - Adapter options including a verifier function
 * @returns Hono handler function
 */
export function honoAdapter<
  TEvent extends WebhookEvent = WebhookEvent,
  TContext = unknown,
>(
  router: WebhookDispatcher<NoInfer<TEvent>, TContext>,
  // Without createContext, `c` itself is the handler context. Only a Context-shaped
  // TContext can be satisfied that way; otherwise this overload is skipped and the
  // next one reports the missing createContext.
  options: HonoAdapterOptions<TEvent, never> & { createContext?: never } &
    ([Context] extends [TContext] ? unknown : { createContext: never })
): <C extends AnyContext>(c: C & RequiredOfContext<TContext>) => Promise<Response>;
export function honoAdapter<
  TEvent extends WebhookEvent = WebhookEvent,
  TContext = unknown,
  THonoContext extends Context = UnannotatedContext,
>(
  router: WebhookDispatcher<NoInfer<TEvent>, TContext>,
  options: HonoAdapterOptions<TEvent, NoInfer<TContext>, THonoContext> & {
    createContext: (c: THonoContext) => NoInfer<TContext> | Promise<NoInfer<TContext>>;
  }
): <C extends AnyContext>(c: C & RequiredOfContext<THonoContext>) => Promise<Response>;
export function honoAdapter<TEvent extends WebhookEvent, TContext>(
  router: WebhookDispatcher<TEvent, TContext>,
  options: HonoAdapterOptions<TEvent, TContext>
): (c: Context) => Promise<Response> {
  const { verifier, onError, logger = consoleLogger, createContext } = options;
  // Without createContext, the overloads require the caller's `c` to satisfy TContext
  const dispatcher = router as unknown as { dispatch(event: TEvent, context: TContext): Promise<void> };

  return async (c: Context): Promise<Response> => {
    // Get raw body text for signature verification
    const rawBody = await c.req.text();

    if (!rawBody.trim()) {
      return c.json({ error: 'Request body cannot be empty' }, 400);
    }

    // Collect headers for verifier
    const headers: Record<string, string | undefined> = {};
    c.req.raw.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    let webhookEvent: TEvent;

    // Verify signature and parse event
    try {
      const result = await verifier(rawBody, headers);
      webhookEvent = result.event;
    } catch (err) {
      logger.error('Webhook verification failed:', err);
      return c.json({ error: 'Verification failed' }, 400);
    }

    // Build the per-request context and dispatch the event
    try {
      const context = createContext ? await createContext(c) : (c as TContext);
      await dispatcher.dispatch(webhookEvent, context);
      return c.json({ received: true }, 200);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));

      if (onError) {
        try {
          await onError(error, webhookEvent);
        } catch {
          // Ignore errors from onError handler to preserve original error response
        }
      }

      return c.json({ error: 'Internal server error' }, 500);
    }
  };
}

// Re-export core types
export { WebhookRouter, type WebhookDispatcher, type WebhookEvent, type EventHandler, type Middleware, type Verifier, type VerifyResult } from '@kotodayori/core';
