---
"create-kotodayori": patch
---

The bundled `kotodayori-webhooks` agent skill no longer sets `user-invocable` in its frontmatter. The Agent Skills specification allows only `name`, `description`, `license`, `compatibility`, `metadata`, and `allowed-tools`, so `skills-ref validate` rejected the file. Claude Code's default for `user-invocable` is already `true`, so behavior there is unchanged.
