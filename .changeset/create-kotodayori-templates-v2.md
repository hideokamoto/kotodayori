---
"create-kotodayori": patch
---

Generated projects now depend on `@kotodayori/hono`, `@kotodayori/express`, `@kotodayori/lambda` and `@kotodayori/stripe` `^2.0.0` (the templates still pointed at `^1.0.0`, so new projects resolved the previous major). The `eventbridge` template keeps `@kotodayori/eventbridge` `^1.0.0` (it is still on 1.x) and uses `@kotodayori/stripe` `^2.0.0`. The template code needs no changes. A new test fails when a template range stops following the workspace package's major version.
