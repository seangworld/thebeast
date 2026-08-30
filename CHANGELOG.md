# Changelog

## BeastOS v3.0.4 - August 30, 2026

Module-specific guided onboarding.

### New Features

- Extended the BO-UX-001 reusable tour architecture with first-use tours for
  BeastMoney, BeastHealth, BeastEducation, and BeastHome.
- Added route-aware module replay controls and separate versioned support for
  optional targeted What's New walkthroughs.
- Added privacy-bounded categorical onboarding outcome events for offers,
  starts, completions, skips, replays, and What's New use.

### Safety and Release Boundary

- Tours mount only after authenticated dashboard access resolves and follow
  current module/age/entitlement navigation boundaries.
- Tour content covers released Product Truth only. Sentinel, Shield, AI Fitness
  Trainer, and Connected Balances remain unavailable Coming Soon previews.
- No database migration, provider, financial connection, payment, RLS,
  authorization, agent-authority, or member-data change is included.

## BeastOS v3.0.0 - July 28, 2026

Health Advisor release candidate.

### New Features

- Activated the owner-only Health Advisor with an Executive Health Briefing,
  Medication Review, Appointment Preparation, Questions for Providers, Health
  Recommendations, Document Understanding, Timeline Summaries, and
  preparation-outcome learning.
- Connected owner-authorized Health Profile, conditions, medications, vitals,
  appointments, timeline records, and permissioned BeastDocuments health
  summaries.
- Connected explicit recommendation decisions to Execution History,
  recommendation lifecycle, confidence, approvals, results, outcomes, and
  immutable audit records.
- Added Appointments as a bounded BeastHealth record type.

### Medical Safety and Release Boundary

- Recommendations are deterministic record-review and appointment-preparation
  suggestions. They do not diagnose, prescribe, recommend treatment, interpret
  clinical significance, or execute clinical actions.
- Medication Review never checks interactions or tells an owner to start, stop,
  or change medication.
- Document Understanding shows only existing summaries with explicit
  document-intelligence permission and never infers blocked or unavailable
  contents.
- Confidence measures record support for an organizational suggestion, not
  medical certainty. Outcomes measure reported preparation usefulness, not
  health or treatment outcomes.
- Migration `20260728020000_activate_health_advisor.sql` expands the record
  constraint for appointments and remains unapplied.
- No push or deployment is included in this candidate.

## BeastOS v3.0.0-beta1 - July 28, 2026

BeastHealth owner beta release candidate.

### New Features

- Added Health Overview, Health Profile, Conditions, Medications, Procedures,
  Vitals, Documents, Lifestyle, Family History, Provider Directory, and Health
  Timeline workspaces.
- Added durable owner-entered health records with dates, sources, flexible
  context, private notes, archive and restore controls, and explicit empty,
  loading, unavailable, and save-error states.
- Added an additive owner-only Supabase record foundation with RLS, bounded
  values, indexes, and updated-at history.

### Safety and Release Boundary

- Health Advisor remains planned and inactive. BeastHealth contains no Health
  Advisor conversation, recommendation, execution, confidence, or outcome
  controls.
- Future integration points are documented for Execution History,
  recommendation lifecycle, confidence, and outcome learning without activating
  them.
- BeastHealth provides organization only. It does not diagnose, treat, interpret
  measurements, recommend medication changes, or replace qualified care.
- No placeholder health records or activity are generated.
- Migration `20260728010000_add_beast_health_foundation.sql` is included for
  review but was not applied.
- No push or deployment is included in this candidate.

## BeastOS v2.3.1 - July 28, 2026

Guidance Counselor online release candidate.

### New Features

- Added a structured Learning Briefing, goal planning, learning priorities,
  career guidance, notifications, recommendation review, Tutor handoff, and
  outcome learning.
- Connected explicit recommendation decisions to persistent Execution History,
  recommendation lifecycle events, confidence history, approvals, results,
  outcomes, and immutable audit records.
- Added an honest diagnostics view that uses saved completed-learning evidence
  when available and clearly reports when no placement diagnostic exists.

### Boundaries and Reliability

- Guidance Counselor owns goals, learning-path planning, prioritization, and
  handoff context. The existing Tutor remains responsible for teaching the
  specific concept and returning learning evidence.
- Viewing the workspace creates no execution activity. Durable records are
  created only after an explicit lifecycle decision or outcome report.
- Recommendations are deterministic, retain evidence and limitations, and do
  not claim mastery, placement, career fit, or credential requirements without
  supporting records.
- No database migration, push, deployment, or production release is included
  in this candidate.

## BeastOS v2.3.0 - July 28, 2026

Money Coach online release candidate.

### New Features

