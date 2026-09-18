# Module update checklist

## Waiting on Sean — owner action

- [ ] **BeastHealth / Taylor live speed validation:** when ready, sign into the authenticated Beast test browser through the secure sign-in flow. The previous session expired and the last sign-in failed. Sean deferred further attempts; do not retry until he resumes this item. Never request a password in chat.
  - After sign-in, Codex can run the same personal-statement drafting and VA document/research cases, compare against the roughly 64-second draft / 110-second research baseline, and check factual grounding and safety.
  - Speed changes remain in draft [PR152](https://github.com/seangworld/thebeast/pull/152), with 34 targeted tests passed. They are **not deployed** and no speed improvement has been measured.

## Education — current module

- [x] Inspect counselor context selection and authoritative instructions.
- [x] Implement discovery-answer and record-phase/provenance context; exclude archived, proposed and rejected profile records.
- [x] Strengthen counselor instructions for personal, realistic plans, truthful drafts and verified current requirements.
- [x] Verify automated regressions and production build: 98 selected tests passed, TypeScript test compilation passed, and production build completed (199 static pages). Existing webpack cache-restore warnings did not prevent completion.
- [x] Release readiness: local production build and Vercel Preview build passed. Follow [PR153](https://github.com/seangworld/thebeast/pull/153) for merge/deployment status. Authenticated follow-ups below are not completed by a successful build.
- [ ] Validate authenticated counselor conversations and record loading; local mock tests are not live verification.
- [x] Complete a code-level pass across Tutor/homework, planning, schools, certifications, funding and navigation. This is not a claim of complete live/end-to-end verification.
  - Replace substring status guessing: negative/pending funding is not an award, unknown certification standing is not Active, and unknown/negative school status is not inferred as current enrollment.
  - Keep Recommended, Not awarded and Needs review records visible; exclude rejected/archived paths from recommendations.
  - Preserve an explicit zero-hour weekly study budget.
  - Remove the fabricated default Security Analyst career from learner context; include learning style/pace and explicit unknown mastery in the Tutor context prompt.
  - Correct the Tutor presentation's conflicting Guidance Counselor identity and outdated counselor manifest teaching availability. Dormant course delivery stays disabled.
- [ ] Live-check the changed status groups and Tutor follow-up/image behavior when an authenticated test session is available. No new sign-in request while Sean's deferral remains in effect.

### Second-batch verification

- TypeScript test compilation and 89 targeted Education/Tutor/navigation tests passed.
- Broader infrastructure suite: 157/159 passed. The debt strategy registry and Health navigation expectations also fail on unchanged main `5060471`, reproduced in a separate baseline worktree. These are existing test-maintenance issues, not new Education regressions; the full suite is not green.
- Production build passed on the final code, including 199 static pages; non-blocking webpack cache warnings persist.
- No database migration, provider/model change, paid integration, automatic application submission, or external school action was introduced.
- Remaining: authenticated visual/interaction and model-quality checks, plus release. Existing homework image handling has automated coverage but was not tested against a live uploaded image in this pass. No claim that all external school/sponsor links or current eligibility requirements have been verified.

### Release checks

- Corrected the two stale infrastructure expectations to include already-shipped Custom debt ordering, Veterans Claims and Vaccinations. No Money/Health runtime code changed.
- TypeScript test compilation and all 175 tests in the infrastructure, Education refresh, lifecycle and counselor-context suites passed after that correction.
- Application source is unchanged from the successful final local build and Vercel Preview deployment `dpl_HwymtrZb4Y4z64VWvFzF1ewaUy1d`; the final follow-up changes only tests and this checklist.
- Proceed through the usual automated release workflow; authenticated interaction/model-quality testing remains an explicit follow-up, not a claim of completed live validation. No retry of Sean's deferred sign-in.

This is the working checklist for this module pass, not a replacement for the platform-wide roadmap. Health speed work stays separate from Education changes.
