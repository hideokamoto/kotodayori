---
'@kotodayori/core': major
'@kotodayori/stripe': major
'@kotodayori/zod': major
'@kotodayori/hono': major
'@kotodayori/express': major
'@kotodayori/lambda': major
'@kotodayori/eventbridge': major
'create-kotodayori': major
---

Rename npm scope from `@tayori/*` to `@kotodayori/*` and CLI from `create-tayori` to `create-kotodayori` to avoid trademark conflict with tayori.com (PR TIMES customer support SaaS).

Migration: replace `@tayori/<pkg>` with `@kotodayori/<pkg>` in your imports and `package.json` dependencies, and use `npx create-kotodayori` instead of `npx create-tayori`. The public API is unchanged.
