# Telegram setup copy

Display name: **FAST COIN SWAP**

Requested username: **@FASTCOINSWAPbot**. Account ownership/availability has not been independently verified.

## Launch description (under 512 characters)

⚡ Swap crypto with FAST COIN SWAP! 🪙 Choose your coins and networks, review a live ChangeNOW estimate, and receive deposit instructions for your exchange. 📍 Track progress right here. 🔐 No seed phrases or private keys. 🚀 Tap Start, read the policies, then use /exchange. Rates, availability and verification depend on ChangeNOW. 🛟 Need help? /support

## Short About (under 120 characters)

⚡ Crypto swaps via ChangeNOW. 🪙 Choose your network. 📍 Track orders. 🚀 /start 🛟 /support

Use live-swap promotional copy only once production checks pass. Prelaunch About: “🛠 FAST COIN SWAP is preparing for launch. Exchange creation is currently disabled. 🛟 /support”.

## BotFather commands — customer menu

Paste without slash prefixes. Emoji appear in descriptions; command names remain valid Telegram identifiers.

```text
start - 🚀 Start and read policies
exchange - 🔄 Start a new exchange
currencies - 🪙 Browse supported assets and networks
status - 📍 Track your order by ID
history - 🧾 View your recent exchanges
back - ↩️ Go to the previous input
cancel - ❌ Cancel your current draft
help - 🧭 Show commands and guidance
support - 🛟 Get customer support
terms - 📜 Read exchange terms
privacy - 🔐 Read privacy policy
refunds - ↩️ Read refund disclosures
myid - 🆔 Show your Telegram ID
delete - 🗑 Delete your inactive local profile
```

`/new` is also accepted as an alias for `/exchange`.

## Owner and admin commands

| Command | Access / behavior |
| --- | --- |
| /addadmin USER_ID | Owner only; allow aggregate stats access |
| /removeadmin USER_ID | Owner only; remove admin |
| /admins | Owner only; list owner/admin IDs |
| /stats | Owner/admin; aggregate users/orders/uncertain attempts; no wallet details |
| /pause | Owner only; persistently stop new order creation |
| /resume | Owner only; resume only when environment gates also pass |
| /reconcile ATTEMPT_REFERENCE ORDER_ID | Owner only; recover a matching uncertain provider order |
| /clearattempt ATTEMPT_REFERENCE SUPPORT_TICKET | Owner only; release block ONLY after provider confirms no order exists; ticket logged |

Admins cannot place orders for users, change addresses, issue refunds, withdraw funds, change policies or escalate themselves. No unsolicited messaging tools are included.

## Branding assets

Existing separately created FAST COIN SWAP artwork was not copied from other products. Previously prepared files are named “Neon Bitcoin Exchange Network.png” (profile artwork) and “Fast Coin Swap Crypto Banner.png” (banner artwork). Their current bytes and dimensions were not examined during this source build. Image upload and exact Telegram size checks remain setup tasks; no new images were generated and no Telegram photos were changed.
