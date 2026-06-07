# Maintaining StripeEventMap

The `StripeEventMap` type in `src/index.ts` maps Stripe event type strings (like `'payment_intent.succeeded'`) to their corresponding TypeScript event types from the Stripe SDK.

## Why Manual Maintenance?

The Stripe SDK doesn't export a complete mapping of event type strings to event types. The event types exist (e.g., `Stripe.PaymentIntentSucceededEvent`), but there's no programmatic way to reliably extract the string literal type for each event.

## Checking for Updates

Run the check script to detect missing or extra events:

```bash
pnpm run check-events
```

This script attempts to:
1. Extract event names from our `StripeEventMap`
2. Find event types exported by the Stripe SDK
3. Compare the two lists

**Note:** The script uses heuristics to convert PascalCase type names to dot.notation event names, so it may produce false positives.

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

## Stripe SDK version pinning policy

The event map is only ever derived from the **installed** `stripe` SDK. The
check script (`scripts/check-events.ts`) reads
`node_modules/stripe/cjs/resources/Events.d.ts` from the pinned SDK and diffs
it against `StripeEventMap`. The version is fixed in two places:

- **devDependency `stripe: ^22.0.0`** — the version actually installed and used
  to generate/verify the event map. It is locked in `pnpm-lock.yaml`, so a
  frozen install always resolves to the same SDK build.
- **peerDependency `stripe: >=17.0.0`** — the range consumers of
  `@kotodayori/stripe` may bring. We intentionally support older Stripe majors
  here; the event map is a superset that remains type-compatible.

Because the installed SDK is pinned and lockfile-frozen, **the event map can
only drift when the `stripe` dependency is bumped.** Re-running the check on the
same pinned version always returns the same result, so there is nothing new to
detect between bumps.

### Bumping `stripe`

Bumps are performed **through Dependabot** (`.github/dependabot.yml`, weekly
`npm` updates on directory `/`, which covers this package). When a Dependabot PR
raises `stripe`:

1. The existing `check-stripe-events` CI job (see below) runs automatically on
   that PR and surfaces any new/removed events.
2. If it fails, update `StripeEventMap` in `src/index.ts` to match, then run
   `pnpm test` to confirm types compile.
3. Do not merge until `pnpm run check-events` is green ("in sync").

Manual bumps follow the same flow: `pnpm update stripe` → `pnpm run check-events`
→ reconcile the map → `pnpm test`.

## CI Integration (adopted policy)

Drift detection is wired into the regular CI pipeline as a **blocking check with
no write permissions** — there is no scheduled run and no automatic issue
creation. This is the deliberate, final policy (it supersedes the earlier
"consider adding it to CI" suggestion and replaces the approach proposed in the
now-closed PR #82).

**`check-stripe-events` job (`.github/workflows/ci.yml`, "case A")**

```yaml
check-stripe-events:
  name: Check Stripe Events Sync
  runs-on: ubuntu-latest
  steps:
    # checkout, pnpm, Node, frozen install …
    - name: Check Stripe Event Map sync
      run: pnpm --filter @kotodayori/stripe run check-events
```

- Runs on every `push`/`pull_request` to `main`/`develop`.
- Requires **no permissions** — it only reads the repo and fails the build on
  drift. Nothing is written back to GitHub.
- It fires at exactly the right moment: on the **Dependabot PR that bumps
  `stripe`**, which is the only event that can actually move the event map.

### Why no scheduled run or auto-issue?

A weekly scheduled job that does a frozen install would re-check the *same*
pinned SDK every time, so it can never detect anything new — drift is gated on a
dependency bump, and bumps already arrive as Dependabot PRs where case A runs.
Adding `issues: write` (or any write scope) to an OSS CI workflow also widens
the supply-chain attack surface for no real signal. We therefore deliberately
omit a scheduled job and any automated issue/PR creation; the Dependabot-driven
case A check is sufficient and keeps CI permission-free.

An optional **read-only** scheduled job that installs `stripe@latest` (ahead of
the pin) and prints the diff to `$GITHUB_STEP_SUMMARY` was considered for early
warning, but skipped: Dependabot already runs weekly, so the lead time gained is
marginal, and it would add a new workflow plus a scheduled unpinned install for
little benefit. If that early-warning signal is ever wanted, it must stay
`contents: read` only — summary output, never issue creation or `git push`.
