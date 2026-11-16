---
"@kotodayori/core": patch
---

feat(core): add `onUnhandled` callback for events with no registered handlers

`WebhookRouterOptions` accepts `onUnhandled?: EventHandler<WebhookEvent, TContext>`, invoked inside the middleware chain when a dispatched event type matches no handler — a hook for metrics, dead-letter queues, or alerts beyond the built-in log line (which still fires). `StripeWebhookRouter` inherits it via `WebhookRouter`'s constructor.
