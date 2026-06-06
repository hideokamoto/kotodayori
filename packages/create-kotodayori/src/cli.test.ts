import { describe, it, expect } from 'vitest';
import { parseCli, parseSkillOption } from './cli.js';

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
});
