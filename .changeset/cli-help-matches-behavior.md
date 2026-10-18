---
"create-kotodayori": patch
---

Make `--help` match what the CLI does, and fix the behavior it now documents.

- `--help` and `--version` now exit after printing instead of continuing into the prompts.
- `--fw` / `--pm` values outside the supported lists and unknown options (for example `--dry-run`) are rejected before anything is written. Previously an invalid `--fw` left an empty project directory behind, an invalid `--pm` was run as `<pm> install`, and unknown options were silently ignored.
- The help now explains which values are prompted for, how to run without prompts (`--no-skip-install`, `--no-skill`), the non-empty directory check, the Node.js requirement (read from `engines`) and the documentation URL.
- The printed next steps and the generated READMEs use `<pm> run dev` / `<pm> run build` / `<pm> run start`, because `npm dev`, `npm build` and `bun build` do not run the package scripts. The Hono next steps no longer repeat step 4 when `--skip-install` is used, and the documentation link points to the docs site.
- README and docs list Node.js >= 20.19.0 (the existing `engines` range) instead of >= 18, and describe the Express, Lambda and EventBridge templates as available.
