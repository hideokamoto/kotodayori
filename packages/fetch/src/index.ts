import {
  handleWebhook,
  type WebhookDispatcher,
  type WebhookEvent,
  type WebhookHandlerOptions,
} from '@kotodayori/core';

/**
 * Options for the fetch adapter
 */
export type FetchAdapterOptions<T extends WebhookEvent = WebhookEvent> = WebhookHandlerOptions<T>;

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
 * @param router - A WebhookDispatcher (any object with a `dispatch(event)` method, e.g. WebhookRouter)
 * @param options - Adapter options including a verifier function
 * @returns Fetch handler function
 */
export function fetchAdapter<
  TEvent extends WebhookEvent = WebhookEvent,
>(
  router: WebhookDispatcher<TEvent>,
  options: FetchAdapterOptions<TEvent>
): (request: Request) => Promise<Response> {
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

    const { status, body } = await handleWebhook(router, options, rawBody, headers);
    return jsonResponse(body, status);
  };
}

// Re-export core types
export { WebhookRouter, type WebhookDispatcher, type WebhookEvent, type EventHandler, type Middleware, type Verifier, type VerifyResult } from '@kotodayori/core';
