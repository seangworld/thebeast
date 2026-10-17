# Avery Stone Director: bounded supervision upgrade

Tracking: https://github.com/seangworld/thebeast/issues/264

Base: `13005e948e78483bf917aab9c110bd478b846247` (current main at start).
Branch: `codex/avery-director-capability`. Codex is sole engineering executor.
Authorization: development, local synthetic testing, branch and PR only. No merge,
production deployment, hosted database change, customer data access or paid AI evaluations.

## Owner review verdict

**Partial pass for the overall Director mission.** A bounded saved-record review
objective can now progress through actual specialist execution and independently
verified checkpoints. This is not evidence of general AI Director competence,
autonomous research, arbitrary specialist task completion, or commercial readiness.
The PR must not be described as completing the entire requested Director upgrade.

## Continuation evidence: 2026-10-16 (current)

**Overall: partial-pass. No real-model competency pass. Free-only evaluation; zero paid calls.**
The sections below this continuation preserve the earlier implementation record;
older counts and environment limitations there are historical, superseded here.

### Implemented improvements

- `directorReasoning.ts` adds structured objective interpretation, practical alternatives,
  capability selection, conflict/missing-fact/owner-decision reporting and checkpoint
  assessments. This is a model contract and defensive validator, not demonstrated intelligence.
- `directorReasoningProvider.ts` reuses the shared provider, strong-model selection
  and request lease. Off by default; requires explicit feature enablement plus a key.
  One bounded pass, no tools/search/retries, 24,000-character input and 2,400 output-token
  ceiling, 60-second timeout, `store:false`. It was tested with injected transport only.
  These per-call limits are not a durable organization spending cap. Do not enable
  the paid path under the current free-only instruction.
- The existing assignments API and UI persist proposed plans in existing Director
  conversation history, revalidate permissions/current evidence before explicit member
  approval, and run at most two approved checkpoints per foreground request.
  Proposed, authorized, attempted and independently verified results remain separate.
- `20261017025810_director_data_api_grants.sql` makes current Supabase Data API
  privileges explicit after asserting RLS, permits only birthday profile updates,
  includes Health in the existing module-denial constraint, and applies restrictive
  age/module checks to direct saved-record reads. Version-bound plan approval locks
  the owned canonical goal; stale approval returns an explicit conflict.
- Director routes now await Next cookies and share the existing request lease.
  Local HTTP Supabase is permitted only on loopback in development/test; production
  continues requiring HTTPS. Local CSP exceptions are development-only.
- Compatible Browserslist/parser patches reduce the full audit from 8 high/1 moderate
  to **7 high/0 moderate**. Production dependency audit reports **zero**. Remaining
  alerts share unpatched `braces <=3.0.3` (GHSA-vfj7-8cjw-p6xm); the unchanged full
  audit gate still rejects `npm run build`. No security gate bypass is committed.

### Current evidence and scorecard

| Requirement | Evidence type | Current assessment |
| --- | --- | --- |
| Unfamiliar complex objectives and practical plans | Generic prompt/schema and mocked transport; eight held-out cases blocked | **Unverified** |
| Intelligent specialist selection | Closed two-capability validation; no real inference | **Unverified** |
| Actual specialist execution | Existing Health preparation and Money cash functions, real authenticated local API/UI | **Pass within these narrow reviews** |
| Incorrect-result recognition/correction | Independent deterministic recomputation, correction/recovery tests | **Pass mechanically; AI judgment unverified** |
| Interrupted/repeated work | Persistent checkpoints, CAS leases, bounded retry and deduplication tests | **Pass within supported runner** |
| Conflicting information | Structured stop conditions tested; no real reasoning | **Unverified** |
| Owner approval/unsupported tools | Closed registry, explicit approval, validation, local RLS tests | **Pass for enforced boundary; AI decisions unverified** |
| Independent verification | Fresh canonical evidence recomputed; goal stays Active | **Pass within supported reviews** |
| Session continuity | Real GoTrue login, persisted objective/checkpoints, browser reload | **Pass locally; hosted unverified** |
| Customer isolation/security | Real local PostgreSQL 17/GoTrue/RLS; foreign/minor/disabled access denied | **Pass for tested local paths only** |
| Commercial/general Director readiness | Missing real-model, hosted and release-gate evidence | **Partial-pass; not release-ready** |

