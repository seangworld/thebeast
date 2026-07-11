# Changelog

## BeastMoney v2.2.0 - July 11, 2026

Velocity Strategy Engine hardening milestone.

### New Features

- Hardened Velocity minimum-payment modeling for fixed and revolving debts.
- Added explicit monthly interest and Velocity source-cost assumptions to the engine output.
- Added guardrail warnings for missing APR and missing usable minimum-payment inputs.

### Improvements

- Verified HELOC/PLOC/credit-card source capacity, recovery window, utilization, cash-buffer, and positive net-savings guardrails through focused regression coverage.
- Confirmed BeastMoney Personal Hub references remain permissioned references only; no duplicate goal or document storage was added.
- Confirmed Free / Pro boundaries keep Velocity Planner and Beast Advisor behind Pro entitlement logic.

### Bug Fixes

- Revolving debts now calculate effective minimum payments from the greater of configured minimum, percentage of current balance, and floor during Velocity projections and payoff simulations.

### Breaking Changes

- None.

### Migration Notes

- No database migration required.
- No live banking aggregation, legal advice, tax advice, investment advice, lending advice, or credit-repair advice was added.

## BeastMoney v2.1.0 - July 8, 2026

Commercial polish and event timeline milestone for BeastMoney v2.

### New Features

- Added the Financial Event Timeline foundation for income, bills, minimums, extra payments, Velocity chunks, funding-source draws, source recovery, savings transfers, and shortage risks.
- Added shared recommendation explainability for advisor and insight outputs.
- Added scenario comparison for Minimum, Snowball, Avalanche, Velocity, Custom, extra-payment, payoff-date, and cash-assumption paths.
- Added Simulation Mode so Money projections can be viewed from a selected planning date without changing saved data.
- Added BeastMoney Coach guidance from the shared advisor, forecast, insights, and scenario engines.
- Added import preview foundation for CSV mapping, validation, and duplicate detection.
- Added printable monthly, debt progress, interest saved, net position, and Velocity report summaries.

### Improvements

- Polished Money Cockpit first-run guidance, loading state, and load-error recovery.
- Surfaced clearer reasons, impact, risks, and next actions across recommendations.
- Updated BeastMoney version displays to use the module version instead of the BeastOS platform version.

### Performance Enhancements

- Reused the shared Cash Intelligence, Financial Decision, Forecasting, Insights, Scenario, Coach, and Reports engines from one Money dashboard snapshot.
- Added integration coverage to prevent future dashboard edits from bypassing the shared engine surfaces.

### Bug Fixes

- Added regression coverage to confirm the Money Cockpit does not freeze the current date.
- Added regression coverage for printable reports and shared engine integration.

### Breaking Changes

- None.

### Migration Notes

- No database migration required.

## BeastOS v2.1 - July 4, 2026

Closeout release for BeastLearning v1.0 Private Beta and related BeastOS platform polish.

### BeastLearning v1.0 Private Beta

- Finalized Guided Initialization.
- Added Progressive Dashboard stages.
- Added mission-based onboarding.
- Completed AI Orchestration Platform.
- Added AI integration boundary.
- Added centralized prompt library.
- Expanded Learning intelligence.
- Added knowledge graph and curriculum intelligence.
- Added Learning library, courses, lessons, flashcards, quizzes, practice exams, study guides, search, and collections.
- Added Parent/Learner model.
- Added Student timeline.
- Added certificate generation.
- Added Founding Student program.
- Added feedback platform.

### BeastOS Platform

- Restored two-tone BeastOS branding.
- Added reusable module sub-navigation.
- Fixed Calendar date alignment with local-safe month grid generation.

### Next: BeastLearning Phase 2

- AI refinement.
- Classroom support.
- Teacher portal.
- Real document ingestion.
- Advanced analytics.
- Collaboration.
- Mobile optimization.
