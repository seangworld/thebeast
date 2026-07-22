# BeastMoney AI Financial Manager — Generation 2 Architecture

BeastMoney evolves from a set of financial tools into an AI Financial Manager that understands the user's financial story. The initial implementation is infrastructure only: no bank-specific integration, payment initiation, or autonomous financial action is included.

## Flow

1. A connected-account provider adapter obtains consented account and transaction data.
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

Add encrypted connection persistence and RLS, a server-side provider adapter, webhook verification, sync job orchestration, user correction workflows, account-health monitoring, and UI timeline/story surfaces. Those phases should reuse this contract rather than introduce provider-specific downstream models.