The reasoning input deliberately contains checkpoint identity/status, timestamps and
limitations rather than raw clinical/financial values. This limits privacy exposure,
but does **not** let Avery independently inspect detailed specialist calculations or
investigate conflicting records. Do not claim semantic supervision from this contract.
No background worker, general research tool, arbitrary specialist adapter, automatic
correction dialogue or open-ended task completion has been demonstrated.

### Eight-case competency evaluation

`scripts/evaluate-director-no-cost.mjs` probes an existing local model only; it does
not provision/download a model or fall back to paid inference. No local model was
configured. **All eight cases are BLOCKED, not passed**:

1. Complex care/cash/moving objective requiring useful specialist selection.
2. Incorrect specialist result requiring rejection/correction.
3. Interrupted objective requiring recovery without duplicate work.
4. Conflicting income claims requiring investigation.
5. Purchase/publication requiring owner approval.
6. Unavailable Tutor or unsupported cloud tool.
7. Completed preparation review that does not prove an appointment occurred.
8. Repeated request with an already completed cash checkpoint.

Cases live in `tests/fixtures/director-competency.json`, outside the production prompt.
The separate synthetic-model-adapter approval test verifies plumbing only. Passing
mocked/provider/unit tests does not change any of these eight competency grades.

### Verification and reproduction

- Full suite: **2,396 tests; 2,378 pass; 18 fail**. No new failing names relative to
  the previously recorded baseline. Repaired relevant stale security pin, runtime-origin
  and async-client assertions; migration inventory now records 125 migrations.
- Director-focused regressions: **41/41 pass** (deterministic and mocked checks).
- Diagnostic `next build` compilation, type validation and static generation pass
  using synthetic loopback HTTPS configuration. This does not replace the required
  audit-gated build or establish hosted readiness.
- Lint and application TypeScript checks pass. Required build remains blocked by the
  seven-high full dependency audit, despite zero production-only advisories.
- `scripts/test-director-local-auth.mjs`: complete **125-migration PostgreSQL 17**
  local replay, real GoTrue account/password/getUser, actual owner-scoped goals/RPCs,
  cross-user denial, minor/module denial, direct retained-data revocation, prohibited
  profile role escalation and owner reassignment. Synthetic local accounts only.
- `scripts/test-director-browser.mjs`: actual authenticated Chromium at 1440x900,
  390x844 and 375x812; real specialist execution, reload persistence, repeated work
  stays at one attempt, foreign goal denied, disabled AI endpoint returns 503,
  no page errors/horizontal overflow. Mobile widths are not native device evidence.
- `scripts/test-director-plan-approval.mjs`: seeded **synthetic model output** with real
  auth/database/UI/transaction/tool execution; never a model-competence result.
- Hosted DEV metadata was inspected without reading customer rows. New Director
  migration is absent there. No hosted functional auth/tenant claim is established;
  no hosted migration/account/data was changed. WebKit and physical devices untested.

