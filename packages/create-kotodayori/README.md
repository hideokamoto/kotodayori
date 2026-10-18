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

`npx create-kotodayori --help` prints:

```text
Usage:
  $ create-kotodayori [project-name] [options]

Options:
  -v, --version                  Display version number
  --fw, --framework <framework>  Framework: hono, express, lambda, eventbridge
  --pm, --package-manager <pm>   Package manager: pnpm, npm, yarn, bun. Runs "<pm> install" and appears in the printed next steps
  --skip-install                 Do not run "<pm> install" after the files are written
  --skill <agents>               Write the kotodayori-webhooks agent skill for: claude-code (alias: claude), cursor, all, none. Comma-separated; unknown names are ignored, and if none remain no skill is written. Use --no-skill to skip.
  -h, --help                     Display this message
```

- Anything not given on the command line (project name, framework, package manager, install, agent skill) is asked interactively.
- Files are written to `<project-name>` relative to the current directory. It must not exist yet or must be an empty directory.
- An unsupported `--framework` / `--package-manager` value stops the CLI with an error before anything is written.
- Unknown options are ignored.

Full documentation: <https://tayori-docs.workers.dev/packages/create-kotodayori/>

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

- **Hono** (`--fw=hono`)
- **Express** (`--fw=express`)
- **AWS Lambda** (`--fw=lambda`)
- **AWS EventBridge** (`--fw=eventbridge`)

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
  pnpm dev

  4. Test webhooks with Stripe CLI:
  stripe listen --forward-to localhost:3000/webhook
  stripe trigger payment_intent.succeeded
```

## Requirements

- Node.js >= 20.19.0 (the `engines` field of this package; required by the `cac` 7 argument parser)
- pnpm, npm, yarn, or bun (only `<pm> install` is run)

## License

MIT
