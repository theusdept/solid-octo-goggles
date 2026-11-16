# Security and operations

## Money and identity boundaries

- Customer funds move from their own wallet to the provider-issued address, then to the entered payout address. No bot wallets, balances, private keys, custody or withdrawal API exists.
- Status/history are bound to the Telegram user who created the order. All exchange operations are private-chat only.
- Only the configured owner can manage admins, pause/resume creation or reconcile an unknown creation. Admins can read aggregate stats only.
- Quote amounts are strings, checked with BigInt-scaled decimal comparison (18 fractional digits). JSON numeric provider values are normalized; their source precision is limited by provider JSON. No local rate/fee arithmetic is invented.
- Webhook requests require Telegram's secret header, valid JSON, a 64 KiB body cap and a valid update ID. HTTPS terminates at Railway. Per-user throttling permits 20 updates/minute; old message replays are rejected. A single serialized worker prevents overlapping confirmations.
- Upstream code is excluded from the production image. Native Node modules eliminate runtime npm dependency installation; update Node deliberately and rerun the suite.

## Order creation uncertainty

An attempt is durably recorded BEFORE POST. POSTs are never retried automatically. Timeout, network interruption, 5xx or malformed successful response marks the attempt uncertain, blocks another order by that user, and exposes a support reference in /history.

After a process restart, any attempt left creating becomes uncertain. A successful response and order instructions are saved atomically with the queued notification. A second confirmation cannot create another order. If the owner obtains the provider order ID, `/reconcile` verifies pair/networks, destination and expected amount before attaching it. Obtain provider confirmation first; do not guess order IDs.

Only use `/clearattempt` after provider support confirms no order was created. Supply that support ticket identifier for the audit record. This is a manual owner attestation, not automatic proof from the API. There is no assumed provider idempotency header or partner lookup permission.

## Status and delivery

- Poll a rotating batch of 100 unresolved orders every 30 seconds. GETs are paced (at most 10/s within this service) and retry at most three times. Provider errors on one order do not stop others.
- Finished/refunded orders stop automatic polling. Failed and verifying orders remain monitored for later refunds/resolution. Unknown statuses are shown as reported, never treated as success.
- No public provider callback is accepted. Polling is authoritative, avoiding unsigned event spoofing. Duplicate Telegram events/status results are idempotent.
- Changes and notifications are written in one SQLite transaction. Telegram messages are retried from a persistent outbox. HTTP delivery uses at-least-once semantics: a process crash after Telegram accepted a message but before the local sent marker may duplicate a notification, never create a duplicate provider order.
- Blocked-user delivery is dropped after Telegram 403; orders remain saved. Other errors leave the message queued. Notification delivery is conservative, ~1 message/second.
- `/health` is process/queue liveness only, not provider settlement readiness. Alert on non-200 health, provider auth/permission failures, growing pending notifications, unresolved attempts and stale polling.

## Persistence and recovery

Railway volume is mandatory. SQLite WAL, main database and shared-memory files must not be copied independently while the app is running. Use a consistent SQLite backup or pause/stop the service for a full-volume snapshot. Keep encrypted backup access restricted and retain backups for 30 days maximum, consistent with published policy. Configure actual backups after deployment; none are scheduled by these files.

Restore only to the same independent bot with creation paused. Verify owner/token identity, run database integrity checks, inspect uncertain attempts, verify orders through the provider, and test notifications before resuming. Use one active replica and disable any overlapping prior worker.

Runtime cleanup removes old update IDs after 30 days, settled records after 90 days and inactive profiles after 90 days. Unresolved orders/attempts remain until resolved. `/delete` removes inactive profile and settled order data; requests involving unresolved orders go through support. Delete covered backup copies by their expiration. Telegram/provider data is outside the bot's deletion control.

## Monitoring / incident response

Logs contain event names and launch state, not raw exceptions, request URLs, tokens or wallet addresses. Audit events include actor IDs and order/reference IDs. Review aggregate `/stats`, deploy logs and the restricted database as needed. Do not publish database snapshots or print production environment variables.

On provider outage: `/pause`, leave tracking running, verify status with ChangeNOW support, then `/resume` only after recovery. On token leak: pause, rotate the affected bot token/secret securely, verify getMe, re-register the webhook after approval and audit ownership. Do not rotate other products' credentials.

On bad release: pause creation, retain volume, roll back code/image, and reconcile in-flight attempts. Never roll back the database to manufacture an empty attempt ledger. No destructive migrations are included.

## Known verification boundaries

No real Telegram delivery, Railway container build, persistent Railway volume, provider key permissions, partner commission, production address support or funded settlement was tested. Backups/alerts require actual hosting configuration. Policies are drafts pending owner identity/support/retention approval; no jurisdiction eligibility or certification is represented.
