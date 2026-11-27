import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Scaffolded projects install `@kotodayori/*` from npm, so the ranges in the template
 * package.json files must follow the major version the workspace packages are at.
 * Otherwise a new major (for example 2.0.0) is published but `create-kotodayori`
 * keeps generating projects that resolve the previous major.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const templatesDir = path.resolve(here, '../templates');
const packagesDir = path.resolve(here, '../..');

interface PackageJson {
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

function readJson(file: string): PackageJson {
  return JSON.parse(fs.readFileSync(file, 'utf8')) as PackageJson;
}

const templates = fs
  .readdirSync(templatesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(templatesDir, entry.name, 'package.json')))
  .map((entry) => entry.name);

describe('template package.json', () => {
  it('finds the scaffold templates', () => {
    expect(templates).toEqual(expect.arrayContaining(['hono', 'express', 'lambda', 'eventbridge']));
  });

  describe.each(templates)('%s template', (template) => {
    const pkg = readJson(path.join(templatesDir, template, 'package.json'));
    const kotodayoriDeps = Object.entries({ ...pkg.dependencies, ...pkg.devDependencies }).filter(([name]) =>
      name.startsWith('@kotodayori/')
    );

    it('depends on at least one @kotodayori package', () => {
      expect(kotodayoriDeps.length).toBeGreaterThan(0);
    });

    it.each(kotodayoriDeps)('%s range follows the current workspace major (%s)', (name, range) => {
      const workspacePkg = readJson(path.join(packagesDir, name.replace('@kotodayori/', ''), 'package.json'));
      const [major, minor] = (workspacePkg.version ?? '').split('.').map(Number);

      expect(Number.isNaN(major)).toBe(false);
      // ^0.x.y pins the minor as well (>=0.x.y <0.(x+1).0), so pre-1.0 packages
      // must carry their minor in the range.
      expect(range).toBe(major === 0 ? `^0.${minor}.0` : `^${major}.0.0`);
    });
  });
});
describe('workers template (Cloudflare Workers)', () => {
  const workersDir = path.join(templatesDir, 'workers');

  it('has a src/index.ts that serves webhooks through the fetch adapter', () => {
    const indexPath = path.join(workersDir, 'src', 'index.ts');
    expect(fs.existsSync(indexPath)).toBe(true);
    const source = fs.readFileSync(indexPath, 'utf8');
    expect(source).toContain('@kotodayori/fetch');
    expect(source).toContain('fetchAdapter');
    expect(source).toMatch(/export\s+default/);
  });

  it('runs wrangler dev from the dev script', () => {
    const pkg = readJson(path.join(workersDir, 'package.json')) as PackageJson & {
      scripts?: Record<string, string>;
    };
    expect(pkg.scripts?.['dev']).toContain('wrangler dev');
    expect(pkg.devDependencies?.['wrangler']).toBeDefined();
    expect(pkg.dependencies?.['@kotodayori/fetch']).toBeDefined();
  });

  it('ships a wrangler config pointing at src/index.ts', () => {
    const wranglerPath = path.join(workersDir, 'wrangler.jsonc');
    expect(fs.existsSync(wranglerPath)).toBe(true);
    expect(fs.readFileSync(wranglerPath, 'utf8')).toContain('src/index.ts');
  });
});
describe('template Stripe client', () => {
  it.each(templates)('%s does not pin apiVersion (drifts as stripe releases)', (template) => {
    const indexPath = path.join(templatesDir, template, 'src', 'index.ts');
    if (!fs.existsSync(indexPath)) {
      return;
    }
    const source = fs.readFileSync(indexPath, 'utf8');
    expect(source).not.toMatch(/apiVersion:\s*['"]20/);
  });
});

describe('hono template Node.js entry point', () => {
  const honoDir = path.join(templatesDir, 'hono');

  it('has a src/server.ts that serves the app with @hono/node-server', () => {
    const serverPath = path.join(honoDir, 'src', 'server.ts');
    expect(fs.existsSync(serverPath)).toBe(true);
    const source = fs.readFileSync(serverPath, 'utf8');
    expect(source).toContain('@hono/node-server');
    expect(source).toContain('serve(');
  });

  it('declares @hono/node-server as a dependency', () => {
    const pkg = readJson(path.join(honoDir, 'package.json'));
    expect(pkg.dependencies?.['@hono/node-server']).toBeDefined();
  });

  it('runs the Node entry point from dev/start scripts', () => {
    const pkg = readJson(path.join(honoDir, 'package.json')) as PackageJson & {
      scripts?: Record<string, string>;
    };
    expect(pkg.scripts?.['dev']).toContain('src/server.ts');
    expect(pkg.scripts?.['start']).toContain('dist/server.js');
  });
});