- Added a structured Money Coach executive briefing, financial summary,
  recommendation cards, changes since the prior visit, notifications,
  suggested questions, and outcome learning.
- Connected explicit recommendation decisions to persistent Execution History,
  recommendation lifecycle events, confidence history, approvals, results,
  outcomes, and immutable audit records.
- Added member-reported outcome capture so later guidance can display what
  helped, produced no clear change, or did not help without inventing results.

### Safety and Reliability

- Reused current owner-scoped BeastMoney records and existing calculation,
  forecasting, funding, debt, and cash-buffer rules.
- Kept Money Coach guidance deterministic and removed unrestricted text entry
  from the Money Coach workspace.
- Viewing the workspace creates no execution activity. Durable records are
  created only after an explicit lifecycle decision or outcome report.
- Recommendation actions do not move money, change financial records, or claim
  that an external action was independently verified.

### Release Boundary

- No database migration is included. This release uses the existing
  execution-history schema and RLS policies.
- No push, deployment, or production release is included in this candidate.

## BeastOS v2.3.0-alpha2 - July 28, 2026

Digital Staff identity release candidate (BP-232).

### Improvements

- Completed professional identity profiles for the Fusion Director, Money
  Coach, Guidance Counselor, and planned Health Advisor.
- Added explicit titles, biographies, missions, responsibilities, experience
  domains, reporting relationships, collaboration context, status, and profile
  versions.
- Improved the Organization Chart, profile cards, About Me pages, relationship
  links, and accessible text-backed status indicators.
- Added `portrait_url` and `avatar_url` metadata with explicit placeholder,
  uploaded, and generated source support.

### Release Boundary

- Portrait URL fields remain null and this candidate includes no generated or
  uploaded images.
- The Health Advisor remains planned and cannot access health records.
- No database migration, push, deployment, or production release is included.

## BeastOS v2.3.0-alpha1 - July 28, 2026

SEANGWORLD Intelligence provider release candidate (BP-240).

### New Features

- Connected the owner-only intelligence dashboard to Google Analytics 4 and
  Google Search Console through server-only provider adapters.
- Added verified visitor, user, session, view, engagement, geography,
  technology, acquisition, page, query, impression, click, CTR, and average
  position reporting.
- Added deterministic falling-CTR recommendations alongside high-exit,
  low-CTR, rising-impression, mobile-engagement, and traffic-spike rules.

### Reliability and Security

- Added environment validation, bounded concurrency, retry behavior,
  short-lived server caching, safe provider errors, and graceful degradation.
- Kept service-account credentials, provider tokens, and identifiers out of
  browser responses.
- No provider is required for the application to load, and no fake analytics
  are generated.

### Release Boundary

- Google AdSense, database migrations, push, deployment, and production release
  are excluded.

## BeastOS v2.2.0 - July 28, 2026

Digital Staff and controlled execution foundation release candidate.

### New Features

- Added transparent Digital Professional profiles and organization structure.
- Added persistent execution-history architecture and owner audit surfaces.
- Added the owner-only SEANGWORLD Intelligence dashboard foundation with
  deterministic recommendations and honest provider states.
- Added automatic sitemap generation and permanent legacy URL redirects.

### Improvements

- Standardized the BeastAdmin Platform Health and Prompt Library workspaces at
  `/dashboard/admin/platform-health` and
  `/dashboard/admin/prompt-library`.
- Preserved existing BeastAdmin bookmarks with permanent redirects from
  `/dashboard/admin/health` and `/dashboard/admin/prompts`.

### Release Boundary

- Live analytics provider connections and autonomous execution are excluded.
- Migration `20260728000000_add_execution_history.sql` was reviewed but not
  applied to any environment.
- No push or deployment is included in this candidate.

## BeastOS v2.1.1 - July 20, 2026

Critical usability hotfix for site-wide horizontal overflow and off-screen content.

### Fixes

- Replaced global horizontal-overflow clipping with shared shrink, reflow, and long-content wrapping rules.
- Corrected dashboard-shell, navigation-label, BeastAdmin member-list, and BeastEducation lesson-control responsiveness.
- Kept genuinely wide BeastMoney datasets inside labeled, keyboard-focusable component scroll regions.
- Added responsive regressions and a 293-case authenticated Playwright route and viewport matrix.

### Release Boundary

- No calculations, educational progression, persistence, RLS, roles, navigation hierarchy, or unrelated product behavior changed.
- No database migration required.
- Authenticated Playwright execution remains pending because no valid `PLAYWRIGHT_AUTH_STATE` was available; no state was fabricated or bypassed.
- BeastOS v2.2 remains the next planned feature release and is not included in this hotfix.

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
