# BA-CMD-001D — Command-Center Acceptance and Rollback

## Outcome

BeastAdmin exposes one owner-only command center for canonical roadmap,
execution, release, deployment, repository, history, and deterministic CEO
Mode evidence. BeastFusion remains the only governance source. BeastAdmin
intake and operational annotations remain visibly non-canonical.

## Production acceptance gates

The Development Console computes and displays these gates from current
evidence. A missing or stale source blocks acceptance; no legacy fallback is
allowed.

1. The accepted immutable BeastFusion projection is current.
2. The BeastFusion scheduler source record is at least as current as its
   execution-state source record.
3. All four allowlisted repositories have current read-only GitHub evidence.
4. Every deployed product has current read-only Vercel Production evidence,
   with no detected contradiction against canonical release evidence.
5. The application-only rollback boundary is preserved.
6. Duplicate-dashboard retirement still requires explicit owner acceptance.

The current upstream scheduler record is older than the current execution
state. BeastAdmin therefore reports this as a blocking reconciliation issue
and does not infer a cursor, executable package, or replacement state.
Reconciliation must be published by BeastFusion itself.

## Security and failure behavior

- Both command-center APIs require the existing authenticated owner role and
  return private, no-store responses.
- GitHub and Vercel credentials remain server-only and narrowly read-only.
- Arbitrary repository paths, local worktree claims, raw provider payloads,
  mutation methods, and execution controls are excluded.
- Missing, stale, invalid, or contradictory evidence stays visible and fails
  closed.
- Accepted projections and operational annotations are retained during
  provider failures; neither becomes a fallback for the other.

## Rollback

This package adds application code and documentation only. Roll back by
reverting the application release. Preserve accepted BeastFusion projection
rows and BeastAdmin operational annotations; no database deletion, schema
rollback, or projection replay is required.

## Retirement boundary

`/dashboard/admin/fusion` remains available. It may be retired only after all
technical gates pass, the owner performs an authenticated Production parity
review, and the owner explicitly authorizes retirement. Automated validation
must never convert technical readiness into that authorization.
