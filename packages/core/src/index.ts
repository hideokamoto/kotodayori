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
 * @param payload - Raw request body (string or Uint8Array). Node.js `Buffer` is a `Uint8Array`
 *   subclass, so adapters may pass one, but do not rely on `Buffer` methods: call
 *   `new TextDecoder().decode(payload)` rather than `payload.toString()`, which on a plain
 *   `Uint8Array` returns comma-separated numbers instead of the text.
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
 *   // Verify HMAC signature over the raw payload...
 *   const text = typeof payload === 'string' ? payload : new TextDecoder().decode(payload);
 *   return { event: JSON.parse(text) };
 * };
 * ```
 */
export type Verifier<T extends WebhookEvent = WebhookEvent> = (
  payload: string | Uint8Array,
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

function logUnregisteredEventType(logger: Logger, message: string): void {
  if (logger.debug) {
    logger.debug(message);
  } else if (logger.info) {
    logger.info(message);
  } else {
    logger.warn(message);
  }
}

async function runWithMiddleware<TContext>(
  event: WebhookEvent,
  middlewares: Middleware<WebhookEvent, TContext>[],
  inner: () => Promise<void>,
  ...args: ContextArgs<TContext>
): Promise<void> {
  let chain = inner;
  for (let i = middlewares.length - 1; i >= 0; i--) {
    const middleware = middlewares[i];
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
        await middleware(event, wrappedNext, ...args);
      }
    };
  }
  await chain();
}

/**
 * Logger that discards every message
 */
export const silentLogger: Logger = {
  warn: () => {},
  error: () => {},
};

/**
 * Options for WebhookRouter
 *
 * @typeParam TContext - The per-dispatch context forwarded to `onUnhandled`
 */
export interface WebhookRouterOptions<TContext = unknown> {
  /** Logger used for warnings emitted by the router. Defaults to `consoleLogger`. */
  logger?: Logger;
  /**
   * Called when a dispatched event type has no registered handlers.
   *
   * Runs inside the middleware chain like a regular handler, so middleware
   * still observes the event and errors propagate through the same path as
   * handler failures. Use it for metrics, dead-letter queues, or alerts that
   * go beyond the built-in log line.
   */
  onUnhandled?: EventHandler<WebhookEvent, TContext>;
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
 * Defers the context for one dispatch: the value built by `createContext(...args)`, or
 * `defaultContext` when no factory is given. For adapters, which pass the result to
 * {@link handleWebhook} / {@link dispatchWithContext}: their option types (see
 * {@link ContextFactoryOption}) guarantee that `defaultContext` satisfies the router's
 * context whenever `createContext` is omitted. Nothing is called until the provider is.
 */
export function contextProvider<TContext, TArgs extends unknown[]>(
  createContext: ContextFactory<TArgs, TContext> | undefined,
  args: TArgs,
  defaultContext: unknown
): () => TContext | Promise<TContext> {
  return () => (createContext ? createContext(...args) : (defaultContext as TContext));
}

/**
 * Dispatches `event` with the context from `getContext`, or with the event alone when
 * no `getContext` is given. Errors from `getContext` propagate before anything is
 * dispatched.
 */
export async function dispatchWithContext<TEvent extends WebhookEvent, TContext>(
  router: WebhookDispatcher<TEvent, TContext>,
  event: TEvent,
  getContext?: () => TContext | Promise<TContext>
): Promise<void> {
  const dispatcher = router as unknown as { dispatch(event: TEvent, ...context: unknown[]): Promise<void> };
  if (getContext) {
    await dispatcher.dispatch(event, await getContext());
  } else {
    await dispatcher.dispatch(event);
  }
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
  private readonly onUnhandled: EventHandler<WebhookEvent, TContext> | undefined;

  constructor(options: WebhookRouterOptions<TContext> = {}) {
    this.logger = options.logger ?? consoleLogger;
    this.onUnhandled = options.onUnhandled;
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

    if (Array.isArray(eventOrEvents) && eventOrEvents.length === 0) {
      this.logger.warn('WebhookRouter.on(): Empty event array passed. No handlers registered.');
      return this;
    }

    for (const event of events) {
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
    router: WebhookRouter<DefaultEventMap, TChildContext> &
      ([TContext] extends [TChildContext] ? unknown : never)
  ): this {
    if (prefix.trim() === '') {
      throw new Error('Route prefix cannot be an empty string or whitespace');
    }

    for (const [eventType, handlers] of router.handlers) {
      const fullEventType = `${prefix}.${eventType}`;
      const existing = this.handlers.get(fullEventType) ?? [];
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
        const promises = handlers.map((handler) =>
          (handler as EventHandler<WebhookEvent, TContext>)(evt, ...args)
        );
        await Promise.all(promises);
      } else {
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
    if (handlers.length === 0) {
      logUnregisteredEventType(
        this.logger,
        `No handlers registered for event type "${event.type}" (id: ${event.id})`
      );
    }
    const runHandlers = async (): Promise<void> => {
      if (handlers.length === 0) {
        await this.onUnhandled?.(event as WebhookEvent, ...args);
        return;
      }
      for (const handler of handlers) {
        await handler(event as WebhookEvent, ...args);
      }
    };

    await runWithMiddleware(event as WebhookEvent, this.middlewares, runHandlers, ...args);
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

    if (Array.isArray(eventOrEvents) && eventOrEvents.length === 0) {
      this.logger.warn('PrefixedRouter.on(): Empty event array passed. No handlers registered.');
      return this;
    }

    const parent = this.parent as unknown as WebhookRouter<DefaultEventMap, TContext>;

    for (const event of events) {
      if (typeof event === 'string' && event.trim() === '') {
        throw new Error('Event type cannot be an empty string or whitespace');
      }
      const fullEventType = `${this.prefix}.${event}`;
      parent.on(fullEventType, handler as EventHandler<WebhookEvent, TContext>);
    }
    return this;
  }

  /**
   * Register a middleware function on the parent router (not limited to this group's prefix).
   */
  use(middleware: Middleware<WebhookEvent, TContext>): this {
    (this.parent as unknown as WebhookRouter<DefaultEventMap, TContext>).use(middleware);
    return this;
  }
}

/**
 * Options shared by HTTP adapters built on {@link handleWebhook}
 */
export interface WebhookHandlerOptions<T extends WebhookEvent = WebhookEvent> {
  /** Webhook verifier function for signature validation and event parsing */
  verifier: Verifier<T>;
  /** Custom error handler, called when dispatching a verified event fails */
  onError?: (error: Error, event: T) => Promise<void> | void;
  /** Logger for adapter diagnostics such as verification failures. Defaults to `consoleLogger`. */
  logger?: Logger;
}

/**
 * Framework-agnostic HTTP result produced by {@link handleWebhook}
 */
export type WebhookHandlerResult =
  | { status: 200; body: { received: true } }
  | { status: 400 | 500; body: { error: string } };

/**
 * Runs the shared verify → dispatch → respond flow for an HTTP webhook request.
 *
 * Adapters only need to extract the raw body and headers from their framework's
 * request object and translate the returned `{ status, body }` into their
 * framework's response. The raw body is handed to the verifier as-is; it must
 * never be a parsed JSON object.
 *
 * - Empty or whitespace-only body → 400 `Request body cannot be empty`
 * - Verifier throws/rejects → 400 `Verification failed`
 * - Dispatch (or `getContext`) throws/rejects → `onError` is called (failures from `onError`
 *   are logged), then 500
 * - Otherwise → 200 `{ received: true }`
 *
 * @param router - A WebhookDispatcher (any object with a `dispatch(event)` method, e.g. WebhookRouter)
 * @param options - Verifier and optional error handler
 * @param rawBody - Raw request body (string or Uint8Array; a Node.js Buffer is accepted)
 * @param headers - Request headers; keys are lowercased before reaching the verifier
 * @param getContext - Builds the per-request context forwarded to handlers (see
 *   {@link contextProvider}); only called after verification succeeds. Omit it to
 *   dispatch the event alone.
 */
export async function handleWebhook<TEvent extends WebhookEvent = WebhookEvent, TContext = unknown>(
  router: WebhookDispatcher<TEvent, TContext>,
  options: WebhookHandlerOptions<TEvent>,
  rawBody: string | Uint8Array,
  headers: Record<string, string | undefined>,
  getContext?: () => TContext | Promise<TContext>
): Promise<WebhookHandlerResult> {
  const { verifier, onError, logger = consoleLogger } = options;

  // TextDecoder instead of Buffer#toString so this also runs where Buffer is absent (e.g. Workers)
  const bodyString = typeof rawBody === 'string' ? rawBody : new TextDecoder().decode(rawBody);
  if (!bodyString.trim()) {
    return { status: 400, body: { error: 'Request body cannot be empty' } };
  }

  const normalizedHeaders: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(headers)) {
    normalizedHeaders[key.toLowerCase()] = value;
  }

  let event: TEvent;

  try {
    const result = await verifier(rawBody, normalizedHeaders);
    event = result.event;
  } catch (err) {
    logger.error('Webhook verification failed:', err);
    return { status: 400, body: { error: 'Verification failed' } };
  }

  try {
    await dispatchWithContext(router, event, getContext);
    return { status: 200, body: { received: true } };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));

    if (onError) {
      try {
        await onError(error, event);
      } catch (onErrorFailure) {
        try {
          logger.error('onError handler failed:', onErrorFailure);
        } catch {
          // Logger failures must not prevent the 500 response.
        }
      }
    }

    return { status: 500, body: { error: 'Internal server error' } };
  }
}
