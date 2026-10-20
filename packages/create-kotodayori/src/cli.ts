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

export const FRAMEWORKS = ['hono', 'express', 'lambda', 'eventbridge'] as const;
export type Framework = (typeof FRAMEWORKS)[number];

export const PACKAGE_MANAGERS = ['pnpm', 'npm', 'yarn', 'bun'] as const satisfies readonly PackageManager[];

/** Minimum Node.js version, taken from `engines.node` in package.json. */
export const NODE_VERSION_RANGE: string = packageJson.engines.node;

export const DOCS_URL = 'https://tayori-docs.workers.dev/packages/create-kotodayori/';

export interface CliOptions {
  /** True when --help or --version was handled; the caller should exit. */
  exitEarly?: boolean;
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

function assertOneOf<T extends string>(flag: string, value: unknown, allowed: readonly T[]): T {
  if (typeof value !== 'string' || !(allowed as readonly string[]).includes(value)) {
    throw new Error(`Invalid value for ${flag}: "${String(value)}". Expected one of: ${allowed.join(', ')}.`);
  }
  return value as T;
}

export function parseCli(argv?: string[]): CliOptions {
  const cli = cac('create-kotodayori');

  cli
    .version(packageJson.version)
    .usage('[project-name] [options]')
    .option('--fw, --framework <framework>', `Framework: ${FRAMEWORKS.join(', ')}`)
    .option(
      '--pm, --package-manager <pm>',
      `Package manager: ${PACKAGE_MANAGERS.join(', ')}. Runs "<pm> install" and appears in the printed next steps`
    )
    .option('--skip-install', 'Do not run "<pm> install" after the files are written')
    .option(
      '--skill <agents>',
      'Write the kotodayori-webhooks agent skill for: claude-code (alias: claude), cursor, all, none. ' +
        'Comma-separated; unknown names are ignored, and if none remain no skill is written. Use --no-skill to skip.'
    )
    .example('  $ create-kotodayori')
    .example('  $ create-kotodayori my-webhook-handler --fw=hono --pm=pnpm --skip-install --no-skill')
    .help((sections) => [
      ...sections,
      {
        title: 'Notes',
        body: [
          '  - Project name, framework, package manager, install, and agent skill are asked',
          '    interactively when not given on the command line.',
          '  - Files are written to <project-name> (relative to the current directory), which',
          '    must not exist yet or must be an empty directory.',
          '  - The agent skill goes to .claude/skills/kotodayori-webhooks/SKILL.md (claude-code)',
          '    and/or .cursor/skills/kotodayori-webhooks/SKILL.md (cursor).',
          '  - Unknown options are ignored.',
        ].join('\n'),
      },
      { title: 'Requirements', body: `  Node.js ${NODE_VERSION_RANGE}` },
      { title: 'Documentation', body: `  ${DOCS_URL}` },
    ]);

  const parsed = cli.parse(argv);

  const options: CliOptions = {};

  // cac prints help/version but does not exit, so tell the caller to stop here.
  if (parsed.options['help'] || parsed.options['version']) {
    options.exitEarly = true;
    return options;
  }

  const projectNameArg = parsed.args[0];
  if (projectNameArg) {
    options.projectName = projectNameArg;
  }

  // `??` keeps an empty value (`--fw ""`) so it is rejected instead of silently falling back to the prompts.
  const framework = parsed.options['framework'] ?? parsed.options['fw'];
  if (framework !== undefined) {
    options.framework = assertOneOf('--framework', framework, FRAMEWORKS);
  }

  const packageManager = parsed.options['packageManager'] ?? parsed.options['pm'];
  if (packageManager !== undefined) {
    options.packageManager = assertOneOf('--package-manager', packageManager, PACKAGE_MANAGERS);
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
