---
"@kotodayori/stripe": minor
---

Add Stripe v23 event types to `StripeEventMap` and deprecate Stripe SDK versions older than v23

Eight new event types introduced in Stripe v23 are now covered:
`apps.install.created`, `apps.install.deleted`, `apps.install.updated`,
`financial_connections.account.expected_deactivation_date_updated`,
`financial_connections.account.supported_payment_method_types_updated`,
`financial_connections.account.upcoming_deactivation`,
`financial_connections.authorization.expected_deactivation_date_updated`,
`financial_connections.authorization.upcoming_deactivation`.

Stripe SDK versions older than v23 are now deprecated. The peer dependency still
accepts `stripe` >= 17.0.0, but the next major release will require `stripe` >= 23.0.0.
`createStripeVerifier()` logs a one-time `console.warn` when it receives a Stripe
instance older than v23. With an older SDK and `skipLibCheck: false`, the new event
types above fail to type-check because the SDK does not define them.
