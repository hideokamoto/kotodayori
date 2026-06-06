# create-kotodayori

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

```bash
npx create-kotodayori [project-name] [options]

Options:
  --fw, --framework <framework>     Framework to use (hono, express, lambda, eventbridge)
  --pm, --package-manager <pm>      Package manager to use (pnpm, npm, yarn, bun)
  --skip-install                    Skip installing dependencies
  --skill <agents>                  Add the kotodayori-webhooks agent skill
                                    (claude-code, cursor, all, none; comma-separated)
  --no-skill                        Skip adding the agent skill
  -h, --help                        Display help message
  -v, --version                     Display version number
```

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

- ✅ **Hono** - Modern web framework for edge computing
- 🚧 **Express** - Coming soon
- 🚧 **AWS Lambda** - Coming soon
- 🚧 **AWS EventBridge** - Coming soon

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

- Node.js >= 18
- pnpm, npm, yarn, or bun

## License

MIT
