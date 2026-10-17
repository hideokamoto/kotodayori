/**
 * Smoke test run in CI so the demo does not silently break when dependencies change.
 * Exits non-zero on the first unexpected result.
 */
import { validateSignature } from '@line/bot-sdk';
import { app, type SendMode } from './app.js';
import { createCircleCIVerifier } from './circleci.js';
import { bytesToBase64, bytesToHex, hmacSha256 } from './hmac.js';

let failed = false;
function check(ok: boolean, label: string) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`);
  if (!ok) failed = true;
}

// 1. CircleCI signature: test vectors published in CircleCI's outbound webhooks docs
const circleciVectors: Array<[secret: string, body: string, hex: string]> = [
  ['secret', 'foo', '773ba44693c7553d6ee20f61ea5d2757a9a4f4a44d2841ae4e95b52e4cd62db4'],
  ['secret', 'hello world', '734cc62f32841568f45715aeb9f4d7891324e6d948e4c6c60c0621cdac48623a'],
  ['another-secret', 'lalala', 'daa220016c8f29a8b214fbfc3671aeec2145cfb1e6790184ffb38b6d0425fa00'],
];
for (const [secret, body, hex] of circleciVectors) {
  check(bytesToHex(await hmacSha256(secret, body)) === hex, `CircleCI docs vector: HMAC(${secret}, "${body}")`);
}
const rejected = await Promise.resolve(
  createCircleCIVerifier('secret')('foo', { 'circleci-signature': 'v1=not-a-valid-signature' })
).then(
  () => false,
  () => true
);
check(rejected, 'CircleCI docs example: v1=not-a-valid-signature is rejected');

// 2. LINE signature: what the demo sends must pass the official SDK's validateSignature
const lineBody = JSON.stringify({ destination: 'x', events: [] });
check(
  validateSignature(lineBody, 'channel-secret', bytesToBase64(await hmacSha256('channel-secret', lineBody))),
  'LINE signature accepted by @line/bot-sdk validateSignature'
);

// 3. Every demo scenario end to end: [scenario, mode, expected status, activity lines that must appear in order]
const cases: Array<[string, SendMode, number, string[]]> = [
  ['circleci-workflow-success', 'valid', 200, ['→ [circleci] workflow-completed', '✅ workflow "build-test-deploy" success']],
  ['circleci-workflow-failed', 'valid', 200, ['❌ workflow "build-test-deploy" failed']],
  ['circleci-job', 'valid', 200, ['→ [circleci] job-completed', '🔧 job "test" #136 success']],
  ['circleci-job', 'tampered', 400, ['⛔ [circleci] verification failed: Invalid signature']],
  ['circleci-job', 'unsigned', 400, ['⛔ [circleci] verification failed: Missing circleci-signature header']],
  ['line-text', 'valid', 200, ['→ [line] message.text', '💬 text from user: "Hello, Kotodayori!"']],
  ['line-sticker', 'valid', 200, ['🧸 sticker 446/1988']],
  ['line-batch', 'valid', 200, ['→ [line] follow', '👋 follow', '→ [line] message.text', '💬 text from user: "Thanks for adding me"']],
  ['line-unhandled', 'valid', 200, ['→ [line] message.image']],
  ['line-text', 'tampered', 400, ['⛔ [line] verification failed: Invalid signature']],
  ['line-text', 'unsigned', 400, ['⛔ [line] verification failed: Missing x-line-signature header']],
];

for (const [scenario, mode, status, expected] of cases) {
  const res = await app.request('/demo/send', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ scenario, mode }),
  });
  const result = (await res.json()) as { response: { status: number }; activity: string[] };
  // Each expected line must appear, in this order
  let cursor = 0;
  const inOrder = expected.every((text) => {
    const index = result.activity.findIndex((line, i) => i >= cursor && line.includes(text));
    cursor = index + 1;
    return index !== -1;
  });
  const handled = result.activity.some((line) => /^\s{2}\S/.test(line) && !line.includes('⛔'));
  const noHandlerRan = mode !== 'valid' || scenario !== 'line-unhandled' || !handled;
  check(
    res.status === 200 && result.response.status === status && inOrder && noHandlerRan,
    `${mode} ${scenario} -> ${result.response.status}`
  );
}

process.exit(failed ? 1 : 0);
