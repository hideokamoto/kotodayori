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
| `--framework` | `--fw` | Framework: `hono`, `express`, `lambda`, `eventbridge` |
| `--package-manager` | `--pm` | Package manager: `pnpm`, `npm`, `yarn`, `bun` |
| `--skip-install` | — | Skip dependency installation after scaffolding |

## Supported frameworks

- **Hono** — Full support; generates a Hono app with webhook route and example handlers
- **Express** — Coming soon
- **Lambda** — Coming soon
- **EventBridge** — Coming soon

## Generated structure (Hono)

The Hono template includes:

- Main app with webhook route
- Example handlers for payment and subscription events
- Logging middleware
- TypeScript, tsup, and dev server setup
- `.env.example` and README with template variables

You can then customize handlers and add more events as needed.
