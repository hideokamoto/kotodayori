// Type-checked WITHOUT @types/node (see ../../no-node-types.test.ts).
// It imports the built declaration files, as a Workers / Deno consumer would.
import {
  WebhookRouter,
  handleWebhook,
  type Verifier,
  type WebhookEvent,
} from '../../../dist/index.js';

const decoder = new TextDecoder();

// A verifier written for the Web-standard payload type.
export const verifier: Verifier = (payload, headers) => {
  const text = typeof payload === 'string' ? payload : decoder.decode(payload);
  if (!headers['x-signature']) throw new Error('missing signature');
  return { event: JSON.parse(text) as WebhookEvent };
};

export const router = new WebhookRouter();

// Raw bodies from fetch-style runtimes arrive as Uint8Array / string.
export async function run(bytes: Uint8Array): Promise<number> {
  const result = await handleWebhook(router, { verifier }, bytes, {});
  return result.status;
}
