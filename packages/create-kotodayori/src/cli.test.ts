import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  parseCli,
  parseSkillOption,
  DOCS_URL,
  FRAMEWORKS,
  NODE_REQUIREMENT,
  PACKAGE_MANAGERS,
} from './cli.js';

const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf-8'));

function captureHelp(): string {
  const info = vi.spyOn(console, 'info').mockImplementation(() => {});
  const result = parseCli(['node', 'create-kotodayori', '--help']);
  const output = info.mock.calls.map((call) => call.join(' ')).join('\n');
  info.mockRestore();
  expect(result).toEqual({ exit: true });
  return output;
}

describe('CLI Parser', () => {
  describe('Project Name', () => {
    it('should parse project name from first argument', () => {
      const options = parseCli(['node', 'create-kotodayori', 'my-project']);
      expect(options.projectName).toBe('my-project');
    });

    it('should return undefined when no project name is provided', () => {
      const options = parseCli(['node', 'create-kotodayori']);
      expect(options.projectName).toBeUndefined();
    });
  });

  describe('Framework Option', () => {
    it('should parse --fw flag', () => {
      const options = parseCli(['node', 'create-kotodayori', '--fw', 'hono']);
      expect(options.framework).toBe('hono');
    });

    it('should parse --framework flag', () => {
      const options = parseCli(['node', 'create-kotodayori', '--framework', 'express']);
      expect(options.framework).toBe('express');
    });

    it('should use first specified value when both --fw and --framework are provided', () => {
      const options = parseCli(['node', 'create-kotodayori', '--fw', 'hono', '--framework', 'express']);
      // cac uses the first value when aliases are provided
      expect(options.framework).toBe('hono');
    });

    it('should reject the same flag given more than once', () => {
      // cac collects a repeated flag into an array, which is not a single framework.
      expect(() =>
        parseCli(['node', 'create-kotodayori', '--fw', 'hono', '--fw', 'express'])
      ).toThrow(/Invalid value for --framework/);
    });

    it('should reject an unsupported framework before anything is created', () => {
      expect(() => parseCli(['node', 'create-kotodayori', '--fw', 'next'])).toThrow(
        'Invalid value for --framework: "next". Expected one of: hono, express, lambda, eventbridge.'
      );
    });

    it('should return undefined when no framework is specified', () => {
      const options = parseCli(['node', 'create-kotodayori']);
      expect(options.framework).toBeUndefined();
    });
  });

  describe('Package Manager Option', () => {
    it('should parse --pm flag', () => {
      const options = parseCli(['node', 'create-kotodayori', '--pm', 'pnpm']);
      expect(options.packageManager).toBe('pnpm');
    });

    it('should parse --package-manager flag', () => {
      const options = parseCli(['node', 'create-kotodayori', '--package-manager', 'npm']);
      expect(options.packageManager).toBe('npm');
    });

    it('should accept all package manager types', () => {
      const managers = ['pnpm', 'npm', 'yarn', 'bun'];

      managers.forEach(pm => {
        const options = parseCli(['node', 'create-kotodayori', '--pm', pm]);
        expect(options.packageManager).toBe(pm);
      });
    });

    it('should reject an unsupported package manager', () => {
      expect(() => parseCli(['node', 'create-kotodayori', '--pm', 'deno'])).toThrow(
        /Invalid value for --package-manager: "deno"/
      );
    });

    it('should return undefined when no package manager is specified', () => {
      const options = parseCli(['node', 'create-kotodayori']);
      expect(options.packageManager).toBeUndefined();
    });
  });

  describe('Skip Install Option', () => {
    it('should parse --skip-install flag', () => {
      const options = parseCli(['node', 'create-kotodayori', '--skip-install']);
      expect(options.skipInstall).toBe(true);
    });

    it('should default to undefined when flag is not provided', () => {
      const options = parseCli(['node', 'create-kotodayori']);
      expect(options.skipInstall).toBeUndefined();
    });

    it('should parse --no-skip-install as an explicit install', () => {
      const options = parseCli(['node', 'create-kotodayori', '--no-skip-install']);
      expect(options.skipInstall).toBe(false);
    });
  });

  describe('Agent Skill Option', () => {
    it('should parse a single agent', () => {
      const options = parseCli(['node', 'create-kotodayori', '--skill', 'claude-code']);
      expect(options.agentSkills).toEqual(['claude-code']);
    });

    it('should parse a comma-separated list of agents', () => {
      const options = parseCli(['node', 'create-kotodayori', '--skill', 'claude-code,cursor']);
      expect(options.agentSkills).toEqual(['claude-code', 'cursor']);
    });

    it('should expand "all" to every supported agent', () => {
      const options = parseCli(['node', 'create-kotodayori', '--skill', 'all']);
      expect(options.agentSkills).toEqual(['claude-code', 'cursor']);
    });

    it('should treat "none" as an explicit empty selection', () => {
      const options = parseCli(['node', 'create-kotodayori', '--skill', 'none']);
      expect(options.agentSkills).toEqual([]);
    });

    it('should treat --no-skill as an explicit empty selection', () => {
      const options = parseCli(['node', 'create-kotodayori', '--no-skill']);
      expect(options.agentSkills).toEqual([]);
    });

    it('should be undefined when no skill flag is provided', () => {
      const options = parseCli(['node', 'create-kotodayori']);
      expect(options.agentSkills).toBeUndefined();
    });
  });

  describe('parseSkillOption', () => {
    it('returns undefined when the flag is absent', () => {
      expect(parseSkillOption(undefined)).toBeUndefined();
    });

    it('returns [] for --no-skill (false)', () => {
      expect(parseSkillOption(false)).toEqual([]);
    });

    it('accepts the "claude" alias', () => {
      expect(parseSkillOption('claude')).toEqual(['claude-code']);
    });

    it('deduplicates repeated agents', () => {
      expect(parseSkillOption('cursor,cursor')).toEqual(['cursor']);
    });

    it('ignores unknown tokens', () => {
      expect(parseSkillOption('cursor,bogus')).toEqual(['cursor']);
    });

    it('is case and whitespace insensitive', () => {
      expect(parseSkillOption(' Claude-Code , CURSOR ')).toEqual(['claude-code', 'cursor']);
    });
  });

  describe('Combined Options', () => {
    it('should parse all options together', () => {
      const options = parseCli([
        'node',
        'create-kotodayori',
        'my-webhook-handler',
        '--fw',
        'hono',
        '--pm',
        'pnpm',
        '--skip-install',
      ]);

      expect(options.projectName).toBe('my-webhook-handler');
      expect(options.framework).toBe('hono');
      expect(options.packageManager).toBe('pnpm');
      expect(options.skipInstall).toBe(true);
    });

    it('should handle options in any order', () => {
      const options = parseCli([
        'node',
        'create-kotodayori',
        '--skip-install',
        '--pm',
        'npm',
        'test-project',
        '--framework',
        'lambda',
      ]);

      expect(options.projectName).toBe('test-project');
      expect(options.framework).toBe('lambda');
      expect(options.packageManager).toBe('npm');
      expect(options.skipInstall).toBe(true);
    });
  });

  describe('Unknown options', () => {
    it('should reject options that are not defined', () => {
      expect(() => parseCli(['node', 'create-kotodayori', 'app', '--dry-run'])).toThrow(
        /Unknown option --dryRun/
      );
    });
  });

  describe('--help and --version', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should stop after printing the version', () => {
      const info = vi.spyOn(console, 'info').mockImplementation(() => {});
      expect(parseCli(['node', 'create-kotodayori', '--version'])).toEqual({ exit: true });
      expect(info.mock.calls[0]?.[0]).toContain(`create-kotodayori/${packageJson.version}`);
    });

    it('should list every option the parser accepts', () => {
      const help = captureHelp();
      for (const flag of [
        '--fw, --framework <framework>',
        '--pm, --package-manager <pm>',
        '--skip-install',
        '--no-skip-install',
        '--skill <agents>',
        '--no-skill',
        '-h, --help',
        '-v, --version',
      ]) {
        expect(help).toContain(flag);
      }
      expect(help).toContain(FRAMEWORKS.join(', '));
      expect(help).toContain(PACKAGE_MANAGERS.join(', '));
    });

    it('should state the Node.js requirement from package.json engines', () => {
      expect(NODE_REQUIREMENT).toBe(packageJson.engines.node);
      expect(captureHelp()).toContain(`Node.js ${packageJson.engines.node}`);
    });

    it('should end with the documentation URL', () => {
      const help = captureHelp().trimEnd();
      expect(help.endsWith(DOCS_URL)).toBe(true);
    });
  });
});
