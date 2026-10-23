# Jordan and Riley — bounded department audit, October 23, 2026

Executor: Codex Jordan/Riley worker. Released baseline: `d7e7ca9b`. Work is source review, retained-evidence reconciliation and offline mechanical regression, not a new behavioral evaluation. The integration lead owns canonical dossier edits, combined gates and the single application release. This worker did not push or deploy.

## Preserved role evidence and competency

| Staff | Useful role and supported demonstrated scope | Target | Last behavioral evaluation | Specific remaining gap |
| --- | --- | --- | --- | --- |
| Jordan Ellis, Guidance Counselor | Historical L2: directed ordinary career guidance, explicit capacity constraints and qualification corrections in seven retained actual answers | L4 | 2026-10-21 | No delivered live researched schooling plan. Source identity, current intake/fees, supported citations, privacy-safe public discovery and useful contextual synthesis are not established by mocked execution. |
| Riley Chen, Tutor | Historical reported L2: routine shown-work guidance, correction acknowledgment, equivalent methods, targeted practice and bounded handoff at `c24dd3e1c83903aabf1557edfdde66754e4720ca` | L3 | 2026-08-30 | Reported historical assessment lacks recovered per-turn teaching outputs/model bindings. Current visual transcription, first-error accuracy and adaptation after prompt/context changes remain unverified. |

These are the existing shared-framework mappings, preserved without deriving a level from a score, count or Knight classification. October 23 is a code/evidence-review date only. No new role-wide or current-model competency certification is assigned.

Jordan's actual answers are retained verbatim in `docs/guidance-counselor-upgrade/evaluation/engineering-handoff-20261021/existing-actual-answers.md`. They include excluding sales after correction, honoring two hours now without changing saved weekly availability, recognizing zero capacity, and rejecting an unsupported earned bachelor's assumption. The engineering handoff and original criteria/receipts remain intact. GC-04/GC-05 research failures and NOT TESTED findings remain limitations; no resumed manifest, quota probe or paid call was attempted.

Riley's retained source record is `src/lib/staffDossiers/historical-tutor-assessment.json`, bound to BeastFusion `7437aed`, assessment BF-AGT-016-PROD-EVAL-001, SHA256 `79f69aa4e768154522c13eb54b4839d9ccacbb938045213d5d6178e0ae31128b`. Its reported 7/7 result and strengths remain historical evidence; the existing L2 mapping relies on reported behavior, not the count. The completed October 21 audit and October 22 runtime remediation are credited, not repeated as a fresh teaching assessment. Existing cancellation, finite provider work, refusal/incomplete-response rejection, private checker evidence and truthful completion controls are retained.

## Concrete corrections

### Jordan: latest minute-based capacity correction

`guidancePlanningConstraint` recognized only explicit hours. A later member message, “I only have 30 minutes now,” therefore reused the earlier “two hours now” constraint. This could feed stale planning capacity to the existing private prompt and returned conversational state.

The same narrow first-person parser now accepts minutes as well as hours. It keeps the exact statement, does not convert it to weekly availability, preserves conditional/quoted/assistant exclusions and stays scoped to Guidance Counselor. Competing weekly minute allocations are removed from conversational goal summaries just as weekly hour allocations already were. Saved records, proposals and delivered model prose are not edited by this helper.

### Riley: reject unsupported age and malformed encoded input

JavaScript normalizes impossible dates such as February 31. The existing age helper could turn that invalid profile value into a confident learner age band. The helper now requires a round-trip real calendar date; invalid/future birthdays remain “age not provided.” Valid leap days remain supported. Raw birthdays are still excluded from the model context.

The image gate accepted incomplete base64 lengths and nonzero unused padding bits. It now rejects incomplete/noncanonical encoding before the existing provider path, preserving valid browser data URLs, MIME allowlist and 3 MB limit. This verifies encoding only: the helper does not decode image pixels or certify file format, readability, transcription or visual correctness. No inference or image-content service is added.

## Core workflow and authority review

- Jordan still uses existing authenticated, entitled, owner-scoped education context; separates ordinary guidance from mandatory official-source research; buffers delivery through citation/safety checks; and proposes changes without executing member-record/application writes. Conversational corrections remain separate from persistent updates.
- Riley retains authenticated entitlement/owner context, bounded private teaching history, learner-controlled cancellation, input/output safety, ephemeral worksheet transcription, and text-only history persistence. Client identity is not canonical profile evidence. Provider failures and rejected/incomplete teaching remain failures rather than completed learning.
- Local role regressions cover correction handling, existing mocked research handoff and failure paths, Tutor context recognition, private validation evidence, cancellation and incomplete provider responses. They establish mechanics only. Hosted RLS, actual semantic accuracy and current effective model configuration were not tested here.
- No routing/model, provider, permissions, budgets, approval boundaries or agent activation changes. No changes to historical accounting, unresolved reservations, original prompts or assessments.

## Offline verification

The three new regressions fail against the released source: stale minute correction, impossible calendar birthday, malformed/noncanonical base64. With the fixes, the focused nine-file suite passes **56 tests**. TypeScript test compilation passes. `git diff --check` passes. Dependencies reuse the exact unchanged lockfile installation; no upgrades or installs introducing new versions.

Commands: `npx tsc -p tsconfig.test.json`; `node --test .test-dist/tests/{guidancePlanningConstraint,be301Tutor,guidanceResearchFlow,guidanceResearch,guidanceNativeSchoolPlan,tutorContextAwareness,tutorConversationRegression,tutorProviderReliability,tutorDeliveryReliability}.test.js`; `git diff --check`. Full application/security/build and dossier completion gates belong to the integration lead after all worker changes are combined.

## Deferred requirements

Jordan needs an attributable complete researched schooling answer with source/identity/intake applicability, privacy and correction evidence, plus its actual delivery outcome, before research competence can be raised. Riley needs existing original turn/model/context receipts or legitimate retained teaching feedback and academic work to substantiate current explanations, transcription and first-error decisions. Preserve historical grades while those gaps remain. Future validation cost: **cost unknown**; no paid test request or automatic run is proposed. Existing accounting remains unchanged; this pass incurs zero paid inference/API evaluation calls.
