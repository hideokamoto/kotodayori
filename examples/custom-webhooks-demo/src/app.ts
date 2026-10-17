import { Hono } from 'hono';
import type { Verifier, WebhookEvent } from '@kotodayori/core';
import { honoAdapter } from '@kotodayori/hono';
import { createCircleCIVerifier } from './circleci.js';
import { createLineVerifier, splitLineEvents } from './line.js';
import { activity, circleciRouter, lineRouter, log } from './routers.js';
import { scenarios, type Provider } from './events.js';
import { bytesToBase64, bytesToHex, hmacSha256 } from './hmac.js';
import { renderPage } from './page.js';

// Demo-only secrets. In production, read them from environment variables.
const CIRCLECI_SECRET = 'circleci-demo-signing-secret';
const LINE_CHANNEL_SECRET = 'line-demo-channel-secret';

export type SendMode = 'valid' | 'tampered' | 'unsigned';
const sendModes: SendMode[] = ['valid', 'tampered', 'unsigned'];

// Demo-only wrapper: honoAdapter answers every verification failure with the same
// 400 "Verification failed", so record the reason to show it on the demo page
function logFailures<T extends WebhookEvent>(provider: Provider, verifier: Verifier<T>): Verifier<T> {
  return async (payload, headers) => {
    try {
      return await verifier(payload, headers);
    } catch (err) {
      log(`  ⛔ [${provider}] verification failed: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  };
}

export const app = new Hono();

app.post(
  '/webhooks/circleci',
  honoAdapter(circleciRouter, { verifier: logFailures('circleci', createCircleCIVerifier(CIRCLECI_SECRET)) })
);

// The adapter gets the splitter, not the router itself: one LINE request holds many events
app.post(
  '/webhooks/line',
  honoAdapter(splitLineEvents(lineRouter), {
    verifier: logFailures('line', createLineVerifier(LINE_CHANNEL_SECRET)),
  })
);

app.get('/', (c) => c.html(renderPage(scenarios, sendModes)));

/** How each provider signs a delivery */
async function sign(provider: Provider, body: string): Promise<Record<string, string>> {
  if (provider === 'circleci') {
    return { 'circleci-signature': `v1=${bytesToHex(await hmacSha256(CIRCLECI_SECRET, body))}` };
  }
  return { 'x-line-signature': bytesToBase64(await hmacSha256(LINE_CHANNEL_SECRET, body)) };
}

/**
 * Plays the role of CircleCI or LINE: builds a fake delivery, signs it with the demo secret,
 * and POSTs it to the matching webhook endpoint in-process.
 */
app.post('/demo/send', async (c) => {
  const { scenario: id, mode } = await c.req.json<{ scenario: string; mode: SendMode }>();
  const scenario = scenarios.find((s) => s.id === id);
  if (!scenario || !sendModes.includes(mode)) {
    return c.json({ error: 'Unknown scenario or mode' }, 400);
  }

  const payload = JSON.stringify(scenario.body(), null, 2);
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    ...scenario.headers,
    ...(mode === 'unsigned' ? {} : await sign(scenario.provider, payload)),
  };
  // 'tampered' changes the body after signing, as an attacker would
  const body = mode === 'tampered' ? payload.replace(/^\{/, '{\n  "tampered": true,') : payload;

  const path = `/webhooks/${scenario.provider}`;
  const activityStart = activity.length;
  const res = await app.request(path, { method: 'POST', headers, body });

  return c.json({
    request: { path, headers, body },
    response: { status: res.status, body: await res.json() },
    activity: activity.slice(activityStart),
  });
});
