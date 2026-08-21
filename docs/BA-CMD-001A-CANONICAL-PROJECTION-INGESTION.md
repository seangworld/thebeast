# BA-CMD-001A — BeastFusion Canonical Projection Ingestion

## Decision

BeastFusion owns roadmap, execution-governance, and declared-release truth. BeastAdmin stores and reads a deterministic, sanitized projection of that truth; it does not edit it or depend on the BeastFusion repository at runtime.

This package implements only the ingestion boundary and immutable read model. It does not replace the existing CEO Mode screens, complete repository/deployment intelligence, verify Preview/Production parity, retire BF-DASH, or authorize work.

## Package boundaries

| Boundary | Responsibility |
|---|---|
| BeastFusion `BF-CMD-PROJ-001` | Generate projection v1 from canonical governance files, validate it, and publish the exact bytes asynchronously. |
| BeastAdmin publication API | Authenticate the publishing machine, verify the signed bytes, strictly validate the contract and hashes, then call the service-only database function. |
| Supabase immutable store | Append accepted snapshots and atomically move one current pointer. Deny ordinary-member reads and all snapshot mutation. |
| BeastAdmin canonical adapter | Convert the current projection into stable roadmap, execution, declared-release, attention, and governance-cursor read models. |
| Legacy adapters | Preserve existing records with an explicit non-canonical classification; resolve identifier conflicts in favor of BeastFusion. |

The application never reads the BeastFusion checkout, Git history, or GitHub API to render canonical governance. Publication is a copy boundary, so an unavailable BeastFusion repository cannot make TheBeast runtime unavailable.

## Publication protocol

The allowlisted BeastFusion workflow sends the exact UTF-8 projection JSON to `POST /api/admin/beastfusion-projection` with:

- `content-type: application/vnd.beastfusion.command-center+json;version=1`
- `authorization: Bearer <short-lived GitHub Actions OIDC token>`

The server-only `BEASTFUSION_OIDC_AUDIENCE` and `BEASTFUSION_OIDC_WORKFLOW_REF` values define exact allowlists. The endpoint verifies the GitHub issuer and signature plus audience, repository, workflow, `refs/heads/main`, exact projection commit, token lifetime, run number, and attempt. It also requires `SUPABASE_SERVICE_ROLE_KEY`, returns only sanitized status, and never returns identity tokens or the service-role key. BeastFusion receives no reusable TheBeast, Supabase, Vercel, or database credential.

An operator can publish a generated artifact with:

```bash
npm run beastfusion:publish -- --file /absolute/path/to/beastfusion-command-projection.v1.json --url https://dev.example.com/api/admin/beastfusion-projection --audience https://dev.example.com/api/admin/beastfusion-projection
```

The command runs only inside the allowlisted GitHub Actions workflow and exchanges GitHub's short-lived request credential for a narrowly scoped OIDC token. No reusable publication secret is stored in BeastFusion.

## Acceptance and failure behavior

Before insertion, the application verifies:

- projection version and schema identifier;
- exact keys and primitive types throughout the v1 contract;
- source repository, branch, commit, required source manifest, and manifest ordering;
- canonical input digest, projection identifier, and payload SHA-256;
- unique roadmap identities and executable-work governance gates;
- owner-only sanitized classification and absence of likely secrets, bearer tokens, private keys, and email addresses;
- OIDC signature, issuer, audience, repository, workflow, ref, commit, lifetime, run-order, attempt, and replay controls;
- one-megabyte maximum payload.

Accepted snapshots are immutable. Re-publishing the current identity is idempotent. A stale timestamp, downgrade, conflicting identity, malformed payload, or drift is rejected and the last valid current pointer remains unchanged. If configuration is missing, no snapshot exists, the current snapshot is stale, or validation fails, the provider exposes an explicit state rather than silently falling back to legacy truth.

## Storage and access boundary

`public.beastfusion_command_snapshots` is the append-only evidence store. `public.beastfusion_command_ingestions` is the append-only accepted-publication/heartbeat receipt store. `public.beastfusion_command_current` contains only the singleton pointer to the accepted current snapshot. Row-level security is enabled on all three tables. `anon` and `authenticated` have no direct table or RPC access. Only the service role may publish or fetch raw payloads; the owner-admin receives bounded typed adapters through the server API. Ordinary members cannot read the owner command-center data.

Database checks duplicate critical identity and monotonicity controls, even though full contract and digest validation occurs in the server-only application boundary. Snapshot update and delete operations fail through an immutable trigger.

## Legacy migration classification

Existing data is retained; no existing source is deleted or rewritten into canonical truth.

| Existing BeastAdmin source | Classification after migration | Rule |
|---|---|---|
| Owner-entered roadmap rows | `legacy` | Visible only as explicitly historical/non-canonical data. |
| BeastHunter-promoted roadmap rows | `intake` | Candidate input for BeastFusion review; never executable by itself. |
| New BeastAdmin roadmap rows | `intake` by default | Cannot become canonical through the BeastAdmin database. |
| Existing Release Center rows | `legacy` | Historical release declarations, not canonical governance. |
| New Release Center rows | `annotation` by default | Operational annotation only. |
| Execution-history tables | Separate operational evidence | May be joined downstream, but cannot override BeastFusion execution governance. |
| CEO Mode and Development Console aggregates | `derived` | Must migrate to the canonical adapters in separately authorized packages. |

BeastHunter's prior “Set as Next Build” behavior is narrowed to `candidate_intake`; it no longer grants execution status or creates a GitHub build ticket. BeastFusion remains the only path to approved/executable roadmap truth.

## Downstream adapters and explicit limitations

The canonical adapter supplies:

- roadmap items and authorization gates for future CEO Mode work (`BA-CMD-001B`);
- execution events and canonical cursor for repository/release intelligence (`BA-CMD-001C`);
- declared releases plus explicit `not_in_projection_v1` Preview/Production served-commit fields for parity verification (`BA-CMD-001D`);
- blockers, warnings, validation gaps, and provider/drift state for all three consumers.

Projection v1 intentionally does not contain live deployment observations or served commits. Those values remain `null`/`not_in_projection_v1`; they must not be inferred from declared releases. BF-DASH remains active until the separately governed parity and retirement gates are complete.

## Validation and release gates

Local acceptance requires focused contract, hash, OIDC claim/signature/replay, adapter, conflict, migration-policy, and failure-path tests plus the repository's full test, lint, TypeScript, build, migration, and `git diff --check` checks. DEV must then apply and verify the migration and publish a real BeastFusion projection. Preview and Production require the same evidence and exact promoted commits. A missing project reference, database credential, deployment credential, exact OIDC audience/workflow allowlist, or trusted machine identity is a hard stop; credentials must never be invented.

After Production parity is verified, BeastFusion may record BA-CMD-001A completion through its own governance workflow. Application-side work beyond this package requires separate authorization for `BA-CMD-001B`.
