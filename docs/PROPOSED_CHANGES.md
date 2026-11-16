# Proposed repository changes — review before committing

Prepared November 15, 2026. Remote repositories and infrastructure have not been changed.

## Repository inspection

- No FASTCOINSWAP match in connected GitHub code search or the accessible repository inventory (70 repositories returned).
- `laughing-octo-pancake` contains a generic ChangeNOW Telegram bot. README/configuration do not establish that it belongs to @FASTCOINSWAPbot. Left untouched.
- `effective-giggle` identifies Nova Exchange; `potential-carnival` identifies ReturnGuard; `nova-buider-one` is a separate AI Studio app. Left untouched.
- `solid-octo-goggles` was listed with size zero and its branch collection returned `[]`: suitable proposed target, with no confirmed previous designation for FASTCOINSWAPbot.
- Do not reuse `crypto-trading-engine`, Swift Swap, another product's repository, database, tokens, domains or Railway services.

## Proposed additions

- `runtime/validation.js`: input and launch configuration validation; exact decimal range comparisons.
- `runtime/provider.js`: documented authenticated ChangeNOW v2 adapter with bounded GET retries and non-retrying order creation.
- `runtime/store.js`: SQLite schema, sessions, policy acceptance, update/creation ledgers, order ownership, outbox, admin roles and security events.
- `runtime/bot.js`: complete conversation and command handlers, explicit networks, confirmation, tracking, owner reconciliation.
- `runtime/server.js`, `runtime/index.js`, `runtime/telegram.js`: authenticated webhook, serial execution, policy pages, status worker and durable Telegram delivery.
- `runtime/policies.js`: product-specific privacy, terms and refund drafts; operator/support supplied by environment, never invented.
- `test/`: provider simulations, complete conversation tests, storage restart/recovery tests, authenticated HTTP tests.
- Dockerfile, Railway config, environment schema/example, lockfile and GitHub Actions workflow.
- `upstream/`: exact GitLab source snapshot, including its original FLOW.md and configuration.
- `docs/`: provenance, provider endpoint contract, BotFather copy, deployment instructions, operational runbook and validation record.

## Approval scope still needed

1. Use/rename the proposed empty GitHub repository and commit/push this package.
2. Create a separate FASTCOINSWAP Railway project, one service, persistent volume and HTTPS domain; any hosting charges require approval.
3. Configure this bot's credentials and register its Telegram webhook/commands/descriptions.
4. Approve policy/operator/support details and provider access evidence before enabling live order creation.

Approval to commit does not itself confirm provider permissions or prove production exchanges work. Default flags keep creation off.
