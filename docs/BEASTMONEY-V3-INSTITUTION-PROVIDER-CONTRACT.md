# BeastMoney institutional provider adapter contract

This is the implementation boundary for the first approved financial-data provider.

## Required server-side operations

1. **Create connection authorization**
   - Generate the provider's short-lived connection/link token on the server.
   - Request only account identity/metadata and balance scopes required by V1.
   - Never request transaction, transfer, payment-initiation, identity, investment-trading, or other scopes unless separately approved.

2. **Exchange connection authorization**
   - Exchange the provider's temporary authorization result on the server.
   - Store the long-lived provider secret/token only in the approved encrypted server-side secret boundary.
   - Persist only provider-neutral connection/account references in BeastMoney member tables.

3. **Refresh balances**
   - Run only after an authenticated member explicitly requests refresh.
   - Enforce the BeastMoney manual-refresh policy/cooldown.
   - Fetch current balance, available balance when supplied, credit limit when supplied, currency, and provider observation time.
   - Normalize into `ConnectedAccountBalance`.
   - Write a new immutable balance snapshot.
   - Never update a canonical BeastMoney debt/funding-source balance during refresh.

4. **Review/accept**
   - Compare the newest snapshot with the linked canonical BeastMoney record.
   - Member explicitly accepts or leaves the saved record unchanged.
   - Accepted updates use the audited `accept_money_connected_balance` command.

5. **Disconnect**
   - Revoke/remove the provider connection where supported.
   - Mark the BeastMoney connection disconnected and record consent revocation.
   - Preserve historical balance/reconciliation evidence subject to the product retention policy.

## Required failure behavior

- Reauthorization-required, provider outage, rate limit, and generic error are distinct connection states.
- A failed refresh leaves the previous canonical BeastMoney record unchanged.
- Never substitute cached/stale data while labeling it as a fresh balance.
- Never expose provider credentials/tokens to browser JavaScript, logs, AI prompts, analytics, or member-readable database rows.

## V1 prohibited behavior

- Scheduled polling/cron refresh.
- Transaction synchronization.
- Automatic categorization from institution data.
- Automatic canonical balance overwrite.
- Transfers, ACH, card payment, bill payment, or any money movement.
- Autonomous financial action.

Provider selection, Production terms/cost, credentials, and Production activation remain owner gates.
