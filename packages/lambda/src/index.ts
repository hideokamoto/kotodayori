import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { handleWebhook, type WebhookDispatcher, type WebhookEvent, type Verifier } from '@kotodayori/core';

/**
 * Options for the Lambda adapter
 */
export interface LambdaAdapterOptions<T extends WebhookEvent = WebhookEvent> {
  /** Webhook verifier function for signature validation and event parsing */
  verifier: Verifier<T>;
  /** Custom error handler */
  onError?: (error: Error, event?: T) => Promise<void> | void;
}

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
>(
  router: WebhookDispatcher<TEvent>,
  options: LambdaAdapterOptions<TEvent>
): (event: APIGatewayProxyEvent, context: Context) => Promise<APIGatewayProxyResult> {
  return async (
    lambdaEvent: APIGatewayProxyEvent,
    _context: Context
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

    const { status, body } = await handleWebhook(router, options, rawBody, headers);
    return {
      statusCode: status,
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    };
  };
}

// Re-export core types
export { WebhookRouter, type WebhookDispatcher, type WebhookEvent, type EventHandler, type Middleware, type Verifier, type VerifyResult } from '@kotodayori/core';
