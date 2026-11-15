# create-kotodayori

## 1.2.2

### Patch Changes

- 32de5d3: fix(create-kotodayori): scaffold a Node.js entry point for the Hono template

  The generated `src/index.ts` only did `export default app`, which starts a server on Workers/Bun/Deno but never listens on Node.js — `npm run dev` started `tsx watch` with nothing on port 3000. The template now ships `src/server.ts` (`@hono/node-server`'s `serve()`) wired into the `dev`/`start` scripts, keeping `src/index.ts` as the edge entry point. `@kotodayori/hono` and the root README also explain the Node.js entry-point split.

## 1.2.1

### Patch Changes

- 003a5ff: fix(create-kotodayori): point the documentation URL at https://kotodayori.hidetaka.dev

  The docs site moves from the (unresolvable) tayori-docs.workers.dev address to the custom domain kotodayori.hidetaka.dev. Updates the URL the CLI prints after scaffolding, the README links, and the bundled skill.

- 5820522: fix(create-kotodayori): stop pinning `apiVersion` in scaffold templates

  The hono/express/lambda templates hardcoded `apiVersion: '2026-09-30.endive'`, which fails `npm run typecheck` as soon as the installed `stripe` package pins a newer API version. The `Stripe` client is now created without `apiVersion`, so the SDK default applies and the generated project stays in sync with whatever stripe version it installs.

## 1.2.0

### Minor Changes

- 9e09417: feat(create-kotodayori): add a Cloudflare Workers template (`--fw=workers`)

  New framework option scaffolding a Worker entry point (`export default { fetch }`) that serves `POST /webhook` through `@kotodayori/fetch` + `@kotodayori/stripe` with `constructEventAsync`-compatible signature verification. Ships `wrangler.jsonc`, `.dev.vars.example`, typed `Env` bindings, and `wrangler dev`/`wrangler deploy` scripts.

## 1.1.4

### Patch Changes

- bc36e5b: `--help` / `--version` now exit after printing instead of continuing into the interactive prompts. The help text lists every accepted value, the `--skill` aliases and fallbacks, where files are written, the Node.js requirement (from `engines`), and a link to the documentation. Unsupported `--framework` / `--package-manager` values, including an empty one such as `--fw ""`, now stop the CLI with an error before any directory is created instead of falling back to the prompts.
- 4cc8773: The "Next steps" printed after scaffolding now use `<pm> run dev` / `<pm> run build`, which work with npm as well (`npm dev` and `npm build` fail with "Unknown command"). The Hono template's Stripe CLI step is numbered correctly when installation is skipped, and the documentation link points to the docs site instead of the old repository URL.
- a1b9e1e: The bundled `kotodayori-webhooks` agent skill no longer sets `user-invocable` in its frontmatter. The Agent Skills specification allows only `name`, `description`, `license`, `compatibility`, `metadata`, and `allowed-tools`, so `skills-ref validate` rejected the file. Claude Code's default for `user-invocable` is already `true`, so behavior there is unchanged.

## 1.1.3

### Patch Changes

- 5f8acbc: Generated projects now depend on `@kotodayori/hono`, `@kotodayori/express`, `@kotodayori/lambda` and `@kotodayori/stripe` `^2.0.0` (the templates still pointed at `^1.0.0`, so new projects resolved the previous major). The `eventbridge` template keeps `@kotodayori/eventbridge` `^1.0.0` (it is still on 1.x) and uses `@kotodayori/stripe` `^2.0.0`. The template code needs no changes. A new test fails when a template range stops following the workspace package's major version.

## 1.1.2

### Patch Changes

- 99f758f: Scaffold templates now depend on `stripe` ^23.0.0 and pin `apiVersion` to `2026-09-30.endive`

## 1.1.1

### Patch Changes

- 23dbfa0: Update runtime dependencies to latest major versions

  `cac` upgraded to v7, `execa` to v9, `ora` to v9. The CLI interface and
  generated project templates are unchanged.

## 1.1.0

### Minor Changes

- 0df9044: Add optional `kotodayori-webhooks` agent skill installation to the scaffolder.
  When run interactively, `create-kotodayori` now asks whether to drop the agent
  skill (`SKILL.md`) into the new project for Claude Code (`.claude/skills`) and/or
  Cursor (`.cursor/skills`). A `--skill <agents>` flag (`claude-code`, `cursor`,
  `all`, `none`, comma-separated) and `--no-skill` are available for non-interactive
  use.

## 1.0.1

### Patch Changes

- Fix scaffolded project generation:

  - Generate `.gitignore` correctly in new projects (rename `_gitignore` template file)
  - Bump template `@kotodayori/*` dependencies from `^0.1.0` to `^1.0.0`

## 1.0.0

### Major Changes

- e8e57b4: Rename npm scope from `@tayori/*` to `@kotodayori/*` and CLI from `create-tayori` to `create-kotodayori` to avoid trademark conflict with tayori.com (PR TIMES customer support SaaS).

  Migration: replace `@tayori/<pkg>` with `@kotodayori/<pkg>` in your imports and `package.json` dependencies, and use `npx create-kotodayori` instead of `npx create-tayori`. The public API is unchanged.

## 0.0.1

### Minor Changes

- Initial release of `create-kotodayori`: scaffolding CLI tool for Kotodayori projects.
