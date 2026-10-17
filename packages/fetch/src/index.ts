import {
  contextProvider,
  handleWebhook,
  type ContextFactory,
  type ContextFactoryOption,
  type WebhookDispatcher,
  type WebhookEvent,
  type WebhookHandlerOptions,
} from '@kotodayori/core';

/**
 * Options for the fetch adapter
 */
export type FetchAdapterOptions<T extends WebhookEvent = WebhookEvent, TContext = Request> =
  WebhookHandlerOptions<T> & {
    /**
     * Builds the per-request context passed to handlers as their second argument.
     * Defaults to passing the `Request` itself. Required when the router's context type
     * is not satisfied by `Request`. On Cloudflare Workers, create the handler inside
     * `fetch(request, env)` and read bindings from `env`. Errors are handled like handler
     * errors.
     */
    createContext?: ContextFactory<[request: Request], TContext>;
  };

/**
 * Fetch adapter options for a router with context `TContext`: `createContext` is optional
 * when `Request` already satisfies `TContext`, and required otherwise.
 */
export type FetchAdapterOptionsFor<T extends WebhookEvent, TContext> = WebhookHandlerOptions<T> &
  ContextFactoryOption<Request, TContext, [request: Request]>;

function jsonResponse(body: unknown, status: number, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

/**
 * Creates a Web-standard `(request: Request) => Promise<Response>` webhook handler
 *
 * Works anywhere the runtime hands you a standard `Request`: Cloudflare Workers,
 * Bun, Deno, Next.js App Router route handlers, React Router / Remix actions, etc.
 * The raw body is read with `request.text()` and passed to the verifier untouched.
 * Non-POST requests get `405 Method Not Allowed`, since the handler may be mounted
 * without a router in front of it.
 *
 * @example
 * ```typescript
 * import { fetchAdapter } from '@kotodayori/fetch';
 * import { createStripeVerifier, StripeWebhookRouter } from '@kotodayori/stripe';
 *
 * const router = new StripeWebhookRouter();
 * const handle = fetchAdapter(router, {
 *   verifier: createStripeVerifier(stripe, env.STRIPE_WEBHOOK_SECRET),
 * });
 *
 * // Cloudflare Workers / Bun / Deno
 * export default { fetch: handle };
 *
 * // Next.js App Router (app/webhook/route.ts)
 * export const POST = handle;
 *
 * // React Router v7 / Remix
 * export const action = ({ request }) => handle(request);
 * ```
 *
 * @example
 * ```typescript
 * // Cloudflare Workers: handlers reach bindings through the per-request context
 * const router = new StripeWebhookRouter<{ db: D1Database }>();
 * export default {
 *   fetch: (request: Request, env: Env) =>
 *     fetchAdapter(router, {
 *       verifier: createStripeVerifier(stripe, env.STRIPE_WEBHOOK_SECRET),
 *       createContext: () => ({ db: env.DB }),
 *     })(request),
 * };
 * ```
 *
 * @param router - A WebhookDispatcher (any object with a `dispatch(event)` method, e.g. WebhookRouter)
 * @param options - Adapter options including a verifier function
 * @returns Fetch handler function
 */
export function fetchAdapter<
  TEvent extends WebhookEvent = WebhookEvent,
  TContext = unknown,
>(
  router: WebhookDispatcher<NoInfer<TEvent>, TContext>,
  options: FetchAdapterOptionsFor<TEvent, NoInfer<TContext>>
): (request: Request) => Promise<Response> {
  const { createContext } = options as FetchAdapterOptions<TEvent, TContext>;

  return async (request: Request): Promise<Response> => {
    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405, { allow: 'POST' });
    }

    // Get raw body text for signature verification
    const rawBody = await request.text();

    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key] = value;
    });

    const { status, body } = await handleWebhook(
      router,
      options,
      rawBody,
      headers,
      contextProvider(createContext, [request], request)
    );
    return jsonResponse(body, status);
  };
}

// Re-export core types
export { WebhookRouter, type WebhookDispatcher, type WebhookEvent, type EventHandler, type Middleware, type Verifier, type VerifyResult } from '@kotodayori/core';
