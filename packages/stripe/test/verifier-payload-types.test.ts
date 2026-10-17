import { describe, it, expect } from 'vitest';
import StripeSDK from 'stripe';
import { createStripeVerifier } from '../src/index.js';

/**
 * Uses the real Stripe SDK and real signatures (no mocks) to prove that
 * `createStripeVerifier` accepts every payload type of `Verifier`:
 * `string`, a plain `Uint8Array`, and a Node.js `Buffer` (a `Uint8Array` subclass).
 */
const secret = 'whsec_test_secret';
const stripe = new StripeSDK('sk_test_dummy');
const event = {
  id: 'evt_real_sig',
  object: 'event',
  type: 'customer.created',
  data: { object: { id: 'cus_123', object: 'customer' } },
};
// Non-ASCII on purpose: signature is over the exact UTF-8 bytes.
const body = JSON.stringify({ ...event, note: 'こんにちは' });

async function signedHeaders(payload: string): Promise<Record<string, string>> {
  const header = await stripe.webhooks.generateTestHeaderStringAsync({ payload, secret });
  return { 'stripe-signature': header };
}

describe('createStripeVerifier with real signatures', () => {
  const verifier = createStripeVerifier(stripe, secret);

  const payloads: Array<[string, () => string | Uint8Array]> = [
    ['string', () => body],
    ['plain Uint8Array', () => new TextEncoder().encode(body)],
    ['Buffer', () => Buffer.from(body, 'utf8')],
  ];

  it.each(payloads)('verifies a correctly signed %s payload', async (_name, make) => {
    const payload = make();
    if (_name === 'plain Uint8Array') {
      expect(Buffer.isBuffer(payload)).toBe(false);
    }
    const result = await verifier(payload, await signedHeaders(body));
    expect(result.event.id).toBe('evt_real_sig');
    expect(result.event.type).toBe('customer.created');
  });

  it.each(payloads)('rejects a %s payload whose body was altered', async (_name, make) => {
    const headers = await signedHeaders(body);
    const tampered = typeof make() === 'string'
      ? body.replace('cus_123', 'cus_999')
      : new TextEncoder().encode(body.replace('cus_123', 'cus_999'));
    await expect(verifier(tampered, headers)).rejects.toThrow(/signature/i);
  });
});
