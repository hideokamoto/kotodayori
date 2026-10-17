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
      const major = Number.parseInt(workspacePkg.version ?? '', 10);

      expect(Number.isNaN(major)).toBe(false);
      expect(range).toBe(`^${major}.0.0`);
    });
  });
});
