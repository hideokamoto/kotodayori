---
name: create-kotodayori
description: >
  Scaffold a new Kotodayori Stripe webhook handler project with the
  create-kotodayori CLI (templates for Hono, Express, AWS Lambda and AWS
  EventBridge), run it without interactive prompts, and test it locally with
  the Stripe CLI. Use when the user asks to create, bootstrap or scaffold a
  Kotodayori or Stripe webhook project, mentions `npx create-kotodayori`, or
  needs the CLI's flags. For changing an existing Kotodayori app, use the
  kotodayori-webhooks skill instead.
license: MIT
compatibility: >
  Requires Node.js >=20.19.0, one of pnpm, npm, yarn or bun, and network
  access to the npm registry. The Stripe CLI is needed only for local webhook
  testing.
metadata:
  author: kotodayori
  version: "1.0.0"
---

# create-kotodayori (agent playbook)

`create-kotodayori` copies a project template into a new directory and, unless told otherwise, runs `<pm> install` there. Full reference: <https://tayori-docs.wp-kyoto.workers.dev/packages/create-kotodayori/>. When in doubt, `npx create-kotodayori@latest --help` prints the options of the version you are about to run.

## Prerequisites

- Node.js `>=20.19.0` (the `engines` range of create-kotodayori). Check with `node --version`.
- One package manager on `PATH`: `pnpm`, `npm`, `yarn` or `bun`.
- Network access to the npm registry: `npx` downloads the CLI, and the install step downloads the project's dependencies.
- For local webhook testing only: the [Stripe CLI](https://docs.stripe.com/stripe-cli) and access to a Stripe account or sandbox.

## How the CLI behaves

- Every value not passed as an option is asked interactively. An agent shell is usually not interactive, so always pass all of them:
  the project name, `--fw`, `--pm`, `--skip-install` or `--no-skip-install`, and `--skill` or `--no-skill`.
- `--fw` accepts `hono`, `express`, `lambda`, `eventbridge`. `--pm` accepts `pnpm`, `npm`, `yarn`, `bun`. Other values, and unknown options, make the CLI exit with code 1 before it writes anything.
- The project name is a path resolved from the current directory. If that directory exists and is not empty, the CLI writes nothing and exits with code 1.
- There is **no dry-run option**. Do not invent one: it would be rejected as an unknown option.
- `--skill claude-code` / `cursor` / `all` copies the `kotodayori-webhooks` skill to `.claude/skills/` and/or `.cursor/skills/` inside the new project.

## Procedure

1. **Collect the inputs.** Ask the user for the project directory, the framework, the package manager, whether to install dependencies now, and whether to add the agent skill. Do not guess the framework.
2. **Check the environment.** Run `node --version` and `<pm> --version`. Check that the target directory does not exist or is empty (`ls -A <dir>`). If it is not empty, stop and ask; never delete or move files to get past the check.
3. **Dry run (preview).** Generate the project into a throwaway directory without installing anything, and show the user what would be created:

   ```bash
   preview="$(mktemp -d)"
   (cd "$preview" && npx create-kotodayori@latest app --fw <framework> --pm <pm> --skip-install --no-skill)
   find "$preview/app" -type f | sort
   ```

   This still downloads the CLI through `npx`, but it writes only inside the temporary directory and runs no install. Remove the directory afterwards.
4. **Ask for approval.** Show the exact command for the real run and say what it will do (the directory it writes, whether it runs `<pm> install`). Run it only after the user agrees:

   ```bash
   npx create-kotodayori@latest <project-dir> --fw <framework> --pm <pm> --no-skip-install --skill <agents|none>
   ```

   Use `--skip-install` instead of `--no-skip-install` if the user wants to install later.
5. **Verify the result.** In the new directory run `<pm> run typecheck` and `<pm> run build` (after installing). Always use `<pm> run <script>`: `npm dev`, `npm build` and `bun build` do not run the package scripts.
6. **Configure secrets.** The templates read `STRIPE_API_KEY` and `STRIPE_WEBHOOK_SECRET` from `process.env` and throw at startup when they are missing. They do not load `.env` by themselves, so the user must export the variables in the shell that runs the app (or add their own loader). Ask the user to enter secret values; do not print them, and do not write them into tracked files (`.env` is listed in the generated `.gitignore`).
7. **Test locally (optional, needs approval).** See the Stripe section below before running any Stripe CLI command.
   - Express: `<pm> run dev` listens on `PORT` (default `3000`); forward with `stripe listen --forward-to localhost:3000/webhook`.
   - Hono: the template exports the Hono `app` and `<pm> run dev` does not start a Node HTTP server. Tell the user, and serve the app with their runtime (for example `@hono/node-server` or Wrangler) before forwarding events.
   - Lambda and EventBridge: there is no local server. Build with `<pm> run build`; deploying is the user's decision.

## Safety rules

- Operations with effects outside the working directory are: `npx` / `<pm> install` (downloads and runs package install scripts), `stripe login`, `stripe listen`, `stripe trigger`, creating webhook endpoints or event destinations in Stripe, and deploy commands such as `sam deploy` or `wrangler deploy`.
- For each of them: first show a preview that has no external effect where one exists (step 3 for scaffolding), then state the exact command and what it changes, and run it only after the user approves. Approval for one command does not cover the next.
- Do not deploy, and do not create Stripe webhook endpoints, unless the user asked for it.
- Never pass `--live` to the Stripe CLI. Never print, log or commit `sk_…` or `whsec_…` values.

## Stripe constraints (from the Stripe documentation)

- `stripe login` is a browser-based pairing flow that the user must approve in the Stripe Dashboard; an agent cannot complete it alone. When standard input is not a terminal, it behaves like `stripe login --non-interactive` and prints the URL, the verification code and the next command as JSON. For Stripe CLI versions newer than v1.50.0, an Administrator or IAM Admin must first enable CLI access under Settings → Team and security → MCP and CLI access. ([stripe login](https://docs.stripe.com/cli/login))
- `stripe listen` and other CLI requests run in a sandbox by default; `--live` makes live requests. `--forward-to` prints a webhook signing secret (`whsec_…`) that does not change between restarts, and no Dashboard endpoint is needed. ([stripe listen](https://docs.stripe.com/cli/listen))
- The secret printed by `stripe listen` is different from the secret of a Dashboard-managed endpoint. Use the one that matches where events come from, or signature verification fails. ([Manage webhook endpoints](https://docs.stripe.com/events/manage-webhook-endpoints#signature-errors))
- `stripe trigger <event>` issues real API requests and creates the objects it needs, and can emit additional events (for example `payment_intent.succeeded` also emits `payment_intent.created`). ([stripe trigger](https://docs.stripe.com/cli/trigger))
- Signature verification needs the exact raw request body. The Express template applies `express.raw({ type: 'application/json' })` on the webhook route for this; keep it before any JSON body parser.

## Keeping this skill in sync

This file documents the CLI in `packages/create-kotodayori`. When the CLI's options, accepted values or Node.js requirement change, update this file in the same pull request. `packages/create-kotodayori/src/skill.test.ts` fails when the values written here no longer match the code.
