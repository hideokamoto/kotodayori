import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import {
  contextProvider,
  handleWebhook,
  type ContextFactory,
  type ContextFactoryOption,
  type Logger,
  type WebhookDispatcher,
  type WebhookEvent,
  type Verifier,
} from '@kotodayori/core';

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
  createContext?: ContextFactory<[event: APIGatewayProxyEvent, context: Context], TContext>;
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
export type LambdaAdapterOptionsFor<T extends WebhookEvent, TContext> = Omit<
  LambdaAdapterOptions<T, TContext>,
  'createContext'
> &
  ContextFactoryOption<LambdaInvocation, TContext, [event: APIGatewayProxyEvent, context: Context]>;

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
  const { createContext } = options as LambdaAdapterOptions<TEvent, TContext>;

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

    // Collect headers for verifier
    const headers: Record<string, string | undefined> = {};
    for (const [key, value] of Object.entries(lambdaEvent.headers)) {
      if (value !== null && value !== undefined) {
        headers[key] = value;
      }
    }

    const invocation: LambdaInvocation = { event: lambdaEvent, context: lambdaContext };
    const { status, body } = await handleWebhook(
      router,
      options,
      rawBody,
      headers,
      contextProvider(createContext, [lambdaEvent, lambdaContext], invocation)
    );
    return {
      statusCode: status,
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    };
  };
}

// Re-export core types
export { WebhookRouter, type WebhookDispatcher, type WebhookEvent, type EventHandler, type Middleware, type Verifier, type VerifyResult } from '@kotodayori/core';
