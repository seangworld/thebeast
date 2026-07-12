# Changelog

## BeastLearning v1.5 Private Beta - July 11, 2026

Education-path guidance and curriculum architecture milestone.

### New Features

- Added explicit guidance assumptions, planning boundaries, Learning Readiness signals, and next recommended actions for career, college path, certification, trade, promotion, and skill goals.
- Added a subject-agnostic curriculum hierarchy from subject to objective so new teachable subjects can follow the same framework without code changes.
- Added adult certification study support that keeps student and minor safety requirements intact.

### Improvements

- Clarified guidance-counselor mode as planning support rather than official school counseling.
- Replaced broad outcome language with Learning Readiness, confidence, mastery, knowledge retention, learning momentum, study consistency, and prerequisite completion signals.
- Reinforced tutor-like flow by focusing guidance on one next step before adding more planning detail.

### Breaking Changes

- None.

### Migration Notes

- No database migration required.
- No production deployment included.

## BeastLearning v1.4 Private Beta - July 11, 2026

Core learning-loop milestone.

### New Features

- Added the first complete BeastLearning core loop contract for onboarding, diagnostic placement, skill-gap detection, learning-path generation, teachable lesson state, learner response evaluation, hints, alternate explanations, mastery checks, remediation, and resume behavior.
- Added Pre-Algebra placement questions and a Combining Like Terms teachable lesson proving ground.
- Added tutor turns that ask one question at a time, wait for learner response, avoid answer reveal during hints, and route weak evidence to remediation.

### Improvements

- Progress reporting now distinguishes completed steps from mastery evidence.
- Tests now cover successful mastery advancement and weak-placement remediation.

### Breaking Changes

- None.

### Migration Notes

- No database migration required.
- No production deployment included.

## BeastLearning v1.3 Private Beta - July 11, 2026

Curriculum and content discipline milestone.

### New Features

- Added Learning content status labels for courses, lessons, study guides, and recommendations.
- Added curriculum/content review requirements for accuracy, age appropriateness, accessibility, and safety.
- Added starter-path standards that prevent claims beyond implemented source evidence.
- Recorded third-party learning-site direction as planning context only.

### Improvements

- Public curriculum and content claims now have explicit guardrails against full-coverage, compliance, teacher-portal, and integration claims.

### Breaking Changes

- None.

### Migration Notes

- No database migration required.
- No production deployment included.

## BeastLearning v1.2 Private Beta - July 11, 2026

Assessment and mastery foundation milestone.

### New Features

- Added explicit assessment signal assumptions for quiz, guided practice, confidence, and teaching progress.
- Added progress continuity evidence that preserves completion handoff state, next queued activity, and newest ready activity behavior.

### Improvements

- Hardened mastery language so review recommendations remain conservative and non-shaming.
- Added lesson progress continuity metadata for the next recommendation and preserved assessment signals.
- Added release evidence for safety/privacy review of assessment and mastery data.

### Breaking Changes

- None.

### Migration Notes

- No database migration required.
- No production deployment included.

## BeastLearning v1.1 Private Beta - July 11, 2026

Private beta stabilization milestone.

### New Features

- Added BeastLearning v1.1 private beta readiness evidence for entry points, lesson flow, AI tutor behavior, feedback surfaces, timeline, certificates, and beta review.
- Added Personal Hub reference contracts for education goals, career goals, certification goals, learning preferences, accessibility preferences, and records/certificates without duplicate BeastLearning ownership.
- Added guardian visibility boundaries for invitation, consent, private notes, and revoked access.

### Improvements

- Documented explicit lesson completion criteria across teaching phases, guided practice, quiz answers, reflection, and mastery review.
- Hardened AI homework policy with safety, uncertainty, age-appropriate, and unsupported-claim guardrails.
- Preserved mostly-free learner access while marking Pro packaging boundaries as requiring owner decision.

### Breaking Changes

- None.

### Migration Notes

- No database migration required.
- No production deployment included.

## BeastMoney v2.3.0 - July 11, 2026

Debt and funding-source modeling hardening milestone.

### New Features

- Hardened the unified strategy engine with revolving minimum-payment behavior.
- Added excluded-debt handling so excluded debts keep minimum payments but are not selected for extra attack targeting.
- Added explicit Velocity funding-source assumptions for APR, utilization, recovery capacity, recovery window, and cash buffer.

### Improvements

- Confirmed custom debt order skips excluded debts and falls through to the next eligible target.
- Added regression coverage for revolving minimums, custom order, excluded debt behavior, and Velocity source assumptions.

### Breaking Changes

- None.

### Migration Notes

- No database migration required.
- No live banking aggregation, legal advice, tax advice, investment advice, lending advice, or credit-repair advice was added.

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
