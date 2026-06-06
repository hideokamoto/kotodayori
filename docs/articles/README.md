# Articles (pre-publication drafts)

This directory holds **pre-publication drafts** of release/announcement articles
for Kotodayori. They are kept in the repository so the wording can be reviewed in
PRs before going live. **Nothing here is published yet** — each draft has
`published: false` in its front matter and a `Status: DRAFT` banner at the top.

## v1.0 release article — Idempotency & DLQ

| Language | File | Target platform | Front matter |
| --- | --- | --- | --- |
| English | [`v1.0-idempotency-dlq.en.md`](./v1.0-idempotency-dlq.en.md) | dev.to | dev.to-style |
| Japanese | [`v1.0-idempotency-dlq.ja.md`](./v1.0-idempotency-dlq.ja.md) | Zenn / hidetaka.dev | Zenn-style |

Both drafts cover the same skeleton:

- What the official Stripe SDK already solves (signature verification) and the
  layer everyone re-implements by hand beyond it.
- Why idempotency and a dead-letter queue (DLQ) are coupled.
- How it plugs in via Kotodayori's `router.use()` middleware.
- Choosing a store: InMemory vs DynamoDB guidance.
- Migration for existing users (a "just add 3 lines" change).

> **API note:** The routing API used in the articles (`StripeWebhookRouter`,
> `.on()`, `.use()`, `createStripeVerifier`) exists today. The dedicated
> `@kotodayori/idempotency` package API is the **intended v1.0 design**, and any
> snippet importing from it is explicitly marked **forward-looking / illustrative**.

## Remaining manual steps (maintainer only)

These cannot be done from the repository draft and remain TODO:

- [ ] Publish the English article to dev.to (set `published: true`).
- [ ] Publish the Japanese article to Zenn and/or hidetaka.dev.
- [ ] Add the live article URLs to the root `README.md`.
- [ ] Add the live article URL to the npm `description` / package metadata.
- [ ] Cut the v1.0 npm release alongside publishing.
- [ ] Announce on X and relevant communities.
