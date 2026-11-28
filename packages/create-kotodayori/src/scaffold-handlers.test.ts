import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(packageRoot, '..', '..');
const stripeDir = path.join(packageRoot, 'scaffold-handlers', 'stripe');

async function expectDestMatches(sourceName: string, destRelative: string): Promise<void> {
  const source = await readFile(path.join(stripeDir, sourceName), 'utf-8');
  const dest = await readFile(path.join(repoRoot, destRelative), 'utf-8');
  expect(dest).toBe(source);
}

describe('sync-scaffold-handlers destinations', () => {
  it('keeps payment.ts in sync', async () => {
    const destinations = [
      'examples/sample-hono-stripe/src/handlers/payment.ts',
      'examples/sample-express-stripe/src/handlers/payment.ts',
      'packages/create-kotodayori/templates/hono/src/handlers/payment.ts',
      'packages/create-kotodayori/templates/express/src/handlers/payment.ts',
      'packages/create-kotodayori/templates/workers/src/handlers/payment.ts',
      'packages/create-kotodayori/templates/lambda/src/handlers/payment.ts',
      'packages/create-kotodayori/templates/eventbridge/src/handlers/payment.ts',
    ];
    for (const dest of destinations) {
      await expectDestMatches('payment.ts', dest);
    }
  });

  it('keeps flat subscription handlers in sync', async () => {
    const destinations = [
      'examples/sample-hono-stripe/src/handlers/subscription.ts',
      'examples/sample-express-stripe/src/handlers/subscription.ts',
      'packages/create-kotodayori/templates/hono/src/handlers/subscription.ts',
      'packages/create-kotodayori/templates/express/src/handlers/subscription.ts',
      'packages/create-kotodayori/templates/workers/src/handlers/subscription.ts',
    ];
    for (const dest of destinations) {
      await expectDestMatches('subscription-flat.ts', dest);
    }
  });

  it('keeps grouped subscription handlers in sync', async () => {
    const destinations = [
      'packages/create-kotodayori/templates/lambda/src/handlers/subscription.ts',
      'packages/create-kotodayori/templates/eventbridge/src/handlers/subscription.ts',
    ];
    for (const dest of destinations) {
      await expectDestMatches('subscription-grouped.ts', dest);
    }
  });
});