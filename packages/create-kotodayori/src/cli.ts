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

export const FRAMEWORKS: readonly Framework[] = ['hono', 'express', 'lambda', 'eventbridge'];
export const PACKAGE_MANAGERS: readonly PackageManager[] = ['pnpm', 'npm', 'yarn', 'bun'];

/** Minimum Node.js version, read from `engines.node` so the help text cannot drift from package.json. */
export const NODE_REQUIREMENT: string = packageJson.engines.node;

export const DOCS_URL = 'https://tayori-docs.wp-kyoto.workers.dev/packages/create-kotodayori/';

export interface CliOptions {
  projectName?: string;
  framework?: Framework;
  packageManager?: PackageManager;
  skipInstall?: boolean;
  agentSkills?: SkillAgent[];
  /** Set when `--help` or `--version` was printed; the caller should exit without scaffolding. */
  exit?: boolean;
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

function parseChoice<T extends string>(
  value: unknown,
  flag: string,
  choices: readonly T[]
): T | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'string' || !(choices as readonly string[]).includes(value)) {
    throw new Error(
      `Invalid value for ${flag}: ${JSON.stringify(value)}. Expected one of: ${choices.join(', ')}.`
    );
  }
  return value as T;
}

const HELP_NOTES = [
  'Values not given as options are asked interactively. To run without prompts, pass',
  'the project name, --fw, --pm, --skip-install or --no-skip-install, and --skill or --no-skill.',
  '',
  '[project-name] is resolved from the current directory. If that directory exists and is',
  'not empty, nothing is written and the command exits with code 1.',
  'There is no dry-run mode; unknown options are rejected.',
];

export function parseCli(argv?: string[]): CliOptions {
  const cli = cac('create-kotodayori');

  cli
    .version(packageJson.version)
    .usage('[project-name] [options]')
    .option('--fw, --framework <framework>', `Framework to use (${FRAMEWORKS.join(', ')})`)
    .option('--pm, --package-manager <pm>', `Package manager to use (${PACKAGE_MANAGERS.join(', ')})`)
    .option(
      '--skip-install',
      'Do not run "<pm> install" after creating the project (--no-skip-install: install without asking)'
    )
    .option(
      '--skill <agents>',
      'Copy the kotodayori-webhooks agent skill into the project for: claude-code (alias: claude), cursor, all, none. Comma-separated; unknown names are ignored. --no-skill is the same as none'
    )
    .example('  $ create-kotodayori my-webhooks --fw hono --pm pnpm --skill claude-code')
    .example('  $ create-kotodayori my-webhooks --fw express --pm npm --skip-install --no-skill')
    .help((sections) => [
      ...sections,
      { title: 'Notes', body: HELP_NOTES.map((line) => (line ? `  ${line}` : '')).join('\n') },
      { title: 'Requirements', body: `  Node.js ${NODE_REQUIREMENT}` },
      { title: 'Documentation', body: `  ${DOCS_URL}` },
    ]);

  const parsed = cli.parse(argv);

  if (parsed.options['help'] || parsed.options['version']) {
    return { exit: true };
  }

  const known = new Set(
    cli.globalCommand.options.flatMap((option) => option.names)
  );
  for (const name of Object.keys(parsed.options)) {
    if (name !== '--' && !known.has(name)) {
      throw new Error(
        `Unknown option ${name.length > 1 ? `--${name}` : `-${name}`}. Run "create-kotodayori --help" for the available options.`
      );
    }
  }

  const options: CliOptions = {};

  const projectNameArg = parsed.args[0];
  if (projectNameArg) {
    options.projectName = projectNameArg;
  }

  const framework = parseChoice(parsed.options['framework'], '--framework', FRAMEWORKS);
  if (framework) {
    options.framework = framework;
  }

  const packageManager = parseChoice(
    parsed.options['packageManager'],
    '--package-manager',
    PACKAGE_MANAGERS
  );
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
