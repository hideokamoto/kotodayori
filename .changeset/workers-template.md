---
"create-kotodayori": minor
---

feat(create-kotodayori): add a Cloudflare Workers template (`--fw=workers`)

New framework option scaffolding a Worker entry point (`export default { fetch }`) that serves `POST /webhook` through `@kotodayori/fetch` + `@kotodayori/stripe` with `constructEventAsync`-compatible signature verification. Ships `wrangler.jsonc`, `.dev.vars.example`, typed `Env` bindings, and `wrangler dev`/`wrangler deploy` scripts.
