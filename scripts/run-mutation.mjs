#!/usr/bin/env node
import { execSync } from 'node:child_process';

const packages = [
  'packages/core',
  'packages/stripe',
  'packages/zod',
  'packages/eventbridge',
  'packages/express',
  'packages/fetch',
  'packages/hono',
  'packages/lambda',
  'packages/create-kotodayori',
];

const timeBudget = process.env.MUTATOR_TIME_BUDGET ?? '600';
let failed = 0;

for (const root of packages) {
  process.stdout.write(`\n=== mutator: ${root} ===\n`);
  try {
    execSync(`pnpm exec mutator --root ${root} --time-budget ${timeBudget} --reporter text`, {
      stdio: 'inherit',
      cwd: process.cwd(),
    });
  } catch {
    failed += 1;
  }
}

if (failed > 0) {
  console.error(`\n${failed} package(s) failed the mutation run or quality gate.`);
  process.exit(1);
}