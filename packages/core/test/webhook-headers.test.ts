import { describe, expect, it } from 'vitest';
import {
  headersFromHeadersObject,
  headersFromIncomingHeaders,
  lowercaseWebhookHeaders,
} from '../src/index.js';

describe('webhook header helpers', () => {
  it('lowercaseWebhookHeaders lowercases keys', () => {
    expect(lowercaseWebhookHeaders({ 'Stripe-Signature': 'sig', 'X-Test': '1' })).toEqual({
      'stripe-signature': 'sig',
      'x-test': '1',
    });
  });

  it('headersFromHeadersObject copies Fetch Headers', () => {
    const headers = new Headers({ 'X-A': 'a', 'X-B': 'b' });
    expect(headersFromHeadersObject(headers)).toEqual({ 'x-a': 'a', 'x-b': 'b' });
  });

  it('headersFromIncomingHeaders flattens arrays and drops null', () => {
    expect(
      headersFromIncomingHeaders({
        'content-type': 'application/json',
        'x-array': ['first', 'second'],
        'x-null': null,
        'x-missing': undefined,
      })
    ).toEqual({
      'content-type': 'application/json',
      'x-array': 'first',
    });
  });
});