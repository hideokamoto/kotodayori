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
| `--framework <framework>` | `--fw` | Framework: `hono`, `express`, `lambda`, `eventbridge` |
| `--package-manager <pm>` | `--pm` | Package manager: `pnpm`, `npm`, `yarn`, `bun`. Used to run `<pm> install` and in the printed next steps |
| `--skip-install` | — | Do not run `<pm> install` after the files are written |
| `--skill <agents>` | — | Write the `kotodayori-webhooks` agent skill for `claude-code` (alias `claude`), `cursor`, `all`, or `none`. Comma-separated; unknown names are ignored, and if none remain no skill is written |
| `--no-skill` | — | Do not write the agent skill (and do not ask) |
| `--help` | `-h` | Print help and exit |
| `--version` | `-v` | Print the version and exit |

Behavior:

- Anything not given on the command line (project name, framework, package manager, install, agent skill) is asked interactively.
- Files are written to `<project-name>` relative to the current directory. It must not exist yet or must be an empty directory.
- An unsupported `--framework` / `--package-manager` value stops the CLI with an error before anything is written.
- The agent skill is written to `.claude/skills/kotodayori-webhooks/SKILL.md` (Claude Code) and/or `.cursor/skills/kotodayori-webhooks/SKILL.md` (Cursor).
- Unknown options are ignored.

## Requirements

- Node.js `>=20.19.0` (the package's `engines` field; required by the `cac` 7 argument parser)
- pnpm, npm, yarn, or bun. The CLI only runs `<pm> install`.

## Supported frameworks

- **Hono** (`--fw=hono`)
- **Express** (`--fw=express`)
- **AWS Lambda** (`--fw=lambda`)
- **AWS EventBridge** (`--fw=eventbridge`)

## Generated structure (Hono)

The Hono template includes:

- Main app with webhook route
- Example handlers for payment and subscription events
- Logging middleware
- TypeScript, tsup, and dev server setup
- `.env.example` and README with template variables

You can then customize handlers and add more events as needed.
