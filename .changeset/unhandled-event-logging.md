---
"@kotodayori/core": patch
---

feat(core): log a one-line notice when an event type has no registered handlers

`WebhookRouter.dispatch()` now logs `No handlers registered for event type "<type>" (id: <id>)` through the router's logger when an event matches no handler. It prefers `logger.debug`, falls back to `logger.info`, then `logger.warn`, so minimal loggers still see it while full loggers keep it out of warn-level noise (providers like Stripe deliver every subscribed event type, so unhandled types are routine). The response and middleware contract are unchanged.
