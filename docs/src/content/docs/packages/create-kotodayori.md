---
title: create-kotodayori
description: Scaffolding tool for new Kotodayori projects
---

[![npm version](https://img.shields.io/npm/v/create-kotodayori.svg?logo=npm&label=npm)](https://www.npmjs.com/package/create-kotodayori)
[![npm downloads](https://img.shields.io/npm/dm/create-kotodayori.svg)](https://www.npmjs.com/package/create-kotodayori)
[![license](https://img.shields.io/npm/l/create-kotodayori.svg)](https://www.npmjs.com/package/create-kotodayori)

`create-kotodayori` is a CLI that scaffolds a new Kotodayori project with your chosen framework and package manager.

## Usage

```bash
npx create-kotodayori
```

Or with options:

```bash
npx create-kotodayori my-webhook-handler --fw=hono --pm=pnpm
```

## Options

| Option | Short | Description |
|--------|-------|-------------|
| `--framework <framework>` | `--fw` | `hono`, `express`, `lambda` or `eventbridge`. Any other value is rejected before anything is written |
| `--package-manager <pm>` | `--pm` | `pnpm`, `npm`, `yarn` or `bun`. Used to run `<pm> install` and in the printed next steps |
| `--skip-install` | — | Do not run `<pm> install`. Pass `--no-skip-install` to install without being asked |
| `--skill <agents>` | — | Copy the `kotodayori-webhooks` agent skill into the project for `claude-code` (alias `claude`), `cursor`, `all` or `none`. Comma-separated; unknown names are ignored |
| `--no-skill` | — | Same as `--skill none` |
| `--help` | `-h` | Print the help and exit |
| `--version` | `-v` | Print the version and exit |

- Any value you do not pass as an option is asked interactively. To run without prompts (for example in CI or from an AI agent), pass the project name, `--fw`, `--pm`, `--skip-install` or `--no-skip-install`, and `--skill` or `--no-skill`.
- `[project-name]` is resolved from the current directory. If that directory already exists and is not empty, nothing is written and the command exits with code 1.
- There is no dry-run mode. Unknown options are rejected with an error.

## Requirements

- Node.js >= 20.19.0 (the `engines` range of the package; its CLI dependency `cac` 7 declares the same minimum)
- One of pnpm, npm, yarn or bun

## Agent skill

`--skill` writes `SKILL.md` to `.claude/skills/kotodayori-webhooks/` (Claude Code) and/or `.cursor/skills/kotodayori-webhooks/` (Cursor) inside the new project.

## Agent skill for this CLI

The repository also publishes a `create-kotodayori` skill that teaches AI coding agents to run this CLI without prompts, preview the output before writing the real project, and ask before commands that reach npm or Stripe. Install it with the [`skills` CLI](https://www.npmjs.com/package/skills):

```bash
npx skills add hideokamoto/kotodayori --skill create-kotodayori
```

The skill is maintained next to the CLI: a change to the CLI's options or requirements updates [`skills/create-kotodayori/SKILL.md`](https://github.com/hideokamoto/kotodayori/blob/main/skills/create-kotodayori/SKILL.md) in the same pull request, and a test fails if the two disagree.

## Supported frameworks

Each framework has its own template (`hono`, `express`, `lambda`, `eventbridge`). A project generated from any of them installs, type-checks and builds as is.

- **Hono** — Hono app with a webhook route and example handlers
- **Express** — Express app using `express.raw()` on the webhook route
- **Lambda** — AWS Lambda HTTP handler (Lambda function URL or API Gateway)
- **EventBridge** — AWS Lambda handler for Stripe events delivered through Amazon EventBridge

## Generated structure (Hono)

The Hono template includes:

- Main app with webhook route
- Example handlers for payment and subscription events
- Logging middleware
- TypeScript, tsup, and dev server setup
- `.env.example` and README with template variables

You can then customize handlers and add more events as needed.
