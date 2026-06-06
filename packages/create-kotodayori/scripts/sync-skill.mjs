#!/usr/bin/env node
// Sync the distributable agent skill (skills/kotodayori-webhooks/SKILL.md) into
// this package's templates so it ships inside the published npm tarball.
//
// The repository keeps a single source of truth at skills/kotodayori-webhooks/.
// create-kotodayori is published standalone, so it needs its own bundled copy.
// This script copies the source into templates/skill/SKILL.md. It is wired into
// the package "prebuild" step, and skips silently when the source is missing
// (e.g. installing from a tarball where the monorepo skills dir is absent).

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(packageRoot, '..', '..');

const source = path.join(repoRoot, 'skills', 'kotodayori-webhooks', 'SKILL.md');
const destDir = path.join(packageRoot, 'templates', 'skill');
const dest = path.join(destDir, 'SKILL.md');

async function main() {
  let content;
  try {
    content = await fs.readFile(source, 'utf-8');
  } catch {
    console.log(`[sync-skill] source not found (${source}); skipping.`);
    return;
  }

  await fs.mkdir(destDir, { recursive: true });
  await fs.writeFile(dest, content);
  console.log(`[sync-skill] copied SKILL.md -> ${path.relative(packageRoot, dest)}`);
}

main().catch((error) => {
  console.error('[sync-skill] failed:', error);
  process.exit(1);
});
