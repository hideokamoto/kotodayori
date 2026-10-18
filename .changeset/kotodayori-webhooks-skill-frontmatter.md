---
"create-kotodayori": patch
---

The `kotodayori-webhooks` skill that `--skill` copies into new projects now passes the Agent Skills validator (the non-standard `user-invocable` field was removed; Claude Code already defaults it to `true`), and its scaffolding example passes `--no-skill` so it runs without prompts.