Run the three local integration scripts only against a task-created disposable
Supabase stack (`API_URL` must equal `http://127.0.0.1:54321`). They require private
local status/fixture/session files in `/private/tmp`; never commit those files or
real credentials. The local auth script prepares synthetic fixtures, then run the
approval and responsive browser scripts against the local development app. The
standard `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, and
`npm audit --omit=dev` reproduce their respective distinct checks.

The task-created local development server and Supabase stack were stopped after
verification; their synthetic data volumes and private temporary credentials/session
files were removed. The base checkout version-manifest modification was preserved.

### Exact blockers and recommended next sequence

1. **No free local model configured.** Actual planning, selection, judgment,
   investigation and correction competency remain untested. Do not substitute
   fixtures or seek another paid cap under the current free-only instruction.
2. **Upstream dependency blocker.** Seven high development-tree alerts prevent the
   required build. Await a compatible patched dependency or separately review a
   supported toolchain migration; do not use `audit fix --force` or waive the gate.
3. **Hosted candidate absent.** Review migrations and test a specifically authorized
   isolated hosted environment with synthetic members before any release decision.
4. **18 unrelated baseline failures** in admin/navigation/Money UI/public SEO remain.
   Their exact names are listed below; do not expand into other agent upgrades.
5. **Device/platform coverage.** Chromium phone widths pass; WebKit/native iOS/Android
   and physical-device sessions remain unverified.

Estimated follow-up: 1–3 days for no-cost model integration/evaluation if an existing
suitable model becomes available; 2–5 days for evidence-based reasoning/correction
improvements after evaluation; 1–2 days for authorized hosted isolation/browser checks;
1–3 days for baseline test triage. Upstream patched dependency availability has no
reliable estimate; a toolchain migration requires separate impact assessment.
These estimates are recommendations, not new assignments or release authorization.

### Remaining baseline failing names

- BA-IA-101 defines one grouped persistent BeastAdmin workspace switcher
- BA-112 presents every requested owner inspection area without mutation controls
- BA-126 keeps deferred work separate from the operational Revenue Center
- BA-107 presents central management, release history, and future rollback
- Money Settings retains saved cash and debt controls in standard Money surfaces
- BP-230 exposes only the approved workspace hierarchy
- BA-107 validates a new email and keeps callback destinations internal
- BA-106 recovery paths preserve only safe BeastOS destinations
- BM-42D debt actions retain the selected-debt canonical edit workflow
- debt management keeps open zero-balance revolving accounts active and exposes explicit restore
- owner-only roster and profiles preserve the established BeastAdmin surface
- sitemap includes public routes and excludes private application routes
- module navigation centralizes expandable child items
- BeastAdmin foundation registers modules and protects owner-only navigation
- BM-37 renders Dashboard Immediate Attention and durably tracks rate changes
- BP-230 keeps the record-backed Daily Briefing in Dashboard
- BP-230 navigation follows the approved workspace hierarchy
- public SEO inventory contains only real indexable application routes

## Earlier implementation record (historical)

## Initial gaps and reused architecture

The existing Director conversation endpoint invoked the shared Digital Staff
runtime and persisted conversation text. `directorContext.ts` read owner-scoped
goals, records and specialist summaries. `digitalStaffRuntime/tools.ts` validated
advertised tool calls without executing a general delegation loop. A handoff was
not an executed assignment. There was no persistent specialist assignment,
dependency, execution lease, correction cycle, independently verified result or
resumable objective lifecycle.

This change preserves that conversation workflow and uses BeastGoals as the sole
canonical objective store. It attaches assignments to existing goal IDs; it does
not create a second Director, private specialist goals, new provider or service.
Existing Money Coach `buildMoneyCoachStructuredRecords` and Health Advisor
`buildHealthAdvisorModel` perform the actual supported work. Those specialists'
reasoning, prompts and underlying capabilities are not upgraded here.

## Behavior and architecture

- `src/lib/directorAssignments.ts`: closed capability registry, actual specialist
  calculation adapters, JSON-canonical source binding, independent recomputation,
  states, dependencies, three-attempt retry cycles and compare-and-swap leases.
- `src/lib/directorAssignmentStore.ts`: existing Supabase client persistence,
  fresh owner-scoped canonical records, module checks, completeness limits,
  current objective reload, evidence revalidation and private snapshot redaction.
- `src/app/api/director/assignments/route.ts`: authenticated plan, resume,
  correction and history endpoints. Owner identity comes exclusively from the
  authenticated session. No provider calls or external side effects.
- `src/app/dashboard/director/DirectorObjectives.tsx`: existing Director panel
  exposes saved goal selection, explicit review authorization, checkpoint progress,
  evidence, history, resume and explicit correction-cycle authorization.
- `supabase/migrations/20261017022337_avery_director_assignments.sql`: assignments
  reference canonical goals. Transactional planning serializes competing plans,
  deduplicates by owner/goal/capability and preserves existing checkpoints.
  Owner and module/age RLS protects direct REST access too. Functions are security
  invoker, have a fixed search path and deny anonymous execution.
- Director context retrieves permitted saved checkpoint metadata across sessions.
  It labels saved status as history, not current completion evidence. Expired
  Director memories are excluded. The existing Director prompt now distinguishes
  proposed plans, supported execution and verified evidence, and requires missing
  facts, alternatives, constraints and contradictions to be surfaced.

The supported acceptance criteria are deliberately specific: recompute the
canonical saved cash-position review, or recompute the Health Advisor's saved
record preparation model. A successful review does not prove an appointment
occurred, a debt was paid, a medical conclusion is correct, or a life goal was
achieved. The application never automatically completes that canonical goal.

Every resume performs at most one runnable checkpoint. Verified dependencies are
rechecked before being trusted. Source/goal changes, day changes, unsupported or
truncated data, missing financial amounts, lost permissions and forged output
invalidate completion. A crashed lease can be reclaimed after 60 seconds; CAS
prevents a stale worker from committing over a newer checkpoint. Three failed
attempts stop automatic retry; another cycle requires explicit member action.
Current verified work cannot be reset merely to run it again. History is retained.

There is no scheduled/background worker. Continuing requires an explicit resume
request. The only available actions are bounded read-only reviews and their own
assignment bookkeeping. Spending, publication, production, destructive actions
and canonical specialist-record mutations are unavailable, even with a forged
`approved: true` request property. Existing proposal approvals are not bypassed.

## Competency scorecard

| Required scenario | Classification | Evidence and limit |
| --- | --- | --- |
| Understand a complex objective and select specialists | Partial | Explicit owner selection attaches Health and Money reviews to a saved cross-domain objective. Automatic language-based selection is unverified. |
| Produce a reasonable execution plan | Partial | Bounded sequential plan has two acceptance checkpoints and a dependency; broad model-generated plans, alternatives and research are unverified. |
| Delegate actual work | Pass within supported scope | Real existing Health preparation and Money canonical calculation functions execute through the actual API and database adapter; no handoff text substitutes for execution. |
| Track multi-step work across sessions | Pass within supported scope | Real PostgreSQL history survives new store/request instances; UI remount restores saved results without POSTing work again. |
| Resume without repeating completed work | Pass within supported scope | Completed evidence is recomputed, completed tools are not rerun; concurrent claims are CAS-protected and plans deduplicate. |
| Detect incorrect/incomplete results | Pass for executable criteria | Forged output, changed sources, stale evidence, missing amounts and incomplete snapshots are rejected. Free-form advice correctness is unverified. |
| Request correction and reassess | Pass within supported scope | Correction state clears invalid proof; bounded retry recomputes; explicit new cycle preserves history and cannot repeat current verified work. |
| Respect approval requirements | Pass for new runner | Explicit plan/correction actions; no write, purchase, publish or production capability exists. Existing unrelated approval workflows are not newly certified. |
| Avoid unauthorized actions | Pass for tested boundaries | Actual route/DB denies cross-owner, anonymous, minor and disabled-module requests; forged action/approval fields cannot expand capability registry. |
| Report verified completion accurately | Pass for review completion | Two dependent results survive JSONB, verify on read, and leave the canonical goal Active. General goal completion remains unsupported. |

No real-model evaluation ran. Prompt instructions are implementation, not proof
of reasoning quality, source citation accuracy or mistake recognition. No paid
evaluation cap has been authorized. Those requirements remain unverified rather
than receiving passing grades.

## Verification evidence

1. `npx tsc --noEmit`: passed.
2. `npm run lint`: passed, no warnings/errors from ESLint.
3. `npx tsc -p tsconfig.test.json` followed by the five Director test files:
   **30/30 passed** (`directorAssignments`, `directorObjectivesInteraction`,
   `digitalStaffDirector`, `beastOSDirectorContext`, `beastOSDirectorInteraction`).
   Twenty new executable lifecycle/UI scenarios are included. UI HTTP responses
   and the lifecycle test store are synthetic adapters, explicitly not production.
4. `scripts/test-director-database.mjs`: passed against fresh PostgreSQL 16 and
   PostgREST 12.2.12. Actual Supabase JS queries, migration/RLS, actual Next
   handlers, existing age/module entitlement code, specialist calculations,
   multi-step completion, durable reload, corrections, leases, tenant denial and
   retained-evidence redaction executed. Only session authentication was adapted
   to synthetic fixture identities; no hosted authentication was exercised.
5. Full suite: **2,385 tests; 2,365 passed, 20 failed**. An untouched archive of
   base main with identical installed dependencies reproduced **2,365 tests;
   2,341 passed, 24 failed**. All remaining failure names existed on base main;
   no new failure names. Four migration-inventory failures were repaired while
   registering the new migration. Unrelated baseline failures are not waived.
6. `npm ci --ignore-scripts --dry-run`: passed after reconciling the lockfile to
   the existing package declarations. Main's original lockfile pinned older
   Next/eslint-config-next and transitive overrides and could not satisfy npm ci.
   No new package or provider was added.
7. `npm run build`: **blocked at existing npm audit gate**, nine advisories
   (eight high, one moderate), primarily lint/Tailwind tooling dependencies.
   No automatic force upgrade or security-gate bypass was committed.
8. Diagnostic `npx next build` with localhost-only synthetic HTTPS Supabase
   configuration: passed compilation, type/lint validation and static generation.
   This diagnostic does not make the required audit-gated build pass or establish
   hosted functionality. Browser/device responsive validation remains unverified.

The real database test caught a defect absent from the in-memory suite: JSONB
omitted optional undefined result fields, causing correct Health output to fail
later verification. Canonicalization now follows JSON object omission rules;
explicit JSON round-trip checks and the real route-to-database test cover it.
Concurrency testing also led to transactional plan creation, preventing orphaned
dependency IDs when simultaneous requests deduplicate newly inserted assignments.

Remaining full-suite failures concern preexisting auth-origin/source assertions,
navigation/admin surfaces, Money/debt UI assertions, public SEO inventory and stale
security version expectations. They were reproduced without this implementation;
their names and counts are included in the tracker/PR validation record. They are
not evidence that all existing BeastOS workflows have been runtime-verified.

## Reproduce the disposable database test

These commands create only local synthetic containers. Start with unused names;
do not point the fixture SQL or script at a hosted database. The production
migration chain and production PostgreSQL 17 were not exercised by this fixture.

```sh
npx tsc -p tsconfig.test.json
docker network create avery-director-test
docker run --name avery-director-final-db --network avery-director-test \
  -e POSTGRES_PASSWORD=synthetic-local-only -d postgres:16-alpine
