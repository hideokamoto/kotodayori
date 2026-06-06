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

## Stripe SDK Updates

When updating the `stripe` package:

1. Update the dependency: `pnpm update stripe`
2. Run `pnpm run check-events` to detect any new events
3. Add any missing events to `StripeEventMap`
4. Run the test suite: `pnpm test`

## CI Integration

Drift between `StripeEventMap` and the Stripe SDK is detected by two
complementary GitHub Actions mechanisms:

### Case A — blocking check on contributions (`ci.yml`)

The `check-stripe-events` job in `.github/workflows/ci.yml` runs
`pnpm --filter @kotodayori/stripe run check-events` on every push and pull
request to `main`/`develop`. If the event map is out of sync, the job (and
therefore CI) fails, blocking the contribution until the map is reconciled.
This catches drift introduced by a contributor (for example, bumping the
`stripe` dependency without updating the map).

### Case B — weekly auto-issue creation (`stripe-events-sync.yml`)

A blocking PR check only fires when someone pushes. To also catch drift caused
by *upstream* Stripe SDK releases when nobody is actively contributing, the
scheduled workflow `.github/workflows/stripe-events-sync.yml` runs the same
check **weekly** (Mondays 00:00 UTC) and can be triggered manually via
`workflow_dispatch`.

On drift it opens a GitHub issue titled "Stripe event map out of sync"
(labels `stripe-eventmap-drift`, `area:stripe`, `type:ci`, `phase-1`) containing
the check script output. To avoid noise it first searches for an existing open
issue with the `stripe-eventmap-drift` label; if one exists it adds a comment
instead of creating a duplicate. The job also ends in failure after
opening/updating the issue, so the run is visibly red in the Actions tab — but
the primary signal is the auto-created issue, not the red build. (Auto-issue
creation was chosen over auto-PR creation as the right amount of automation for
this project.)

## Stripe SDK version pinning policy

- The `stripe` package is pinned via the **devDependency** range in
  `packages/stripe/package.json` (currently `^22.0.0`). This is the SDK version
  the `check-events` script reads type definitions from.
- The **peerDependency** range is `>=17.0.0`, so consumers may use any
  reasonably recent Stripe SDK; the event map is maintained against the pinned
  dev range.
- Bumping `stripe` should be done **deliberately** (it can introduce new event
  types), and every bump must be followed by `pnpm run check-events` (and
  `pnpm test`) to reconcile and verify `StripeEventMap`.
