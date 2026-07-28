# BeastOS 2.3.0 — Money Coach Online

## Release Candidate

Money Coach is online as a structured BeastMoney workspace grounded in the
authenticated member's saved financial records and the existing deterministic
calculation engines.

## Experience

- Executive Briefing
- Financial Summary
- Recommendation Cards
- Changes Since Last Visit
- Notifications
- Suggested Questions
- Learning from Outcomes

Suggested questions are generated from current observations, prior
conversations, upcoming events, and the current financial review. The workspace
does not expose an unrestricted chat input.

## Execution History Integration

Money Coach reads and writes through the existing owner-scoped execution-history
foundation:

- An explicit recommendation decision creates an execution request and a
  recommendation record.
- The recommendation insert records its initial lifecycle event, confidence
  history, and immutable audit evidence through existing database triggers.
- Accept, decline, and defer decisions use the guarded recommendation transition
  RPC and persist the corresponding member or owner approval.
- An accepted recommendation can later receive a member-reported outcome.
  Completing that flow creates a result, outcome, lifecycle transition, request
  transition, and immutable audit history.
- Simply opening Money Coach creates no execution-history activity.

The existing Supabase migration
`20260728000000_add_execution_history.sql` already contains the required
tables, indexes, triggers, RPCs, and RLS policies. BeastOS 2.3.0 adds no
migration.

## Confidence and Evidence

Each recommendation retains:

- the deterministic rule used by the current Money Coach insight engine;
- supporting BeastMoney values;
- confidence label and score;
- known limitations;
- the source insight identifier used to reconnect current guidance with its
  durable lifecycle record.

Outcome learning is displayed only from persisted outcomes. It is labeled as
member-reported and is not presented as independently verified.

## Safety Boundary

- Existing BeastMoney calculations, forecasts, debt strategies, protected cash
  buffer logic, funding guardrails, and knownness metadata are unchanged.
- Recommendation lifecycle controls do not move money or mutate bills, debts,
  income, balances, payment configurations, or goals.
- No external financial action is marked as verified.
- Missing execution history degrades safely: current guidance remains visible,
  while lifecycle controls explain that decisions cannot be saved.
- Supabase RLS continues to scope member history to the authenticated owner and
  retains BeastAdmin owner review.

## Release Boundary

- Version: `2.3.0`
- Channel: Release Candidate
- Database migrations: none
- Push: excluded
- Deployment: excluded

