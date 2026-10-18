---
"create-kotodayori": patch
---

`--help` / `--version` now exit after printing instead of continuing into the interactive prompts. The help text lists every accepted value, the `--skill` aliases and fallbacks, where files are written, the Node.js requirement (from `engines`), and a link to the documentation. Unsupported `--framework` / `--package-manager` values now stop the CLI with an error before any directory is created.
