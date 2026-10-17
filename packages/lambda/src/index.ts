import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { consoleLogger, type Logger, type WebhookDispatcher, type WebhookEvent, type Verifier } from '@kotodayori/core';

/**
 * Options for the Lambda adapter
 */
export interface LambdaAdapterOptions<T extends WebhookEvent = WebhookEvent, TContext = LambdaInvocation> {
  /** Webhook verifier function for signature validation and event parsing */
  verifier: Verifier<T>;
  /** Custom error handler */
  onError?: (error: Error, event?: T) => Promise<void> | void;
  /** Logger for adapter diagnostics such as verification failures. Defaults to `consoleLogger`. */
  logger?: Logger;
  /**
   * Builds the per-invocation context passed to handlers as their second argument.
   * Defaults to `{ event, context }` (a {@link LambdaInvocation}). Required when the
   * router's context type is not satisfied by `LambdaInvocation`. Errors are handled
   * like handler errors.
   */
  createContext?: (event: APIGatewayProxyEvent, context: Context) => TContext | Promise<TContext>;
}

/**
 * The default per-invocation context: the API Gateway event and the Lambda context
 */
export interface LambdaInvocation {
  event: APIGatewayProxyEvent;
  context: Context;
}

/**
 * Lambda adapter options for a router with context `TContext`: `createContext` is
 * optional when `LambdaInvocation` already satisfies `TContext`, and required otherwise.
 */
export type LambdaAdapterOptionsFor<T extends WebhookEvent, TContext> = LambdaInvocation extends TContext
  ? LambdaAdapterOptions<T, TContext>
  : LambdaAdapterOptions<T, TContext> & {
      createContext: (event: APIGatewayProxyEvent, context: Context) => TContext | Promise<TContext>;
    };

/**
 * Creates an AWS Lambda handler for handling webhooks
 *
 * The Lambda event body is used directly for signature verification.
 * API Gateway provides the raw body as a string (or base64-encoded string),
 * which is decoded and used for signature verification.
 *
 * @example
 * ```typescript
 * import { lambdaAdapter } from '@kotodayori/lambda';
 * import { createStripeVerifier, StripeWebhookRouter } from '@kotodayori/stripe';
 *
 * const router = new StripeWebhookRouter();
 *
 * export const handler = lambdaAdapter(router, {
 *   verifier: createStripeVerifier(stripe, process.env.STRIPE_WEBHOOK_SECRET!),
 * });
 * ```
 *
 * @param router - A WebhookDispatcher (any object with a `dispatch(event)` method, e.g. WebhookRouter)
 * @param options - Adapter options including a verifier function
 * @returns Lambda handler function
 */
export function lambdaAdapter<
  TEvent extends WebhookEvent = WebhookEvent,
  TContext = unknown,
>(
  router: WebhookDispatcher<NoInfer<TEvent>, TContext>,
  options: LambdaAdapterOptionsFor<TEvent, NoInfer<TContext>>
): (event: APIGatewayProxyEvent, context: Context) => Promise<APIGatewayProxyResult> {
  const { verifier, onError, logger = consoleLogger, createContext } =
    options as LambdaAdapterOptions<TEvent, TContext>;
  // Without createContext, the option types guarantee that `LambdaInvocation` satisfies TContext
  const dispatcher = router as unknown as { dispatch(event: TEvent, context: TContext): Promise<void> };

  return async (
    lambdaEvent: APIGatewayProxyEvent,
    lambdaContext: Context
  ): Promise<APIGatewayProxyResult> => {
    // Validate request body exists
    if (lambdaEvent.body == null) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Request body is required' }),
        headers: { 'Content-Type': 'application/json' },
      };
    }

    // Decode body if base64 encoded (API Gateway preserves raw bytes this way)
    const rawBody = lambdaEvent.isBase64Encoded
      ? Buffer.from(lambdaEvent.body, 'base64').toString('utf8')
      : lambdaEvent.body;

    // Validate body is not empty or whitespace-only
    if (!rawBody.trim()) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Request body cannot be empty' }),
        headers: { 'Content-Type': 'application/json' },
      };
    }

    // Collect headers for verifier (normalize to lowercase, filter out null values)
    const headers: Record<string, string | undefined> = {};
    for (const [key, value] of Object.entries(lambdaEvent.headers)) {
      if (value !== null && value !== undefined) {
        headers[key.toLowerCase()] = value;
      }
    }

    let webhookEvent: TEvent;

    // Verify signature and parse event
    try {
      const result = await verifier(rawBody, headers);
      webhookEvent = result.event;
    } catch (err) {
      logger.error('Webhook verification failed:', err);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Verification failed' }),
        headers: { 'Content-Type': 'application/json' },
      };
    }

    // Build the per-invocation context and dispatch the event
    try {
      const context = createContext
        ? await createContext(lambdaEvent, lambdaContext)
        : ({ event: lambdaEvent, context: lambdaContext } satisfies LambdaInvocation as TContext);
      await dispatcher.dispatch(webhookEvent, context);
      return {
        statusCode: 200,
        body: JSON.stringify({ received: true }),
        headers: { 'Content-Type': 'application/json' },
      };
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));

      if (onError) {
        try {
          await onError(error, webhookEvent);
        } catch {
          // Ignore errors from onError handler to preserve original error response
        }
      }

      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Internal server error' }),
        headers: { 'Content-Type': 'application/json' },
      };
    }
  };
}

// Re-export core types
export { WebhookRouter, type WebhookDispatcher, type WebhookEvent, type EventHandler, type Middleware, type Verifier, type VerifyResult } from '@kotodayori/core';
