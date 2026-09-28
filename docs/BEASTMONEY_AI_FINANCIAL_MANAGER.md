# BeastMoney AI Financial Manager — Generation 2 Architecture

BeastMoney evolves from a set of financial tools into an AI Financial Manager that understands the user's financial story. The initial implementation is infrastructure only: no bank-specific integration, payment initiation, or autonomous financial action is included.

## V1 institutional connection boundary

The first live institutional integration is intentionally narrower than the full Generation 2 architecture:

1. The member explicitly connects an institution and selects accounts.
2. Connections are read-only and balance-monitoring only.
3. Balances refresh only when the member selects **Refresh balances**. No scheduled polling is enabled in V1.
4. Provider-reported current/available balances and credit limits are stored with source and retrieval timestamps.
5. BeastMoney compares the provider-reported balance with the existing canonical BeastMoney record.
6. A provider balance never silently overwrites a BeastMoney balance. The member must explicitly confirm any canonical update.
7. V1 does not sync transactions, initiate payments or transfers, pay bills, or move money.
8. Provider-specific credentials and tokens remain server-side and never enter AI context.

The provider contract remains capable of later transaction/webhook extensions, but those capabilities are not part of V1.

## Flow

1. A connected-account provider adapter obtains explicitly consented account data.
2. Provider records normalize into the shared `FinancialTransaction` contract with stable fingerprints.
3. Transaction intelligence emits immutable, owner-scoped events such as `transaction.posted`, `payment.detected`, and `income.detected`.
4. The financial pipeline deduplicates events, updates evidence-backed Financial Memory, and assembles the Live Timeline.
5. The AI Financial Story explains what changed, why it changed, what it means, and recommended next actions.
6. Existing BeastMoney calculation and recommendation engines remain authoritative for cash, debt, forecasting, and strategy calculations.

## Extension boundaries

Future aggregators or direct institutions implement `ConnectedAccountProvider` and register with `ConnectedAccountProviderRegistry`. Provider credentials and tokens belong in a secure server-side secrets boundary and are never part of shared events or AI context. Cursors support incremental sync; provider external IDs and fingerprints make ingestion idempotent. Webhooks can feed the same normalization pipeline without changing downstream consumers.

Shared events carry provenance, occurrence and observation timestamps, correlation IDs, and owner identity. Other Beast modules may consume explicitly permitted event summaries but do not gain ownership of BeastMoney records.

## Safety and user control

- Payment and income detections are hypotheses with visible confidence, not facts.
- Recommendations cite event evidence and require confirmation.
- The architecture never executes payments, transfers, connections, or account changes automatically.
- Account consent is explicit and revocable; disconnected and reauthorization states are first-class.
- Financial Memory stores meaningful patterns with evidence, confidence, timestamps, and optional expiry. Corrections are a supported memory type.
- Empty and partial states always explain the next useful action.

## Next implementation phases

For V1, add encrypted connection persistence and RLS, a server-side balance provider adapter, explicit connect/disconnect flows, member-triggered refresh, balance comparison/review UI, and account-health monitoring. Provider activation and any recurring cost require owner approval.

Transaction synchronization, webhooks, scheduled polling, payment initiation, transfers, and autonomous canonical updates remain later separately reviewed phases. Those phases should reuse this contract rather than introduce provider-specific downstream models.
