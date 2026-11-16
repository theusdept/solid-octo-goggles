# Validation record — November 15, 2026

## Executed

- Node.js **v24.22.1**.
- `npm test`: **75 tests passed; 0 failed; 0 skipped**, using simulated provider and Telegram responses. Full output: `test-output.txt`.
- `npm run check`: passed JavaScript syntax checks for entry point, conversation engine and provider adapter; remaining modules are imported/executed by the tests.
- Process startup smoke: launched the actual runtime locally with fake credentials, isolated temporary SQLite storage and live creation disabled; `/health` returned 200 with `liveOrders=false`; all three policy routes returned 200; SIGTERM shutdown exited 0.
- Exact upstream snapshot checked byte-for-byte against GitLab revision `bc28615577073285195846c96d97998492278949`.
- Telegram description: 350 Unicode code points, below 512. Short About: 88 code points, below 120.

## Coverage

- Full private-chat flow, terms acceptance, currency/network selection, recipient/refund memo steps, quote review and confirmation.
- Exact decimal comparisons, invalid/exponent inputs, min/max range handling and mismatched provider pair/network rejection.
- Fixed-quote expiry, stale floating-quote refresh and new confirmation requirement.
- Authenticated partner API routes/headers and request body; omission of unapproved partner fields.
- Bounded GET retries, HTTP 429 backoff, provider auth/permission/server failures; POST is never retried automatically.
- Ambiguous POST timeout/malformed-success handling, uncertain-attempt lock, duplicate confirmation and update IDs, restart recovery, owner reconciliation.
- Order ownership, group rejection, admin authorization, pause flag, inactive deletion and per-user rate limits.
- Status transitions, duplicate notifications, failed/verifying monitoring, refunded/finished terminal states; one failed poll does not stop others.
- HTTP webhook secret rejection, authenticated delivery, invalid JSON, escaped policy HTML, product-specific health.
- Telegram error redaction and durable delivery after rate limits.

## Not executed / not established

- No actual Telegram webhook registration, token ownership check or live Telegram messages.
- No production ChangeNOW key, permission check, account-specific quote, real order creation, deposit, settlement, payout, commission or refund.
- No GitHub remote commit, push or CI run for this implementation.
- No Railway deployment, Docker image build (Docker unavailable locally), hosted volume durability, domain, backups or alerts.
- Previously created Telegram artwork was not revalidated for dimensions in this code task.

This is a locally tested proposed implementation, not evidence that @FASTCOINSWAPbot is operational.
