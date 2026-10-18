---
name: create-kotodayori
description: >
  Scaffold a new Kotodayori Stripe webhook handler project with the
  create-kotodayori CLI (npx create-kotodayori) using the Hono, Express, AWS
  Lambda, or AWS EventBridge template. Use when the user wants to create,
  scaffold, bootstrap, or start a new Kotodayori / Stripe webhook project, asks
  which create-kotodayori flags to pass (--fw, --pm, --skip-install, --skill,
  --no-skill), or wants to run the generated project against the Stripe CLI.
  For adding Kotodayori to an existing app or editing router code, use the
  kotodayori-webhooks skill instead.
compatibility: Requires Node.js >=20.19.0, one of pnpm/npm/yarn/bun, and network access to the npm registry.
license: MIT
metadata:
  author: kotodayori
  version: "1.0.0"
---

# create-kotodayori (scaffolding playbook)

`create-kotodayori` generates a Stripe webhook handler project that uses Kotodayori. This skill covers running the CLI safely and the first steps in the generated project. CLI reference: https://tayori-docs.workers.dev/packages/create-kotodayori/

## Prerequisites

- **Node.js >=20.19.0.** This is the `engines.node` range of the `create-kotodayori` package. Check with `node -v`.
- **A package manager**: `pnpm`, `npm`, `yarn`, or `bun`. The CLI runs `<pm> install` with the one you pass as `--pm`, and nothing else.
- **Network access** to the npm registry. `npx` downloads the CLI, and `<pm> install` downloads the project's dependencies.

## What the CLI does

```text
create-kotodayori [project-name] [options]

--fw, --framework <framework>  hono | express | lambda | eventbridge
--pm, --package-manager <pm>   pnpm | npm | yarn | bun
--skip-install                 do not run "<pm> install"
--skill <agents>               claude-code (alias: claude) | cursor | all | none, comma-separated
--no-skill                     do not write the agent skill
-h, --help / -v, --version     print and exit
```

- Every value that is not given on the command line is **asked interactively**: project name, framework, package manager, whether to install, and which agent skill to write. An agent running without a TTY should pass all of them so the CLI never waits on a prompt: a project name, `--fw`, `--pm`, `--skip-install`, and `--skill=...` or `--no-skill`.
- Files are written to `<project-name>` relative to the current directory. The CLI exits with an error if that directory exists and is not empty. It never overwrites files.
- An unsupported `--fw` / `--pm` value exits with an error before anything is written.
- `--skill` writes `kotodayori-webhooks` to `.claude/skills/kotodayori-webhooks/SKILL.md` (Claude Code) and/or `.cursor/skills/kotodayori-webhooks/SKILL.md` (Cursor). Unknown names are ignored. If no valid name remains, no skill is written.
- Unknown options are ignored silently, so check option spelling against the list above.

## Safety rules

1. **Preview first, then ask.** The CLI has no `--dry-run` flag. Use the preview in step 2 below, show the user the exact command you intend to run, and wait for approval before the real run.
2. **Ask before every step with external effects**, each time:
   - `<pm> install`: downloads packages and runs their install scripts.
   - `stripe listen` and `stripe trigger`: they act on the user's Stripe account (see the Stripe CLI section below).
   - Any deployment (for example `sam deploy` for the Lambda/EventBridge templates).
3. **Never handle real secrets yourself.** Ask the user to put `STRIPE_API_KEY` / `STRIPE_WEBHOOK_SECRET` in place. Do not print them, and do not commit `.env`. The generated `.gitignore` already lists `.env`.
4. **Never pass `--live` to the Stripe CLI** unless the user explicitly asks for live mode.
5. **Do not empty or delete a directory** to get past the "already exists and is not empty" error. Choose another project name, or ask the user.

## Steps

1. **Collect choices** from the user: project name (the new directory), framework, package manager, and whether to add the agent skill for Claude Code and/or Cursor.

2. **Preview (dry run).** Generate into a throwaway directory without installing anything, list the files, and then remove it:

   ```bash
   preview_dir="$(mktemp -d)"
   (cd "$preview_dir" && npx -y create-kotodayori preview --fw=hono --pm=pnpm --skip-install --no-skill)
   (cd "$preview_dir/preview" && find . -type f | sort)
   rm -rf "$preview_dir"
   ```

   This only writes local files under the temporary directory. Running `npx` still downloads the CLI from npm.

3. **Real run, after approval**, in the directory the user chose:

   ```bash
   npx -y create-kotodayori my-webhook-handler --fw=hono --pm=pnpm --skip-install --skill=claude-code
   ```

   Keep `--skip-install` so that installation is a separate step you can ask about.

4. **Install, after approval:** `cd my-webhook-handler && pnpm install` (use the chosen package manager).

5. **Run the project.** The scripts are `dev` (Hono/Express: `tsx watch src/index.ts`) and `build` (all templates: `tsup`). Run them with `<pm> run dev` / `<pm> run build`. See "Known gaps" below before you start the dev server.

6. **Test with the Stripe CLI** (Hono/Express, after approval). The webhook route is `POST /webhook`, and the Express template listens on `PORT` (default `3000`):

   ```bash
   stripe listen --forward-to localhost:3000/webhook
   stripe trigger payment_intent.succeeded
   ```

   Put the `whsec_...` secret that `stripe listen` prints into `STRIPE_WEBHOOK_SECRET`.

## Known gaps in the generated templates (create-kotodayori 1.1.3)

These were reproduced with Node.js 22.22.0, tsx 4.23.15, and pnpm. Re-check them after upgrading the CLI.

- **`.env` is not loaded.** The Hono and Express templates read `process.env` and stop with `STRIPE_API_KEY environment variable is required` when the variables are only in `.env`. Either export the variables in the shell, or start the dev server with `<pm> exec tsx watch --env-file=.env src/index.ts`.
- **The Hono template does not start a Node.js HTTP server.** `src/index.ts` ends with `export default app`, so `<pm> run dev` listens on no port. Serving it needs a runtime adapter, such as Cloudflare Workers or a Node.js server adapter. Tell the user about this instead of assuming port 3000 is up.

## Stripe CLI constraints (from docs.stripe.com)

- **Authentication**: run `stripe login`. It is a browser pairing flow that signs in only the individual user. For Stripe CLI versions newer than v1.50.0, an Administrator or IAM Admin must first enable CLI access in the Dashboard under Settings → Team and security → MCP and CLI access. Without a TTY, `stripe login --non-interactive` prints a browser URL and a code. The user has to approve in the browser, and you cannot do that for them. Source: https://docs.stripe.com/cli/login
- **`stripe listen`** forwards events to `--forward-to <url>` and prints a webhook signing secret. The secret does not change between restarts. No Dashboard endpoint is needed. Requests run in a sandbox by default, and `--live` switches to live mode. Source: https://docs.stripe.com/cli/listen
- **`stripe trigger`** issues real API requests. "Triggering events causes side effects: all necessary API objects will be created in the process", and one trigger can emit several events (for example, `payment_intent.succeeded` also emits `payment_intent.created`). Source: https://docs.stripe.com/cli/trigger

## Keeping this skill current

This skill lives in `skills/create-kotodayori/` of https://github.com/hideokamoto/kotodayori. When the CLI's flags, accepted values, or `engines.node` change, update this file in the same pull request. `packages/create-kotodayori/src/skill.test.ts` fails when the Node.js range or the option list here drifts from the CLI.
