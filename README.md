# FAST COIN SWAP · @FASTCOINSWAPbot

Independent noncustodial Telegram exchange application, adapted from ChangeNOW's white-label Telegram bot flow. **Prepared and locally tested; not committed, deployed, activated, or verified against a production account.** No cryptocurrency was spent.

## Run and test

Requires Node.js 24. `npm ci --ignore-scripts`, `npm test`, `npm run check`. Copy `.env.example` to `.env` and configure only FASTCOINSWAPbot's own values before `npm start`. Startup does not register webhooks or change Telegram settings.

## What is included

- Terms acceptance; currency and explicit network selection; range validation; authenticated live provider quote requests; destination/refund address validation; memo/tag inputs; confirmation; provider-issued pay-in instructions.
- Standard flow by default. Optional fixed rates require separate provider permission and configuration. No fiat, account balances, custody, automated trading, wallet connection, widgets, fabricated quotes or deposit addresses.
- User-owned order history/status; status polling; persistent notification outbox; provider error recovery; durable duplicate protection; unknown-creation reconciliation.
- Owner/admin commands; rate limiting; fail-closed live creation flags; SQLite persistence; HTTP health and policies; Railway Docker deployment configuration; simulated-provider and HTTP integration tests.
- No Stars billing: this product exchanges cryptocurrency through a provider; it does not sell digital entitlements.

## Source provenance and deliberate migration

Upstream: https://gitlab.com/changenow-s-library-catalogue/white-label-telegram-bot

Inspected revision: `bc28615577073285195846c96d97998492278949` (November 15, 2026).

The exact upstream working files are preserved in `upstream/` for review. They are **reference only** and excluded from the production image. The runnable adaptation is `runtime/`.

| Upstream | FAST COIN SWAP adaptation |
| --- | --- |
| Node 11, Babel, deprecated request libraries | Node 24, native modules, native fetch; no runtime npm dependencies |
| Telegraf scenes | Explicit persisted conversation stages, inline confirmations and commands |
| MongoDB orders + Redis sessions | One isolated SQLite database on a persistent Railway volume; exactly one replica |
| API v1 tickers | Partner API v2 explicit ticker/network pairs and authenticated requests |
| Read/agree redirect and IP capture | Full policy text, versioned acceptance; no IP collection |
| Poll recent orders for 3 hours | Rotate through unresolved orders, including verifying/failed, until finished/refunded |
| Creation errors return to address input | Definite rejection permits correction; ambiguous POST blocks duplicates pending reconciliation |

This preserves the template's customer exchange sequence, not its obsolete dependency architecture. Original source and the migration table make every departure reviewable.

## Review and deployment

Read [proposed changes](docs/PROPOSED_CHANGES.md), [deployment requirements](docs/DEPLOYMENT.md), [commands and copy](docs/TELEGRAM.md), [security/runbook](docs/RUNBOOK.md), and [test results](docs/TEST_RESULTS.md).

Suggested empty GitHub target: `theusdept/solid-octo-goggles`, optionally renamed `fastcoinswap-bot` after approval. It had no branches at inspection. No remote files were written. Recheck it immediately before any approved push; stop if it is no longer empty.

## License

The upstream package declares `ISC` in its package metadata; no standalone license/copyright grant was present in the inspected tree. Preserve the upstream files and provenance. This adaptation is private and carries no new public license grant. Confirm redistribution rights and choose a license before public publication.
