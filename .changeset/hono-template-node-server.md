---
"create-kotodayori": patch
"@kotodayori/hono": patch
---

fix(create-kotodayori): scaffold a Node.js entry point for the Hono template

The generated `src/index.ts` only did `export default app`, which starts a server on Workers/Bun/Deno but never listens on Node.js — `npm run dev` started `tsx watch` with nothing on port 3000. The template now ships `src/server.ts` (`@hono/node-server`'s `serve()`) wired into the `dev`/`start` scripts, keeping `src/index.ts` as the edge entry point. `@kotodayori/hono` and the root README also explain the Node.js entry-point split.
