# create-kotodayori

[![npm version](https://img.shields.io/npm/v/create-kotodayori.svg?logo=npm&label=npm)](https://www.npmjs.com/package/create-kotodayori)
[![npm downloads](https://img.shields.io/npm/dm/create-kotodayori.svg)](https://www.npmjs.com/package/create-kotodayori)
[![license](https://img.shields.io/npm/l/create-kotodayori.svg)](https://www.npmjs.com/package/create-kotodayori)

Scaffolding tool for creating Kotodayori webhook handler projects.

## Usage

Create a new Kotodayori project with interactive prompts:

```bash
npx create-kotodayori
```

### With Options

Specify the framework:

```bash
npx create-kotodayori --fw=hono
```

Specify project name and framework:

```bash
npx create-kotodayori my-webhook-handler --fw=hono
```

Specify package manager:

```bash
npx create-kotodayori --fw=hono --pm=pnpm
```

Skip dependency installation:

```bash
npx create-kotodayori --fw=hono --skip-install
```

Add the `kotodayori-webhooks` agent skill for AI coding agents:

```bash
# One agent
npx create-kotodayori --fw=hono --skill=claude-code

# Multiple agents (comma-separated) or "all"
npx create-kotodayori --fw=hono --skill=claude-code,cursor
npx create-kotodayori --fw=hono --skill=all

# Skip the skill (also skips the prompt)
npx create-kotodayori --fw=hono --no-skill
```

### All Options

This is the output of `npx create-kotodayori --help`:

```text
Usage:
  $ create-kotodayori [project-name] [options]

Options:
  -v, --version                  Display version number
  --fw, --framework <framework>  Framework to use (hono, express, lambda, eventbridge)
  --pm, --package-manager <pm>   Package manager to use (pnpm, npm, yarn, bun)
  --skip-install                 Do not run "<pm> install" after creating the project (--no-skip-install: install without asking)
  --skill <agents>               Copy the kotodayori-webhooks agent skill into the project for: claude-code (alias: claude), cursor, all, none. Comma-separated; unknown names are ignored. --no-skill is the same as none
  -h, --help                     Display this message
```

- Any value you do not pass as an option is asked interactively. To run without
  prompts (CI, AI agents), pass the project name, `--fw`, `--pm`,
  `--skip-install` or `--no-skip-install`, and `--skill` or `--no-skill`.
- `[project-name]` is resolved from the current directory. If that directory
  exists and is not empty, nothing is written and the command exits with code 1.
- `--fw` / `--pm` values outside the lists above, and unknown options, are
  rejected before anything is written. There is no dry-run mode.

## Agent skill

When run interactively, `create-kotodayori` asks whether to drop the
[`kotodayori-webhooks`](https://github.com/hideokamoto/kotodayori/tree/main/skills/kotodayori-webhooks)
agent skill into your new project so AI coding agents (Claude Code, Cursor)
understand the Kotodayori APIs out of the box. The `SKILL.md` is written to the
agent's project-local skills directory:

| Agent | Location |
| --- | --- |
| Claude Code | `.claude/skills/kotodayori-webhooks/SKILL.md` |
| Cursor | `.cursor/skills/kotodayori-webhooks/SKILL.md` |

## Supported Frameworks

Each framework has its own template. A project generated from any of them
installs, type-checks and builds as is.

- **Hono** (`--fw hono`) - Hono app with a webhook route and example handlers
- **Express** (`--fw express`) - Express app using `express.raw()` on the webhook route
- **AWS Lambda** (`--fw lambda`) - Lambda HTTP handler (function URL or API Gateway)
- **AWS EventBridge** (`--fw eventbridge`) - Lambda handler for Stripe events delivered through Amazon EventBridge

## What Gets Created

A new Kotodayori project includes:

- **TypeScript setup** - Full TypeScript configuration
- **Webhook handlers** - Example payment and subscription handlers
- **Type safety** - All Stripe event types fully typed
- **Development tools** - Hot reload, build scripts, and type checking
- **Environment setup** - `.env.example` with necessary configuration
- **Documentation** - README with setup and deployment instructions

## Example

```bash
$ npx create-kotodayori

? Project name: my-webhook-handler
? Select framework: Hono
? Select package manager: pnpm
? Install dependencies? Yes
? Add the kotodayori-webhooks agent skill? Claude Code

Creating Kotodayori + Hono project...

✔ Template files created
✔ Dependencies installed successfully
✔ Project created successfully! 🎉
✔ Added agent skill: .claude/skills/kotodayori-webhooks/SKILL.md

Next steps:

  1. Navigate to your project:
  cd my-webhook-handler

  2. Set up environment variables:
  cp .env.example .env
  Then edit .env with your Stripe API keys

  3. Start the development server:
  pnpm run dev

  4. Test webhooks with Stripe CLI:
  stripe listen --forward-to localhost:3000/webhook
  stripe trigger payment_intent.succeeded
```

## Requirements

- Node.js >= 20.19.0 (`engines` in package.json; the `cac` 7 dependency declares the same minimum)
- pnpm, npm, yarn, or bun

## Documentation

https://tayori-docs.wp-kyoto.workers.dev/packages/create-kotodayori/

## License

MIT
