---
"create-kotodayori": patch
---

fix(create-kotodayori): stop pinning `apiVersion` in scaffold templates

The hono/express/lambda templates hardcoded `apiVersion: '2026-09-30.endive'`, which fails `npm run typecheck` as soon as the installed `stripe` package pins a newer API version. The `Stripe` client is now created without `apiVersion`, so the SDK default applies and the generated project stays in sync with whatever stripe version it installs.
