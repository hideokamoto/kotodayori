---
"@kotodayori/express": patch
"@kotodayori/fetch": patch
"@kotodayori/hono": patch
"@kotodayori/stripe": patch
---

fix: point the `require` condition's `types` at `dist/index.d.cts`

The `require` condition resolved to the ESM declaration file (`dist/index.d.ts`) while loading the CommonJS build, so CommonJS consumers type-checking with `moduleResolution: node16` / `nodenext` got ESM types for a CommonJS module ("Masquerading as ESM" in Are the Types Wrong?). The build already emits `dist/index.d.cts`; `@kotodayori/core`, `lambda`, `eventbridge` and `zod` already point at it.
