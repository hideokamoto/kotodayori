<!--
Thanks for contributing to Kotodayori! Please fill in the sections below.
-->

## Summary

<!-- What does this PR do and why? -->

## Changes

<!-- Bullet the key changes. -->
-

## Changeset

This repository releases via [Changesets](https://github.com/changesets/changesets).
**If your change affects any published package, you must include a changeset.**

Run the following command, follow the prompts (select packages, pick `patch`/`minor`/`major`,
and write a short summary), then commit the generated `.changeset/*.md` file with this PR:

```bash
pnpm changeset
```

Merging this PR into `main` triggers the release automatically (version bump → npm publish),
so the changeset is what determines the new versions and the CHANGELOG entries.

- [ ] I added a changeset (`pnpm changeset`), **or** this PR needs no release (docs/CI/tests only).

## Checklist

- [ ] `pnpm build` passes
- [ ] `pnpm test` passes
- [ ] `pnpm lint` passes
