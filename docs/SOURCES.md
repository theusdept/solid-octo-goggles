# Sources inspected November 15, 2026

- Template and flow: https://gitlab.com/changenow-s-library-catalogue/white-label-telegram-bot — cloned at bc28615577073285195846c96d97998492278949; README, FLOW.md, API adapter, scenes and status worker inspected.
- Partner API reference: https://documenter.getpostman.com/view/8180765/SVfTPnM8?version=latest — current v2 currencies/range/estimate/create/status/validation endpoint shapes examined from its published collection.
- API setup and rate limits: https://support.changenow.io/hc/en-us/articles/22686553746204-Integration-API-setup-and-customization — provider states no dedicated test environment; shared API-key rate limit is 30 requests/second.
- Feature permissions and verification handling: https://support.changenow.io/hc/en-us/articles/22686695418396-Integration-Transaction-management-and-troubleshooting — permission requirements, address validation limitations and verifying status.
- Fees: https://support.changenow.io/hc/en-us/articles/22686447453596-Integration-Commissions-fees-and-payouts — partner fees are account-specific/customizable; no unverified percentage hardcoded in this bot.
- Terms and privacy: https://changenow.io/terms-of-use and https://changenow.io/privacy-policy — provider restrictions, verification and third-party data handling.
- Telegram API: https://core.telegram.org/bots/api — HTTPS Bot API, secret webhook header, updates, commands and message/callback methods.

The public changenow.io/openapi.json currently describes a separate VIP-hosted v3 API with anonymous routes. It was inspected but deliberately not substituted for the authenticated partner v2 API; partner attribution must use the bot's approved account integration.
