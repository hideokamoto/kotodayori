---
"@kotodayori/hono": patch
"@kotodayori/express": patch
"@kotodayori/lambda": patch
"@kotodayori/fetch": patch
---

Infer the adapter event type from the verifier only. Previously the router's dispatch signature also fed inference, so `onError` received a widened type (e.g. `WebhookEvent`) instead of the verifier's event union.
