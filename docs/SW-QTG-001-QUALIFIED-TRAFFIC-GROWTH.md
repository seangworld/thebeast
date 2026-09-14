# SW-QTG-001 — Qualified Traffic Growth Intelligence

Status: Released to Production on 2026-08-28

## Release evidence

- TheBeast PR 33 merged as `d56c21c38094ad6ee0a7010b14fc20d0991d9d65`.
- Accepted candidate tree: `90831bd84c3a79f6a601460b8d3fb50ff5009a35`.
- Accepted Preview deployment: `dpl_81HQ2KWPSjBe6LmkW4eDw71tobyX`.
- READY Production deployment: `dpl_86D6jYYqcFHLrDXZunvkEnFaGo4L`.
- Production alias: `thebeast.seangworld.com`.
- Validation at release: 29 focused tests and 1,723 full-suite tests passed.
- Canonical closure: `roadmaps/completed/SEANGWORLD/SW-QTG-001-qualified-traffic-growth.md`
  in BeastFusion.

## Objective

Make Qualified Traffic Growth the primary current SEANGWORLD growth objective
without creating another dashboard or authorizing content production, external
distribution, advertising, spend, providers, or proposal execution.

## Diagnosis

The existing owner-only SEANGWORLD Intelligence surface already loads GA4,
Google Search Console, and first-party aggregate evidence. It reports traffic
sources and landing pages separately, so the owner cannot see which source sent
traffic to which asset or whether that traffic produced a meaningful action.
The existing Search Growth Engine also lacks the governed `Distribute`
classification, and BeastMarketing does not visibly identify qualified traffic
as its primary objective.

Production BeastMarketing has no campaign, asset, outcome, recommendation, or
distribution-plan records. This package therefore does not migrate or change
financial, member, marketing, or public-content data.

## Scope

- Reuse `/dashboard/admin/intelligence` and its current provider pipeline.
- Add source + landing-page qualified-traffic rows for current and prior periods.
- Define qualified actions as existing GA4 events for guide downloads,
  resource/tool views, Beast entry selections, and account-creation selections.
- Add `Distribute` to the search-growth classification contract.
- Require every search recommendation to expose traffic source, target audience,
  existing asset, action, expected benefit, effort, and measurement.
- Show the primary objective and a direct evidence path inside BeastMarketing.
- Preserve provider failure states and render missing evidence as unavailable.

## Boundaries

- No new database, migration, analytics provider, credential, dashboard, public
  route, content, campaign, ad, social post, email, or paid-media operation.
- No automatic proposal intake, publication, distribution, execution, or spend.
- Observer may monitor traffic evidence only if that exact source is separately
  present in its persisted standing authorization; this package does not expand
  the current three-source standing assignment.
- Search and marketing recommendations remain owner-only decision support.

## Validation

- Focused qualified-traffic, provider, and BeastMarketing tests passed.
- The full TheBeast suite, lint, and Production build/type validation passed.
- Independent review, protected Preview verification, owner acceptance, and
  exact Production provenance were completed before canonical closure.
