import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = dirname(fileURLToPath(import.meta.url));
const fixtureDir = resolve(here, 'fixtures/no-node');
const distTypes = resolve(here, '../dist/index.d.ts');
const tscBin = createRequire(import.meta.url).resolve('typescript/bin/tsc');

function typecheckWithoutNodeTypes(): { ok: boolean; output: string } {
  try {
    const output = execFileSync(process.execPath, [tscBin, '-p', fixtureDir], {
      encoding: 'utf8',
      stdio: 'pipe',
    });
    return { ok: true, output };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string };
    return { ok: false, output: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
}

/**
 * The published declaration files must not depend on Node-only globals such as `Buffer`.
 * tsconfig.base.json loads `@types/node` for every package, so the regular `typecheck` cannot
 * catch this. This test checks the BUILT .d.ts with no `@types/node`, `skipLibCheck: false`,
 * and `lib: ES2022 + DOM`, which approximates a Cloudflare Workers / Deno type environment.
 * Requires `pnpm build` first (CI builds before testing).
 */
describe('@kotodayori/core declaration files without @types/node', () => {
  it('has been built', () => {
    expect(existsSync(distTypes), 'run `pnpm --filter @kotodayori/core build` first').toBe(true);
  });

  it('type-checks a consumer that uses Verifier and handleWebhook with Uint8Array', () => {
    const { ok, output } = typecheckWithoutNodeTypes();
    expect(output).not.toMatch(/Cannot find name 'Buffer'/);
    expect(output).toBe('');
    expect(ok).toBe(true);
  }, 60_000);
});
