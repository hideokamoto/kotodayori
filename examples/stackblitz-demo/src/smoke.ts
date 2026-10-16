/**
 * Smoke test run in CI so the demo does not silently break when dependencies change.
 * Exits non-zero if any send mode returns an unexpected status.
 */
import Stripe from 'stripe';
import { app, type SendMode } from './app.js';

// The demo must load the Stripe SDK's web-standard build (see the comment in app.ts).
// Only that build's default crypto provider refuses synchronous signing.
try {
  new Stripe('sk_test_probe').webhooks.generateTestHeaderString({ payload: '{}', secret: 'whsec_probe' });
  console.log('FAIL the Node build of the Stripe SDK is loaded: run with --conditions=worker');
  process.exit(1);
} catch {
  console.log('PASS the web-standard build of the Stripe SDK is loaded');
}

const cases: Array<{ type: string; mode: SendMode; status: number; handled: boolean }> = [
  { type: 'payment_intent.succeeded', mode: 'valid', status: 200, handled: true },
  { type: 'customer.subscription.created', mode: 'valid', status: 200, handled: true },
  { type: 'invoice.paid', mode: 'valid', status: 200, handled: false },
  { type: 'payment_intent.succeeded', mode: 'tampered', status: 400, handled: false },
  { type: 'payment_intent.succeeded', mode: 'unsigned', status: 400, handled: false },
];

let failed = false;
for (const c of cases) {
  const res = await app.request('/demo/send', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: c.type, mode: c.mode }),
  });
  const result = (await res.json()) as { response: { status: number }; activity: string[] };
  const handled = result.activity.some((line) => line.includes(`${c.type}:`));
  const ok = res.status === 200 && result.response.status === c.status && handled === c.handled;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${c.mode} ${c.type} -> ${result.response.status} handled=${handled}`);
  if (!ok) failed = true;
}

process.exit(failed ? 1 : 0);
