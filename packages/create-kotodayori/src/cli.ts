import cac from 'cac';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import type { PackageManager } from './utils/install.js';
import type { SkillAgent } from './utils/files.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(
  readFileSync(path.join(__dirname, '../package.json'), 'utf-8')
);

export type Framework = 'hono' | 'express' | 'lambda' | 'eventbridge';

export interface CliOptions {
  projectName?: string;
  framework?: Framework;
  packageManager?: PackageManager;
  skipInstall?: boolean;
  agentSkills?: SkillAgent[];
}

/**
 * Parse the `--skill` / `--no-skill` value into a list of agents.
 * Accepts a comma-separated list, plus the shortcuts `all` and `none`.
 * Returns undefined when the flag was not provided (so we still prompt).
 */
export function parseSkillOption(value: unknown): SkillAgent[] | undefined {
  // `--no-skill` makes cac set the value to `false`.
  if (value === false) {
    return [];
  }
  if (typeof value !== 'string') {
    return undefined;
  }

  const tokens = value
    .split(',')
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);

  const agents = new Set<SkillAgent>();
  for (const token of tokens) {
    switch (token) {
      case 'none':
        return [];
      case 'all':
        agents.add('claude-code');
        agents.add('cursor');
        break;
      case 'claude':
      case 'claude-code':
        agents.add('claude-code');
        break;
      case 'cursor':
        agents.add('cursor');
        break;
      default:
        // Ignore unknown tokens rather than failing the whole run.
        break;
    }
  }

  return Array.from(agents);
}

export function parseCli(argv?: string[]): CliOptions {
  const cli = cac('create-kotodayori');

  cli
    .version(packageJson.version)
    .usage('[project-name] [options]')
    .option('--fw, --framework <framework>', 'Framework to use (hono, express, lambda, eventbridge)')
    .option('--pm, --package-manager <pm>', 'Package manager to use (pnpm, npm, yarn, bun)')
    .option('--skip-install', 'Skip installing dependencies')
    .option(
      '--skill <agents>',
      'Add the kotodayori-webhooks agent skill (claude-code, cursor, all, none; comma-separated). Use --no-skill to skip.'
    )
    .help();

  const parsed = cli.parse(argv);

  const options: CliOptions = {};

  const projectNameArg = parsed.args[0];
  if (projectNameArg) {
    options.projectName = projectNameArg;
  }

  const framework = parsed.options['framework'] || parsed.options['fw'];
  if (framework) {
    options.framework = framework;
  }

  const packageManager = parsed.options['packageManager'] || parsed.options['pm'];
  if (packageManager) {
    options.packageManager = packageManager;
  }

  const skipInstall = parsed.options['skipInstall'];
  if (skipInstall !== undefined) {
    options.skipInstall = skipInstall;
  }

  const agentSkills = parseSkillOption(parsed.options['skill']);
  if (agentSkills !== undefined) {
    options.agentSkills = agentSkills;
  }

  return options;
}
