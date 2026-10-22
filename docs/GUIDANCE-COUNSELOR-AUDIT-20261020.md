# Jordan Ellis — Guidance Counselor audit

Date: October 20, 2026 (America/New_York). Scope: read-only implementation and evidence audit, local no-cost verification. Executor: Codex in the current ChatGPT workspace. No application changes, live inference, member-data access, deployment, or paid calls.

Source inspected: local commit 848031c2 (Taylor release candidate tree); remote main confirmed c50f21cca3a7d4e123cbaaff9154b558eb5e66fb, the Taylor squash release. No competing Guidance Counselor issue was identified in the repository issue search. This report is a local audit artifact, not a published PR or independent certification.

## Verdict

Needs focused research-path corrections and role-specific behavioral verification before claiming comprehensive current competence. The existing implementation has substantial functionality and safeguards; it is not a blank-slate agent. No numerical live competency grade is assigned by this audit.

## Verified findings

1. **High — research privacy guard is incomplete.** `src/lib/digitalStaffRuntime/tools.ts`, `deidentifyResearchQuery`, strips selected identifier formats, email, and a limited introduction pattern. A local synthetic probe containing `Alex Example`, `202-555-0147`, and `123 Example Lane` survived unchanged. `runtime.ts` applies this helper before provider research. Prompt instructions request private-data minimization, but this is not an enforced reliable boundary. This demonstrates a sanitizer gap, not an observed production disclosure. Correct with minimum-necessary research construction and adversarial synthetic tests, not just a promise that all names can be removed with regex.

2. **Medium — source allowlist contains non-domains.** `config.ts` includes literal `accreditor and official school domains` and `official certification bodies`. Validation accepts entries by membership, and `runtime.ts` forwards them directly to `web_search.filters.allowed_domains`. They do not identify actual official sources. Provider rejection or effective coverage was not exercised. Resolve genuine relevant hosts through a validated source policy; do not silently permit arbitrary model-selected domains.

3. **Medium — researched answers lack private contextual synthesis.** `executeResearch` receives only the research query and professional instructions. The subsequent synthesis branch includes Health and Money only. GC selects `research.answer` over its initial context-aware plan. Saved learner constraints and corrections not represented in the query therefore are not available to the answer-generating research step. This is a confirmed architecture gap; the frequency of poor real answers is unmeasured. Retrieve public evidence with minimal private data, then apply it to the learner in a private synthesis step.

4. **Capability boundary — document and plan access is narrower than the catalog suggests.** GC context queries retrieve one education profile, up to 19 career items, and up to 20 learning goals. This loader does not separately retrieve roadmap/milestone records. Selected original-document access is explicitly Health-only. `inspect_education_plan` and `inspect_career_plan` appear in the allowed-tool catalog, but a catalog entry alone is not evidence of a working read adapter. Verify actual requested workflows before claiming transcript review or comprehensive roadmap access. Do not treat every absent capability as a mandatory feature.

## Role-specific evidence scorecard

These are audit dispositions, not measured model success rates. A passing structural test cannot establish counseling judgment.

| Job requirement | Current evidence | Audit disposition |
|---|---|---|
| Understand learner background, goals, schedule and constraints | Owner-scoped profile/career/goal context and explicit guidance instructions | Implemented; current behavioral assessment pending |
| Distinguish aspirations, member reports and earned credentials | Phase/source/verification fields retained; goal records explicitly labeled aspirations | Implemented; adversarial behavior pending |
| Compare realistic education and career pathways | Planning instructions and deterministic roadmap tests | Local checks pass; real judgment pending |
| Verify changing school, credential and funding requirements | Research support exists; two invalid source-policy entries | Needs correction |
| Apply researched requirements to this learner | GC omitted from private contextual synthesis | Needs correction |
| Preserve corrections and conversation continuity | Current-agent memory and bounded recent conversation supplied | Implemented; long/multi-turn behavior pending |
| Protect learner information during research | Sanitizer fails synthetic name/phone/address probe | Needs correction |
| Respect record approvals, entitlement and owner boundaries | Authenticated conversation/owner checks, entitlement gate, canonical proposal path | Code evidence present; hosted end-to-end verification not performed |
| Refer teaching to Tutor accurately | Prompt explains receiver access checks and navigation-only context limits | Local checks pass; live handoff not retested |
| Respond usefully to missing evidence and service failures | Context errors retained, output safety and categorized service failures | Implemented; real failure experience pending |

## Verification

- `npx tsc -p tsconfig.test.json`: passed (exit 0).
- Freshly compiled targeted suite: **85 passed, 0 failed, 0 skipped**.
- Command: `node --test .test-dist/tests/guidance*.test.js .test-dist/tests/educationAdvisorContext.test.js .test-dist/tests/educationCareerIntelligence.test.js .test-dist/tests/educationalCareerRoadmap.test.js`.
- Local synthetic sanitizer probe reproduced incomplete privacy stripping; no external request was sent.
- Local configuration probe identified exactly two non-hostname research entries.
- Existing tests include deterministic behavior, source-text assertions and prompt assertions. Their count is not an intelligence score.
- No full application build or full-suite rerun: application code was not changed.

## Historical evidence

`src/lib/member-agent-capability-projection.json` records assessment BF-AGT-016-ASMT-GC-001, dated August 30, 2026, version 1.4.0. It reports six GC turns meeting acceptance criteria and labels the autonomy assessment self-assessed. Evidence reference BF-AGT-016-PROD-EVAL-001, SHA-256 2bad79aa41e7e31d7a5cd66ca52555545e770f587fda365d82f8871a2a94c883. This audit read the projection, not the original six-turn packet; it does not independently revalidate that grade or erase it.

## Recommended next work

1. Fix the three demonstrated research-path weaknesses with synthetic regression coverage, preserving other specialists.
2. Clarify real tool/data access and test only the workflows GC is intended to support.
3. Freeze a bounded GC-specific evaluation: an undecided learner; employed adult with limited hours/budget; changed goal and corrected credential; conflicting official requirements; funding opportunity versus award; evidence-grounded application draft; declined pathway; Tutor handoff; unavailable research; private-data/injection attempts.
4. Preserve prompts, raw answers, delivered answers, execution evidence, latency and costs. Grade each role requirement explicitly. Paid model execution requires a separately bounded authorization; unused Taylor budget is not GC authorization.

Next decision is focused remediation and evaluation preparation, not production release. Tutor and VA Claims Aide remain later in the agreed sequence. Atlas remains deferred; News scouts remain paused.
