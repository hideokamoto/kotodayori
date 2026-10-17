/**
 * Base interface for webhook events
 */
export interface WebhookEvent {
  id: string;
  type: string;
  data: { object: unknown };
}

/**
 * Default event map that accepts any string event type
 */
export type DefaultEventMap = Record<string, WebhookEvent>;

/**
 * Extracts the valid event suffixes for a given prefix from an event map.
 *
 * For example, given a map with keys `customer.subscription.created` and
 * `customer.subscription.deleted`, `EventSuffix<Map, 'customer.subscription'>`
 * resolves to `'created' | 'deleted'`.
 *
 * For the default (open) event map this resolves to `string`, preserving the
 * previous loosely-typed behaviour.
 */
export type EventSuffix<
  TEventMap,
  TPrefix extends string,
> = Extract<keyof TEventMap, `${TPrefix}.${string}`> extends `${TPrefix}.${infer TSuffix}`
  ? TSuffix
  : never;

/**
 * Rest arguments that carry the per-dispatch context.
 *
 * The context is required when `TContext` cannot be `undefined`, and optional
 * otherwise (including the default `unknown`), so routers that do not declare
 * a context keep the one-argument `dispatch(event)` call.
 */
export type ContextArgs<TContext> = undefined extends TContext
  ? [context?: TContext]
  : [context: TContext];

/**
 * Event handler function type
 *
 * @typeParam T - The event type
 * @typeParam TContext - The per-dispatch context passed to `dispatch()` (e.g. request bindings)
 */
export type EventHandler<T extends WebhookEvent, TContext = unknown> = (
  event: T,
  ...context: ContextArgs<TContext>
) => Promise<void>;

/**
 * Middleware function type
 *
 * @typeParam T - The event type
 * @typeParam TContext - The per-dispatch context passed to `dispatch()`
 */
export type Middleware<T extends WebhookEvent = WebhookEvent, TContext = unknown> = (
  event: T,
  next: () => Promise<void>,
  ...context: ContextArgs<TContext>
) => Promise<void>;

/**
 * Webhook verification result
 */
export interface VerifyResult<T extends WebhookEvent = WebhookEvent> {
  /** The verified webhook event */
  event: T;
}

/**
 * Webhook verifier function type
 *
 * A verifier is responsible for:
 * 1. Validating the webhook signature/authenticity
 * 2. Parsing the payload into a typed event object
 *
 * @param payload - Raw request body (string or Buffer)
 * @param headers - Request headers for signature verification
 * @returns The verified event wrapped in a VerifyResult
 * @throws Error if verification fails
 *
 * @example
 * ```typescript
 * // Stripe verifier
 * const verifier: Verifier = (payload, headers) => {
 *   const signature = headers['stripe-signature'];
 *   const event = stripe.webhooks.constructEvent(payload, signature, secret);
 *   return { event };
 * };
 *
 * // GitHub verifier
 * const verifier: Verifier = (payload, headers) => {
 *   const signature = headers['x-hub-signature-256'];
 *   // Verify HMAC signature...
 *   return { event: JSON.parse(payload) };
 * };
 * ```
 */
export type Verifier<T extends WebhookEvent = WebhookEvent> = (
  payload: string | Buffer,
  headers: Record<string, string | undefined>
) => VerifyResult<T> | Promise<VerifyResult<T>>;

/**
 * Fanout strategy options
 */
export type FanoutStrategy = 'all-or-nothing' | 'best-effort';

/**
 * Fanout options
 */
export interface FanoutOptions {
  /** Strategy for handling errors */
  strategy?: FanoutStrategy;
  /** Error handler for best-effort strategy */
  onError?: (error: Error) => void;
}

/**
 * Minimal logger contract used by Kotodayori packages.
 *
 * Only `warn` and `error` are required so that most logging libraries
 * (e.g. AWS Lambda Powertools Logger, pino, winston) or a thin wrapper
 * around an error tracker can be injected.
 */
