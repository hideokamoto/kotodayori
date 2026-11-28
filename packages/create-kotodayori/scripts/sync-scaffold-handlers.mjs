#!/usr/bin/env node
// Canonical Stripe sample handlers live under scaffold-handlers/stripe/.
// Templates and runnable examples copy from there so payment + subscription
// stubs stay in sync. subscription-flat vs subscription-grouped is intentional:
// lambda/eventbridge templates demonstrate router.group().

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(packageRoot, '..', '..');
const stripeDir = path.join(packageRoot, 'scaffold-handlers', 'stripe');

const payment = 'payment.ts';
const flat = 'subscription-flat.ts';
const grouped = 'subscription-grouped.ts';

const flatSubscriptionDests = [
  path.join(repoRoot, 'examples', 'sample-express-stripe', 'src', 'handlers', 'subscription.ts'),
  path.join(repoRoot, 'examples', 'sample-hono-stripe', 'src', 'handlers', 'subscription.ts'),
  path.join(packageRoot, 'templates', 'express', 'src', 'handlers', 'subscription.ts'),
  path.join(packageRoot, 'templates', 'hono', 'src', 'handlers', 'subscription.ts'),
  path.join(packageRoot, 'templates', 'workers', 'src', 'handlers', 'subscription.ts'),
];

const groupedSubscriptionDests = [
  path.join(packageRoot, 'templates', 'eventbridge', 'src', 'handlers', 'subscription.ts'),
  path.join(packageRoot, 'templates', 'lambda', 'src', 'handlers', 'subscription.ts'),
];

const paymentDests = [
  path.join(repoRoot, 'examples', 'sample-express-stripe', 'src', 'handlers', payment),
  path.join(repoRoot, 'examples', 'sample-hono-stripe', 'src', 'handlers', payment),
  path.join(packageRoot, 'templates', 'eventbridge', 'src', 'handlers', payment),
  path.join(packageRoot, 'templates', 'express', 'src', 'handlers', payment),
  path.join(packageRoot, 'templates', 'hono', 'src', 'handlers', payment),
  path.join(packageRoot, 'templates', 'lambda', 'src', 'handlers', payment),
  path.join(packageRoot, 'templates', 'workers', 'src', 'handlers', payment),
];

async function copyOne(sourceName, destPaths) {
  const source = path.join(stripeDir, sourceName);
  let content;
  try {
    content = await fs.readFile(source, 'utf-8');
  } catch (error) {
    throw new Error(`[sync-scaffold-handlers] missing source ${source}: ${error}`);
  }

  for (const dest of destPaths) {
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, content);
    console.log(`[sync-scaffold-handlers] ${path.relative(repoRoot, source)} -> ${path.relative(repoRoot, dest)}`);
  }
}

async function main() {
  await copyOne(payment, paymentDests);
  await copyOne(flat, flatSubscriptionDests);
  await copyOne(grouped, groupedSubscriptionDests);
}

main().catch((error) => {
  console.error('[sync-scaffold-handlers] failed:', error);
  process.exit(1);
});