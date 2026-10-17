import type { EventBridgeEvent, Context } from 'aws-lambda';
import {
  dispatchWithContext,
  type ContextFactory,
  type ContextFactoryOption,
  type WebhookDispatcher,
  type WebhookEvent,
} from '@kotodayori/core';

/**
 * Options for the EventBridge adapter
 */
export interface EventBridgeAdapterOptions<TContext = EventBridgeInvocation> {
  /** Custom error handler */
  onError?: (error: Error, event: WebhookEvent) => void;
  /**
   * Builds the per-invocation context passed to handlers as their second argument.
   * Defaults to `{ event, context }` (an {@link EventBridgeInvocation}). Required when
   * the router's context type is not satisfied by `EventBridgeInvocation`. Errors are
   * handled like handler errors.
   */
  createContext?: ContextFactory<[event: EventBridgeEvent<string, unknown>, context: Context], TContext>;
}

/**
 * The default per-invocation context: the EventBridge event and the Lambda context
 */
export interface EventBridgeInvocation {
  event: EventBridgeEvent<string, unknown>;
  context: Context;
}

/**
 * Options argument for a router with context `TContext`: optional when
 * `EventBridgeInvocation` already satisfies `TContext`, and otherwise required
 * with `createContext`.
 */
export type EventBridgeAdapterOptionsArgs<TContext> = [EventBridgeInvocation] extends [TContext]
  ? [options?: EventBridgeAdapterOptions<TContext>]
  : [
      options: Omit<EventBridgeAdapterOptions<TContext>, 'createContext'> &
        ContextFactoryOption<
          EventBridgeInvocation,
          TContext,
          [event: EventBridgeEvent<string, unknown>, context: Context]
        >,
    ];

/**
 * Creates an AWS Lambda handler for processing webhook events from EventBridge
 *
 * Note: EventBridge events don't require signature verification as AWS
 * guarantees the authenticity of events delivered through EventBridge.
 *
 * @param router - A WebhookDispatcher (any object with a `dispatch(event)` method, e.g. WebhookRouter)
 * @param options - Adapter options
 * @returns Lambda handler function
 */
export function eventBridgeAdapter<TContext = unknown>(
  router: WebhookDispatcher<WebhookEvent, TContext>,
  ...[options = {}]: EventBridgeAdapterOptionsArgs<NoInfer<TContext>>
): (event: EventBridgeEvent<string, unknown>, context: Context) => Promise<void> {
  const { onError, createContext } = options as EventBridgeAdapterOptions<TContext>;

  return async (
    eventBridgeEvent: EventBridgeEvent<string, unknown>,
    lambdaContext: Context
  ): Promise<void> => {
    // Validate and extract the webhook event from the EventBridge detail
    const detail = eventBridgeEvent.detail;

    // Type validation for required fields
    if (typeof detail !== 'object' || detail === null) {
      throw new Error('Invalid event detail: must be an object');
    }

    const detailObj = detail as Record<string, unknown>;

    // Validate required fields
    if (!detailObj['id'] || typeof detailObj['id'] !== 'string') {
      throw new Error('Invalid event detail: missing or invalid "id" field');
    }

    if (!detailObj['type'] || typeof detailObj['type'] !== 'string') {
      throw new Error('Invalid event detail: missing or invalid "type" field');
    }

    if (!detailObj['data'] || typeof detailObj['data'] !== 'object' || detailObj['data'] === null) {
      throw new Error('Invalid event detail: missing or invalid "data" field');
    }

    const webhookEvent = detail as WebhookEvent;

    try {
      const invocation: EventBridgeInvocation = { event: eventBridgeEvent, context: lambdaContext };
      await dispatchWithContext(
        router,
        webhookEvent,
        createContext,
        [eventBridgeEvent, lambdaContext],
        invocation
      );
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));

      if (onError) {
        onError(error, webhookEvent);
      }

      throw error;
    }
  };
}

// Re-export core types
export { WebhookRouter, type WebhookDispatcher, type WebhookEvent, type EventHandler, type Middleware, type Verifier, type VerifyResult } from '@kotodayori/core';