export interface Logger {
  debug?(message: string, ...args: unknown[]): void;
  info?(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

/**
 * Default logger that forwards to the global `console`
 */
export const consoleLogger: Logger = {
  debug: (message, ...args) => console.debug(message, ...args),
  info: (message, ...args) => console.info(message, ...args),
  warn: (message, ...args) => console.warn(message, ...args),
  error: (message, ...args) => console.error(message, ...args),
};

/**
 * Logger that discards every message
 */
export const silentLogger: Logger = {
  warn: () => {},
  error: () => {},
};

/**
 * Options for WebhookRouter
 */
export interface WebhookRouterOptions {
  /** Logger used for warnings emitted by the router. Defaults to `consoleLogger`. */
  logger?: Logger;
}

/**
 * Structural contract an adapter needs from a router: just the ability to
 * dispatch a verified event. Adapters accept this interface instead of the
 * concrete `WebhookRouter` class so that a router from a *different installed
 * copy* of `@kotodayori/core` (duplicate install) is still accepted without a
 * cast — interfaces are matched structurally, whereas `WebhookRouter` is
 * nominal because of its private fields.
 */
export interface WebhookDispatcher<TEvent extends WebhookEvent = WebhookEvent, TContext = unknown> {
  dispatch(event: TEvent, ...context: ContextArgs<TContext>): Promise<void>;
}

/**
 * Builds a router context from an adapter's per-request arguments
 * (e.g. Express `(req, res)`, Lambda `(event, context)`).
 */
export type ContextFactory<TArgs extends unknown[], TContext> = (
  ...args: TArgs
) => TContext | Promise<TContext>;

/**
 * The `createContext` option of an adapter whose default context is `TDefault`:
 * optional when `TDefault` already satisfies the router's `TContext`, required otherwise,
 * so a router can never be handed a context it was not typed for.
 */
export type ContextFactoryOption<TDefault, TContext, TArgs extends unknown[]> = [TDefault] extends [
  TContext,
]
  ? { createContext?: ContextFactory<TArgs, TContext> }
  : { createContext: ContextFactory<TArgs, TContext> };

/**
 * Dispatches `event` with the context built by `createContext(...args)`, or with
 * `defaultContext` when no factory is given. For adapters: their option types
 * (see {@link ContextFactoryOption}) guarantee that `defaultContext` satisfies the
 * router's context whenever `createContext` is omitted. Errors from `createContext`
 * propagate before anything is dispatched.
 */
export async function dispatchWithContext<TEvent extends WebhookEvent, TContext, TArgs extends unknown[]>(
  router: WebhookDispatcher<TEvent, TContext>,
  event: TEvent,
  createContext: ContextFactory<TArgs, TContext> | undefined,
  args: TArgs,
  defaultContext: unknown
): Promise<void> {
  const context = createContext ? await createContext(...args) : (defaultContext as TContext);
  await (router as unknown as { dispatch(event: TEvent, context: TContext): Promise<void> }).dispatch(
    event,
    context
  );
}

/**
 * WebhookRouter - A type-safe event router for webhook events
 *
 * @typeParam TEventMap - A mapping of event type strings to their event types
 * @typeParam TContext - The per-dispatch context passed as the second argument of
 *   `dispatch()` and forwarded to every handler and middleware. Use it for values
 *   that only exist per request, such as Cloudflare Workers bindings (`c.env`).
 */
export class WebhookRouter<
  TEventMap extends Record<string, WebhookEvent> = DefaultEventMap,
  TContext = unknown,
> implements WebhookDispatcher<TEventMap[keyof TEventMap] | WebhookEvent, TContext> {
  private handlers: Map<string, EventHandler<WebhookEvent, TContext>[]> = new Map();
  private middlewares: Middleware<WebhookEvent, TContext>[] = [];
  private readonly logger: Logger;

  constructor(options: WebhookRouterOptions = {}) {
    this.logger = options.logger ?? consoleLogger;
  }

  /**
   * Register a handler for a specific event type
   *
   * @param event - The event type to handle
   * @param handler - The handler function
   * @returns this for chaining
   */
  on<T extends keyof TEventMap & string>(
    event: T,
    handler: EventHandler<TEventMap[T], TContext>
  ): this;

  /**
   * Register a handler for multiple event types
   *
   * @param events - Array of event types to handle
   * @param handler - The handler function
   * @returns this for chaining
   */
  on<T extends keyof TEventMap & string>(
    events: T[],
    handler: EventHandler<TEventMap[T], TContext>
  ): this;

  on<T extends keyof TEventMap & string>(
    eventOrEvents: T | T[],
    handler: EventHandler<TEventMap[T], TContext>
  ): this {
    const events = Array.isArray(eventOrEvents) ? eventOrEvents : [eventOrEvents];

    // Warn if empty array is passed
    if (Array.isArray(eventOrEvents) && eventOrEvents.length === 0) {
      this.logger.warn('WebhookRouter.on(): Empty event array passed. No handlers registered.');
      return this;
    }

    for (const event of events) {
      // Reject empty string event types
      if (typeof event === 'string' && event.trim() === '') {
        throw new Error('Event type cannot be an empty string or whitespace');
      }
      const existing = this.handlers.get(event) ?? [];
      existing.push(handler as EventHandler<WebhookEvent, TContext>);
      this.handlers.set(event, existing);
    }
    return this;
  }

  /**
   * Register a middleware function
   *
   * @param middleware - The middleware function
   * @returns this for chaining
   */
  use(middleware: Middleware<TEventMap[keyof TEventMap], TContext>): this {
    this.middlewares.push(middleware as Middleware<WebhookEvent, TContext>);
    return this;
  }

  /**
   * Mount a nested router with a prefix
   *
   * @param prefix - The event type prefix (e.g., 'customer.subscription')
   * @param router - The nested WebhookRouter instance. Its handlers receive this router's
   *   context, so its own context type must accept it (a router without a context always does).
   * @returns this for chaining
   */
  route<TChildContext>(
    prefix: string,
    // Routers are invariant in their context, so accept any child context that this
    // router's context is assignable to; anything else collapses the parameter to `never`.
    router: WebhookRouter<DefaultEventMap, TChildContext> &
      ([TContext] extends [TChildContext] ? unknown : never)
  ): this {
    // Reject empty prefix
    if (prefix.trim() === '') {
      throw new Error('Route prefix cannot be an empty string or whitespace');
    }

    // Copy handlers from nested router with prefixed event types
    for (const [eventType, handlers] of router.handlers) {
      const fullEventType = `${prefix}.${eventType}`;
      const existing = this.handlers.get(fullEventType) ?? [];
      // Safe: TContext is assignable to TChildContext (enforced by the parameter type)
      existing.push(...(handlers as unknown as EventHandler<WebhookEvent, TContext>[]));
      this.handlers.set(fullEventType, existing);
    }
    return this;
  }

  /**
   * Create a group of handlers with a common prefix
   *
   * @param prefix - The event type prefix (e.g., 'payment_intent')
   * @param callback - Function that receives a prefixed router
   * @returns this for chaining
   */
  group<TPrefix extends string>(
    prefix: TPrefix,
    callback: (router: PrefixedRouter<TEventMap, TPrefix, TContext>) => void
  ): this {
    // Reject empty prefix
    if (prefix.trim() === '') {
      throw new Error('Group prefix cannot be an empty string or whitespace');
    }

    const prefixedRouter = new PrefixedRouter<TEventMap, TPrefix, TContext>(prefix, this, this.logger);
    callback(prefixedRouter);
    return this;
  }

  /**
   * Register multiple handlers to be executed in parallel (fanout pattern)
   *
   * @param event - The event type to handle
   * @param handlers - Array of handler functions to execute in parallel
   * @param options - Fanout options
   * @returns this for chaining
   */
  fanout<T extends keyof TEventMap & string>(
    event: T,
    handlers: Array<EventHandler<TEventMap[T], TContext>>,
    options: FanoutOptions = {}
  ): this {
    const { strategy = 'all-or-nothing', onError } = options;

    const fanoutHandler: EventHandler<WebhookEvent, TContext> = async (evt, ...args) => {
      if (strategy === 'all-or-nothing') {
        // All-or-nothing: all handlers must succeed, or the entire operation fails
        const promises = handlers.map((handler) =>
          (handler as EventHandler<WebhookEvent, TContext>)(evt, ...args)
        );
        await Promise.all(promises);
      } else {
        // Best-effort: continue even if some handlers fail
        const promises = handlers.map((handler) =>
          (handler as EventHandler<WebhookEvent, TContext>)(evt, ...args).catch((error: unknown) => {
            if (onError) {
              onError(error instanceof Error ? error : new Error(String(error)));
            }
            return undefined;
          })
        );
        await Promise.allSettled(promises);
      }
    };

    const existing = this.handlers.get(event) ?? [];
    existing.push(fanoutHandler);
    this.handlers.set(event, existing);
    return this;
  }

  /**
   * Dispatch an event to registered handlers
   *
   * @param event - The event to dispatch
   * @param context - Per-dispatch context forwarded to handlers and middleware.
   *   Required when the router declares a `TContext` that excludes `undefined`.
   */
  async dispatch(
    event: TEventMap[keyof TEventMap] | WebhookEvent,
    ...args: ContextArgs<TContext>
  ): Promise<void> {
    const handlers = this.handlers.get(event.type) ?? [];
    // Forward exactly the arguments we were given, so a context-less dispatch keeps
    // calling handlers with the event alone.
    const runHandlers = async (): Promise<void> => {
      for (const handler of handlers) {
        await handler(event as WebhookEvent, ...args);
      }
    };

    // Build the middleware chain (reverse order for proper nesting)
    let chain = runHandlers;
    for (let i = this.middlewares.length - 1; i >= 0; i--) {
      const middleware = this.middlewares[i];
      const next = chain;
      chain = async () => {
        if (middleware) {
          let nextCalled = false;
          const wrappedNext = async () => {
            if (nextCalled) {
              throw new Error('Middleware next() function called multiple times');
            }
            nextCalled = true;
            return await next();
          };
          await middleware(event as WebhookEvent, wrappedNext, ...args);
        }
      };
    }

    await chain();
  }
}

/**
 * Helper class for group() syntax that adds prefix to event types
 *
 * @typeParam TEventMap - The parent router's event map
 * @typeParam TPrefix - The event type prefix this group is scoped to
 * @typeParam TContext - The parent router's per-dispatch context
 */
class PrefixedRouter<
  TEventMap extends Record<string, WebhookEvent> = DefaultEventMap,
  TPrefix extends string = string,
  TContext = unknown,
> {
  constructor(
    private prefix: TPrefix,
    private parent: WebhookRouter<TEventMap, TContext>,
    private logger: Logger
  ) {}

  /**
   * Register a handler for a single event type (with prefix)
   */
  on<TSuffix extends EventSuffix<TEventMap, TPrefix>>(
    event: TSuffix,
    handler: EventHandler<TEventMap[`${TPrefix}.${TSuffix}` & keyof TEventMap], TContext>
  ): this;

  /**
   * Register a handler for multiple event types (with prefix)
   */
  on<TSuffix extends EventSuffix<TEventMap, TPrefix>>(
    events: TSuffix[],
    handler: EventHandler<TEventMap[`${TPrefix}.${TSuffix}` & keyof TEventMap], TContext>
  ): this;

  on(
    eventOrEvents: string | string[],
    handler: EventHandler<never, TContext>
  ): this {
    const events = Array.isArray(eventOrEvents) ? eventOrEvents : [eventOrEvents];

    // Warn if empty array is passed
    if (Array.isArray(eventOrEvents) && eventOrEvents.length === 0) {
      this.logger.warn('PrefixedRouter.on(): Empty event array passed. No handlers registered.');
      return this;
    }

    // The parent is strongly typed, but the prefixed event name is only known
    // to be a valid key at the call site, so dispatch through the open-typed
    // router signature.
    const parent = this.parent as unknown as WebhookRouter<DefaultEventMap, TContext>;

    for (const event of events) {
      // Reject empty string event types
      if (typeof event === 'string' && event.trim() === '') {
        throw new Error('Event type cannot be an empty string or whitespace');
      }
      const fullEventType = `${this.prefix}.${event}`;
      parent.on(fullEventType, handler as EventHandler<WebhookEvent, TContext>);
    }
    return this;
  }

  /**
   * Register a middleware function for this group
   */
  use(middleware: Middleware<WebhookEvent, TContext>): this {
    // For simplicity, middleware in groups is applied to the parent router
    // A more advanced implementation could scope middleware to the group
    (this.parent as unknown as WebhookRouter<DefaultEventMap, TContext>).use(middleware);
    return this;
  }
}
