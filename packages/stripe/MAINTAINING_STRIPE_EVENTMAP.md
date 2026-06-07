# Maintaining StripeEventMap

The `StripeEventMap` type in `src/index.ts` maps Stripe event type strings (like `'payment_intent.succeeded'`) to their corresponding TypeScript event types from the Stripe SDK.

## Why Manual Maintenance?

The Stripe SDK doesn't export a complete mapping of event type strings to event types. The event types exist (e.g., `Stripe.PaymentIntentSucceededEvent`), but there's no programmatic way to reliably extract the string literal type for each event.

## Checking for Updates

Run the check script to detect missing or extra events:

```bash
pnpm run check-events
```

This script:
1. Extracts event names from `StripeEventMap`
2. Reads event types exported by the installed Stripe SDK
3. Reports mismatches and exits 1 if any are found

**Note:** The script uses heuristics to convert PascalCase type names to dot.notation event names, so it may produce false positives (see `check-events-exceptions.json`).

## Adding New Events

When Stripe adds new webhook events:

1. Check the [Stripe API changelog](https://stripe.com/docs/upgrades#api-versions) for new events
2. Find the corresponding type in the Stripe SDK (e.g., `Stripe.NewFeatureCreatedEvent`)
3. Add the mapping to `StripeEventMap`:

```typescript
export type StripeEventMap = {
  // ... existing events
  'new_feature.created': Stripe.NewFeatureCreatedEvent;
};
```

4. Run `pnpm run check-events` to verify
5. Run `pnpm test` to ensure types compile correctly

## stripe SDK Version Policy

- **devDependency**: `^22.0.0` — the pinned range used for local development and CI builds
- **peerDependency**: `>=17.0.0` — the minimum version consumers must provide
- **Bumping**: Upgrade via Dependabot PR or `pnpm update stripe` manually.
  Before merging any stripe bump, confirm `pnpm run check-events` is green (the
  CI `check-stripe-events` job in `ci.yml` enforces this automatically).

## CI Design: Two Complementary Systems

Two GitHub Actions jobs guard `StripeEventMap` from different angles:

### Case A — PR/push blocker (`ci.yml` › `check-stripe-events`)

- **Trigger**: every push to `main`/`develop` and every PR against those branches
- **stripe version used**: the pinned devDependency in `pnpm-lock.yaml` (`^22.0.0`)
- **Purpose**: block merges that break sync with the *currently pinned* stripe
- **Permissions**: none beyond the default read token
- **Write access**: none — never commits or opens issues

This job ensures contributors cannot accidentally introduce a mismatch when
they bump the `stripe` devDependency or edit `StripeEventMap`.

### Case B — Weekly upstream sentinel (`.github/workflows/stripe-events-sync.yml`)

- **Trigger**: `schedule` (every Monday 00:00 UTC) + `workflow_dispatch`
- **stripe version used**: `stripe@latest` installed fresh on the runner each run
- **Purpose**: detect new event types that Stripe shipped *upstream* before they
  reach the pinned devDependency — an early-warning system independent of PRs
- **Permissions**: `contents: read` only
- **Write access**: none — never commits, never opens issues, never pushes

**How failure is communicated**: when the job exits 1 (mismatch found), GitHub
automatically emails the repository administrators. No `issues: write` permission
or extra notification infrastructure is needed.

The job also writes its output to `$GITHUB_STEP_SUMMARY` so the mismatch details
are visible directly in the Actions run UI without needing to dig through logs.

**Lockfile/package.json changes are ephemeral**: `pnpm add stripe@latest` runs
on the runner and never gets committed back to the repository.

### Why not combine them into one job?

The two jobs serve different threat models:

| | Case A (ci.yml) | Case B (sync.yml) |
|---|---|---|
| Trigger | PR / push | Weekly schedule |
| stripe version | pinned (lockfile) | latest published |
| Detects | regression from edits | upstream additions |
| Blocking | yes (blocks merge) | no (async alert) |

Using `stripe@latest` in CI would make PRs non-deterministic (a passing CI run
today could fail tomorrow if Stripe publishes a new event overnight).  Keeping
the two concerns separate maintains reproducible PR checks while still providing
proactive upstream monitoring.
