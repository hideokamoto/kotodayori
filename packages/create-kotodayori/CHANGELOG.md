# create-kotodayori

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
