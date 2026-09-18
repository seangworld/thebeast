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
- [ ] Release after remaining validation. This first batch is not deployed.
- [ ] Validate authenticated counselor conversations and record loading; local mock tests are not live verification.
- [ ] Complete Tutor/homework, planning, schools, certifications and funding workflow review. No claim of a complete Education audit yet.

This is the working checklist for this module pass, not a replacement for the platform-wide roadmap. Health speed work stays separate from Education changes.
