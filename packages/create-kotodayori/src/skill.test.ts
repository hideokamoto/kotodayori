import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { DOCS_URL, FRAMEWORKS, NODE_REQUIREMENT, PACKAGE_MANAGERS, parseCli } from './cli.js';

/**
 * skills/create-kotodayori/SKILL.md documents this CLI for AI agents. It is plain
 * Markdown, so nothing stops it from drifting when the CLI changes. These tests
 * pin the values it states to the constants the CLI actually uses.
 */
const skillPath = new URL('../../../skills/create-kotodayori/SKILL.md', import.meta.url);
const skill = readFileSync(skillPath, 'utf-8');

function section(heading: string): string {
  const start = skill.indexOf(`\n## ${heading}\n`);
  expect(start, `section "${heading}" exists`).toBeGreaterThan(-1);
  const end = skill.indexOf('\n## ', start + 1);
  return skill.slice(start, end === -1 ? undefined : end);
}

const list = (values: readonly string[]) => values.map((value) => `\`${value}\``).join(', ');

describe('skills/create-kotodayori/SKILL.md', () => {
  it('has a name that matches its directory', () => {
    expect(skill).toMatch(/^---\nname: create-kotodayori\n/);
  });

  it('states the Node.js requirement from package.json engines', () => {
    expect(skill).toContain(`Requires Node.js ${NODE_REQUIREMENT},`);
    expect(section('Prerequisites')).toContain(`Node.js \`${NODE_REQUIREMENT}\``);
  });

  it('lists the accepted --fw and --pm values', () => {
    const behavior = section('How the CLI behaves');
    expect(behavior).toContain(`\`--fw\` accepts ${list(FRAMEWORKS)}.`);
    expect(behavior).toContain(`\`--pm\` accepts ${list(PACKAGE_MANAGERS)}.`);
  });

  it('links to the documentation page the help prints', () => {
    expect(skill).toContain(DOCS_URL);
  });

  it('only uses create-kotodayori options the CLI accepts', () => {
    const cliText = [
      section('How the CLI behaves'),
      ...skill.split('\n').filter((line) => line.includes('create-kotodayori@latest')),
    ].join('\n');
    const flags = new Set(cliText.match(/--[a-z][a-z-]*/g));
    expect(flags.size).toBeGreaterThan(0);

    for (const flag of flags) {
      expect(
        () => parseCli(['node', 'create-kotodayori', flag, 'hono']),
        `${flag} is accepted by the CLI`
      ).not.toThrow(/Unknown option/);
    }
  });
});