docker exec avery-director-final-db pg_isready -U postgres
docker exec -i avery-director-final-db psql -U postgres -v ON_ERROR_STOP=1 < tests/fixtures/director-database.sql
docker exec -i avery-director-final-db psql -U postgres -v ON_ERROR_STOP=1 < supabase/migrations/20261017022337_avery_director_assignments.sql
docker exec -i avery-director-final-db psql -U postgres -v ON_ERROR_STOP=1 < tests/fixtures/director-stored-evidence.sql
docker run --name avery-director-final-rest --network avery-director-test \
  -e PGRST_DB_URI=postgres://authenticator:synthetic-local-only@avery-director-final-db:5432/postgres \
  -e PGRST_DB_SCHEMAS=public -e PGRST_DB_ANON_ROLE=anon \
  -e PGRST_JWT_SECRET=avery-synthetic-only-secret-at-least-32-characters \
  -p 127.0.0.1::3000 -d postgrest/postgrest:v12.2.12
docker port avery-director-final-rest
# Use the localhost port printed above:
DIRECTOR_TEST_REST_URL=http://127.0.0.1:PORT node scripts/test-director-database.mjs
docker rm -f avery-director-final-rest avery-director-final-db
docker network rm avery-director-test
```

The integration scenario mutates its own fixture. Recreate its disposable
containers to rerun from a clean starting state. Credentials above are deliberately
public synthetic test values, never usable production credentials.

## Remaining limitations and next sequence

1. **Release blockers:** resolve the repository dependency audit gate and review
   unrelated baseline test failures. Validate the full migration chain on an
   isolated PostgreSQL 17/Supabase development instance, including real session
   authentication and responsive browser/device flows, before considering release.
   No hosted migration is applied by this PR. Without it, the new panel reports
   unavailable persistence; existing conversation context treats it as unavailable.
2. **Intelligence gate:** owner-authorized capped real-model scenarios must test
   complex objective decomposition, alternatives, contradictions, realistic
   research and citation quality, injected records and mistake correction.
   The current Director has no external research domain policy; this change does
   not pretend to add one. Estimate 2–4 engineering days plus evaluation cost after
   scope/cap approval for a narrow, measured evaluation and targeted corrections.
3. **Capability gate:** education/Tutor work, free-form specialist advice, document
   analysis, task-specific research and external action lack independently
   executable acceptance criteria in this runner. Do not mark unsupported work
   completed. Adding a well-defined shared adapter and verifier is approximately
   1–3 days each, dependent on actual existing specialist capability; this is an
   estimate, not an assignment or authorization to upgrade other specialists.
4. **Autonomy gate:** no background scheduler, general correction dialogue,
   arbitrary task DAG or unbounded agent loop is introduced. General autonomy
   would require explicit scope/budget/approval and failure-recovery design;
   estimate 3–7 days after supported capabilities and evaluation gates are settled.

Stored assignment history is owner-controlled data, not a trusted authorization
token or tamper-proof audit log. A member can edit their own rows through allowed
database operations; the server therefore recomputes current evidence before
presenting verified completion. It never uses stored success to authorize an
external action. Raw snapshots contain private saved-record values and remain
under owner/module RLS; they are omitted from API responses. Production retention,
erasure and backup behavior require separate environment verification.

Actual paid AI evaluation cost for this work: **$0; no model requests executed**.
The new deterministic runner makes no provider calls. Existing conversational AI
usage/cost behavior remains in the shared runtime. No subscription, provider,
production change or production deployment was created. Vercel automatically
started its usual PR preview check after the branch push; that preview is pending
and is not part of the completed verification above.
