# Agency review-only rollout and rollback plan

Status: proposed procedure only. No connected database was queried or changed. No deployment, migration, account setup, provider work or publication was performed. Isolated synthetic verification passed 53/53 checks; see `results.json` for exact SQL hashes.

## Preflight before any approved rollout

1. Obtain explicit approval for the intended environment and migration/application operation. Validate the target project independently; never infer it from a cached CLI link. Do not bootstrap production or apply unrelated pending migrations as a side effect.
2. Pin the reviewed application commit and exact migration hashes. Run app tests/typecheck/build, dependency review and this SQL harness. Compare connected migration history and actual schema to the candidate prerequisites under the approved read scope. Investigate drift or partial application rather than rerunning DDL blindly.
3. Use the repository's migration guard and its documented environment confirmation/dry-run sequence. Review the complete pending SQL list. Stop if it contains unexpected migrations or destructive changes. No project identifiers or credentials belong in this document.
4. Arrange a verified recoverable snapshot/backup and a maintenance/change window, especially because the candidate adds triggers to existing shared tables. Record baseline row counts and configuration; inspect only the minimum necessary data. Do not export user data without approval.
5. Pause or gate affected application writes and growth processing through approved controls. There is no new feature-flag implementation assumed here. Never disable safety triggers as a rollout shortcut. Keep social/video publishing permissions unchanged and ungranted.
6. Apply first to a separately approved isolated staging database. Verify actual server version, predecessor constraints, owner/admin profile policies, RLS and grants. Re-run role-level behavioral cases there with synthetic fixtures. Add two-session race tests for link versus growth claim/video insertion, link versus legacy writes, and approval/edit versus queue. Confirm row/advisory locks resolve each interleaving without a ready stale plan or escaped legacy job. Inspect deadlock/lock-wait behavior and define safe transaction retry behavior.

## Approved application/schema sequence

1. Deploy the boundary-aware application and both migrations in a coordinated window while affected writes remain paused. The order of migrations is `20261012040132_agency_social_bindings.sql`, then `20261012120000_agency_review_only_planning.sql`. Each migration has its own transaction; the pair is not one atomic transaction.
2. Verify the schema and migration history after each success. If migration two fails, retain the inert private bindings table and investigate; do not proceed with planning writes. Never mark a failed migration applied by hand.
3. Before resuming, verify the application recognizes review-only workstreams and excludes them from ordinary growth/publishing paths. Missing schema should fail closed in planning and growth-scope checks. Do not run an old growth runner against data containing Agency links.
4. Smoke-test authenticated owner access and other-owner/anonymous denial using synthetic fixtures only, with no provider/account connection. Verify response authority flags stay false, the dashboard stays read-only, generic export rejects Agency plans, no executable scheduling occurs, and no social post/video job is created.
5. Confirm the intentionally inactive profiles, draft campaigns, disabled series, private bindings, immutable plan linkage, exact-revision checks and function/table permissions. Observe application errors, queue counts and lock waits. Keep public posting, rendering, spending and provider setup outside this release.

## Rollback: preferred fail-closed path

- Stop affected new writes and background growth work using approved controls, then disable/revert the Agency entry point while retaining database guards and immutable links. Preserve all existing Agency data for review.
- Do not revert to an application version that interprets linked Agency campaigns as ordinary executable campaigns. A rollback build must retain the Agency exclusion logic and fail-closed checks, or affected background processing must remain paused.
- Do not drop the Agency tables/columns/triggers while linked data exists. Removing identity or guard metadata would strip the very boundary preventing downstream activation. Do not “unlink” by deleting rows or nulling references.
- For a failed second migration, its transaction should roll back its own DDL. Verify actual state and retain the first migration's inert private table. Correct the cause under a reviewed forward migration rather than replaying ambiguous history.
- Prefer a reviewed forward fix. Restore from a verified backup only with explicit restoration approval, a defined data-loss window, and reconciliation of writes made since the backup. A schema-only revert is not an adequate data rollback.

## Exceptional schema removal

Only consider removal in an approved empty staging environment or after a separately authorized, reviewed data-preserving evacuation. First establish that no Agency workstreams, bindings or Agency-tagged distribution plans exist and no application code can write them. Prepare a dependency-ordered down migration, rehearse it against a disposable clone, and verify ordinary campaigns remain protected and no queued work activates. Do not use `DROP ... CASCADE` or remove guards on a live populated database. No destructive down script is supplied or executed here.

## Release acceptance

The candidate can be reviewed and merged with the synthetic evidence attached. A live rollout remains blocked pending environment-specific approval, history/schema inspection, staging multi-session verification, recovery readiness and coordinated application release. Passing these tests conveys no publication authority.
