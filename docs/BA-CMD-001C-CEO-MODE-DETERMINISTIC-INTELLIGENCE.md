# BA-CMD-001C — CEO Mode Deterministic Intelligence Repair

## Boundary

CEO Mode is a read-only owner surface. BeastFusion remains canonical governance truth through the immutable BA-CMD-001A read model. Repository and deployment evidence comes from the read-only BA-CMD-001B provider snapshot. CEO Mode never reads BeastFusion repository files at runtime and never creates execution authorization.

## Deterministic operating questions

- **Yesterday:** canonical execution/release events and verified operational events from the prior America/New_York calendar day.
- **Overnight:** the same normalized evidence from 6:00 PM yesterday through 8:00 AM today, or through the current time before 8:00 AM.
- **Attention:** current incidents, canonical blockers/warnings/failures/measurement, release drift, feedback, and AI-quality evidence. Missing configuration remains separate from operational failure.
- **Next work:** critical incident; failed or rolled-back release evidence; highest-priority canonical blocker requiring an owner decision; fully selected and authorized canonical package; highest-priority approval decision; otherwise the canonical strategy directive.

Stable ties use canonical priority and then canonical item ID. Planned work is never converted into an execution instruction. Provider staleness or failure closes the execution-selection path and retains the last truthful projection visibly.

## Advisory opportunity boundary

The former AI recommendation placeholder is labeled **Opportunity recommendations**. Items require a persisted, source-cited, owner-reviewed feed. They may summarize or propose opportunities but never select work, approve a package, or authorize execution.

## Source migration

The CEO Mode aggregation route no longer queries `beast_admin_roadmap_items` or `get_beast_admin_release_records` as governance truth. Legacy rows remain preserved under the BA-CMD-001A classification boundary and are not silently merged into the canonical projection.

## Security and failure behavior

- Existing owner authentication and admin-role authorization remain required.
- The endpoint is read-only and returns `Cache-Control: private, no-store`.
- Provider credentials and raw tokens remain server-only and are never included in the response.
- Missing, stale, drifted, or invalid canonical evidence is shown explicitly; no legacy or fabricated fallback is used.
- No database migration, provider configuration, execution control, BF-DASH change, or deployment is included in this candidate.

## Validation contract

Focused tests cover canonical/provider event normalization, America/New_York and daylight-saving boundaries, critical failures, blockers, fully authorized selection, approval-only decisions, planning-only state, stale and missing sources, truthful empty state, advisory opportunities, owner-only route composition, and removal of legacy governance queries.

The package exit requires TypeScript, ESLint, the full TheBeast test suite, production build, dependency audit, and `git diff --check` to pass before review.
