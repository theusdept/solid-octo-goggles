# Exact deployment requirements

## Independent infrastructure

- Proposed GitHub target: `theusdept/solid-octo-goggles`, with optional approved rename to `fastcoinswap-bot`. Empty branches independently checked November 15, 2026. Recheck before push.
- New Railway project `fastcoinswap`, new service `fastcoinswap-bot`. Do not attach any Swift Swap/Nova/other product resources.
- Docker build from root using included Dockerfile. Node 24.22.1; one replica; no horizontal scaling or overlapping workers.
- Mount an independent persistent volume at `/data`, writable by container UID 1000 (`node`). Set `DB_PATH=/data/fastcoinswap.sqlite`.
- Route the Railway-generated HTTPS domain to `$PORT` (default 3000). Set `PUBLIC_URL` to that origin.
- Health path `/health`. It confirms app responsiveness, not provider permissions or end-to-end exchanges.
- Railway config files cannot create a volume, secrets, webhook, backups or domain by themselves; these resources must be configured after approval.

## Required variables

| Variable | Requirement |
| --- | --- |
| TELEGRAM_BOT_TOKEN | Token belonging specifically to @FASTCOINSWAPbot; verify getMe username before using it |
| TELEGRAM_WEBHOOK_SECRET | Generate 32+ random URL-safe characters; use the same value for setWebhook secret_token |
| OWNER_TELEGRAM_ID | Canonical positive numeric owner ID; no leading zeros |
| CHANGENOW_API_KEY | Partner public API key authorized for this independent bot, stored only as a server secret |
| PUBLIC_URL | New service HTTPS origin |
| OPERATOR_NAME | Owner-approved actual operator identity for published policies |
| SUPPORT_CONTACT | Owner-approved monitored support contact; not a placeholder |
| DB_PATH | /data/fastcoinswap.sqlite on persistent volume |
| PORT | Railway port, 3000 default |
| LIVE_EXCHANGES_ENABLED | false initially; only enable after explicit approval and launch checks |
| PROVIDER_ACCESS_CONFIRMED | false until partner v2 capabilities and attribution verified for this bot |
| POLICIES_APPROVED | false until terms/privacy/refunds/operator/contact approved |
| FIXED_RATE_ENABLED | false by default; standard flow works independently |
| FIXED_RATE_ACCESS_CONFIRMED | false until provider specifically enables fixed rates |

No production credentials were connected or inspected while building this package. Their presence, identity and permissions remain unverified.

## Provider access evidence required

Confirm with ChangeNOW that this separate bot is approved for the relevant regions and business account; the partner key correctly attributes commissions; v2 currencies, range, estimated-amount, create and status endpoints are enabled; and address validation supports the intended networks. Some endpoints require activation. Unsupported address validation fails closed, so affected currencies cannot proceed until supported.

Fixed-rate endpoints need explicit enablement. Custom userId/payload fields are intentionally omitted to avoid depending on extra partner-field permissions. The private reporting key is not needed for this implementation. The package does not claim a particular commission rate and does not alter provider-side fees.

ChangeNOW's published help says there is no dedicated test environment. All automated tests here simulate provider responses. They do not verify the production account. Do not spend cryptocurrency to run this suite.

## Controlled launch sequence after approval

1. Recheck remote emptiness, commit/push reviewed source, and deploy the separate service with live creation disabled.
2. Verify volume persistence by restart, policy pages, `/health`, logs and rollback. Confirm read-only getMe reports exactly FASTCOINSWAPbot; never attach another bot's token.
3. With approved settings access, register the Telegram webhook to `PUBLIC_URL/telegram`, `secret_token=TELEGRAM_WEBHOOK_SECRET`, `allowed_updates=["message","callback_query"]`, `max_connections=1`. Do not drop pending updates by default. Check getWebhookInfo and last_error_message.
4. Install the reviewed command list and copy in docs/TELEGRAM.md. Set the public description only when it accurately represents the current launch stage.
5. In Telegram, verify policy acceptance, quote selection, explicit USDT network disambiguation, min/max range rejection, recipient validation and memo display while creation remains off. Confirm group messages cannot operate the bot.
6. Verify actual provider permissions, jurisdiction eligibility, partner commission attribution and support escalation; record evidence outside source secrets.
7. Enable live creation only with explicit owner approval. Provider order creation must return the expected network, address and memo. Creating an unfunded order still contacts production and requires that approval.
8. Do not call the exchange operational until independently checking the deployed revision and real provider exchange behavior. The simulated suite cannot prove settlement, payout, refunds or earned commissions. Any funded settlement test is separately authorized, never silently charged to the owner.

## Deployment is not complete yet

No GitHub commit/push, Railway resources, Telegram settings, production credentials or live transaction flag were changed in this build. Real deployment and account checks remain outstanding.
