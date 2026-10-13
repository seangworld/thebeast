# Agency isolated SQL verification

This standalone harness runs the repository's SQL, unchanged, in a fresh in-memory PostgreSQL engine. It never opens a Supabase connection, reads credentials, or publishes anything. All people, accounts, content and identifiers are synthetic. The minimal `auth.users`, `auth.uid()`, `profiles`, and `storage.buckets` fixtures are local stubs, not service replicas. The storage fixture has no upload capability.

## Reproduce

Use Node 20+ and an ordinary npm registry connection:

```sh
cd scripts/agency-sql-validation
npm ci --ignore-scripts
npm test
```

The script defaults to this repository root and accepts an alternate repository root as its only argument. It writes only its local results.json report; capture stdout separately if updating run.log. `results.json` contains individual outcomes, the PostgreSQL engine version, and SHA-256 hashes of every migration executed. `run.log` is the captured verification transcript. PGlite is pinned to 0.5.9 in the lockfile.

## Evidence

53 checks passed, 0 failed on 2026-10-13. Both Agency migrations were applied unchanged after the actual foundation, preview/distribution, video control-plane, growth-cycle and social migrations. Covered behaviors:

- Anonymous, non-admin, other-owner, authenticated owner and service-role boundaries; actual `SET ROLE`, RLS, `GRANT` and `REVOKE` enforcement.
- Fresh inactive character + unused draft campaign linkage; immutable ownership; retry identity; disabled series and owner approval configuration.
- Approved exact revision/hash, media-less Instagram preparation, rejected other platforms, invalid dates/zones, owner access and account availability.
- Stable slot identity including equivalent timestamp offsets; changed retry metadata rejection; cancellation and invalidation never reactivated by retry.
- Actual existing approval RPC and revision trigger interactions. Edits increment revision and invalidate plans; revoked approval invalidates ready plans.
- Direct SQL publishing/export prevention, identity mutation prevention, inactive character and disabled series requirements, video/social/legacy-work guards, and growth-running linkage exclusion.
- Foreign-key owner isolation, disconnected/expired/future-connected binding rejection, private function execute grants, non-Agency campaign compatibility, and absence of created posts/video jobs.

## Limits

This is executable migration/SQL evidence, not certification of the deployed system. It is not a full replay of every historical migration. It does not test PostgREST, JWT issuance, real Supabase Auth/storage, external providers, or a connected database's current schema/data. PGlite is a single-connection PostgreSQL engine; this run does not empirically prove concurrent interleavings, production load or lock behavior. The SQL contains shared campaign/creative/advisory locks, but multi-session race tests remain a separately approved staging gate. App unit/type/build checks are separate evidence.

The synthetic bootstrap exposes `profiles` for read to support actual RLS predicates; production profile policy configuration must be checked independently. No production identity, connection, credential or seed is included.

## Candidate status

Both migration filenames are present in the application's migration registry and expected migration tests. Registration means code knows these candidates; it is not evidence they were applied anywhere. The migrations are intentionally one-time DDL, not repeatable scripts: do not replay them against an already migrated database or repair history by guessing.

See `rollout-rollback.md` for a review-only deployment plan. Nothing in this harness authorizes deployment, connected migration execution, rendering, account setup or publication.
