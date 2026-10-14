# Agency private review-only planning

This candidate reuses BeastMarketing's private presenter profiles, campaigns, exact-revision ad variants/decisions, and internal distribution plans. It adds no public talent identities or assets. Nothing in this feature calls a provider, renders, spends, creates a social post, or schedules executable work.

## Entry boundary

A workstream is an immutable link from one owned, inactive `future_character` profile to an owned, unused draft campaign and, optionally, an empty disabled video series. A campaign and series can each belong to only one talent's workstream. Multiple campaigns may belong to the same talent.

The campaign must have no variants, assets, distribution plans, outcomes, recommendations, campaign decisions, or referenced social posts. The character must have no video jobs. An optional series must have no jobs and valid object settings. Linking while an owner growth cycle is running is refused. This fresh-only requirement prevents a review opened before talent linkage from approving work under a different identity context.

Link first; create draft ad variants in the existing campaign flow afterward. Newly inserted private variants must begin unapproved. Existing exact-revision owner decisions remain the approval mechanism. Linked variants cannot be moved into or out of another campaign.

## API

`GET /api/admin/agency/plans` returns owner-scoped workstreams and internal plans, the explicit `review_only` mode, and false publishing/rendering/spending authority flags. Each list is capped at 200 and `truncated` reports additional rows. An unavailable database is an error, never an inferred empty queue. Responses are private and not cached.

`POST /api/admin/agency/plans` accepts either:

- `action: link`, `presenterProfileId`, `campaignId`, and optional `videoSeriesId`.
- `action: plan`, `presenterProfileId`, `workstreamId`, `variantId`, exact positive `revision`, `revisionHash`, `channel`, `plannedFor` (timestamp with explicit offset), `timezone` (named zone), optional `ownerNotes`, and optional `connectionId`.

The authenticated owner RPC checks all relationships transactionally. Version 1 plans support Instagram story/reel placements and currently accept media-less creative only. Multi-platform schema support is retained for future work, but Facebook and X requests are rejected. An optional connection must already be available and bound to that exact owner, talent, and channel. Omitting it permits preparation before account setup; neither choice creates posting permission.

The unique slot identity is workstream + variant + revision/hash + channel + planned instant. An identical retry returns the same row. Different notes, timezone, or account on the same slot are rejected rather than silently replacing the plan. Cancelled or invalidated rows are never reactivated by retry. Creative edits and approval revocation invalidate ready plans. Stale approvals are rejected under a creative row lock.

`planned_for` is a private calendar annotation. `ready` means the exact reviewed creative is represented by an internal plan; it does not mean a post is scheduled. Agency plans cannot be exported through the generic distribution exporter.

## Safety boundaries and limits

- Linked profiles stay inactive; linked series stay disabled with publishing off and owner approval required.
- Database guards reject linked video jobs, social posts, campaign activation, and legacy asset/outcome/assessment writes.
- The ordinary growth runner excludes Agency campaigns and rechecks the boundary before derived writes. Shared owner advisory locks serialize growth claims with workstream linkage; database guards also close late-write races.
- Workstream identity and plan identity are immutable. New slots require new reviewed plans. This slice does not implement rescheduling or talent reassignment.
- The dashboard is read-only. New workstreams, variants, and decisions are not created automatically. There is no batch generator or approval-mutation UI in this slice.
- Account availability is checked at planning time. It is not a guarantee of later availability, ownership evidence from the provider, or authorization for future publishing.

## Validation and rollout

Migration `20261012120000_agency_review_only_planning.sql` is registered as a candidate. It has not been applied to a connected database. Deployment, applying migrations, account access, provider configuration, public uploads, or activation require separate approval.

Focused regression coverage is in `tests/agencyPlanning.test.ts`, `tests/marketingGrowthCycleRunner.test.ts`, the Agency read-only interaction tests, and the migration registry tests. SQL transaction/permission behavior must also be validated against an isolated PostgreSQL-compatible database before any approved rollout. Missing schema causes the planning endpoint and growth scope checks to fail closed; plan migration and application rollout together.
