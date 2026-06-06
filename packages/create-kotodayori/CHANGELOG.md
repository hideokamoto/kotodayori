# create-kotodayori

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
