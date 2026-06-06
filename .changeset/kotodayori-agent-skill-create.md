---
"create-kotodayori": minor
---

Add optional `kotodayori-webhooks` agent skill installation to the scaffolder.
When run interactively, `create-kotodayori` now asks whether to drop the agent
skill (`SKILL.md`) into the new project for Claude Code (`.claude/skills`) and/or
Cursor (`.cursor/skills`). A `--skill <agents>` flag (`claude-code`, `cursor`,
`all`, `none`, comma-separated) and `--no-skill` are available for non-interactive
use.
