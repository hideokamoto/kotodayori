import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { FRAMEWORKS, NODE_VERSION_RANGE, PACKAGE_MANAGERS } from './cli.js';

// The distributable skill at <repo>/skills/create-kotodayori/ documents this CLI.
// These checks fail when the CLI changes and the skill is not updated with it.
const skill = readFileSync(new URL('../../../skills/create-kotodayori/SKILL.md', import.meta.url), 'utf-8');
const frontmatter = skill.slice(0, skill.indexOf('\n---', 4));

describe('skills/create-kotodayori/SKILL.md', () => {
  it('states the Node.js range from package.json engines', () => {
    expect(frontmatter).toContain(`Node.js ${NODE_VERSION_RANGE}`);
    expect(skill).toContain(`**Node.js ${NODE_VERSION_RANGE}.**`);
  });

  it('lists every framework and package manager the CLI accepts', () => {
    expect(skill).toContain(`--fw, --framework <framework>  ${FRAMEWORKS.join(' | ')}`);
    expect(skill).toContain(`--pm, --package-manager <pm>   ${PACKAGE_MANAGERS.join(' | ')}`);
  });

  it('documents every CLI flag', () => {
    for (const flag of ['--skip-install', '--skill <agents>', '--no-skill', '-h, --help', '-v, --version']) {
      expect(skill).toContain(flag);
    }
  });
});
