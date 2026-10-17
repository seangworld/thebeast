# Avery Director execution contract repair

**No-cost integration repair complete. Six authored synthetic workflows execute and verify through local PostgreSQL/PostgREST. This is not an AI competency pass or a successful replay of Avery’s original responses.** No paid inference was made, no development credential file was read, and no original case, rubric, response, grade or usage record was edited.

Existing branch `codex/avery-director-capability`, draft PR #265, Issue #264. Codex sole engineer. [Independent locked review](https://github.com/seangworld/thebeast/issues/264#issuecomment-6241665711): semantic scores **3/4 for five scenarios, 2/4 for Folio 41; semantic partial-pass, end-to-end FAIL**. The original 0/6 outcome, 16 consumed calls and $0.2152785 estimate remain unchanged. [Exact independent review archive](avery-execution-repair/independent-grades.json).

## Diagnosis across the execution chain

| Workflow | Original decision / rejection | Integration cause and verification after repair |
|---|---|---|
|Folio17|Correct conditional intent, but both specialists proposed before findings; routine approval and unread tool-loaded records populated global blocking arrays.|A dependency only orders tasks; it cannot evaluate a condition. New contract specifies care-only first. An authored care proposal is explicitly approved, persisted and actually verified. The test inspects the real saved logistics note; only after its condition is satisfied does a separately approved cash proposal persist and run. Cash depends on the existing verified care ID. Repeat does not duplicate either review.|
|Folio28|Correct 2800/2000 classification, but source correction, record discovery and future affordability questions globally blocked the initial bounded computation. No checkpoint existed for correction.|New contract distinguishes useful saved-record arithmetic from its semantic suitability. Authored cash proposal executes against actual 4800 saved income. Explicit owner update to 2800 invalidates that same persisted checkpoint; existing runner recomputes/verifies it at attempt 2, retaining its ID and history. The test’s classification statement comes from the frozen pay advice, not a new AI judgment.|
|Folio 41|Active lease and unmet dependency recognized; unnecessary queue/source-link requirements prevented progression. Second output was incomplete; earlier responses were truncated in model-visible history.|No new assignments or approval are needed to resume already-authorized rows. Actual active lease blocks both care reclamation and dependent cash. Controlled clock expiry permits care attempt1→2, then cash2→3 on the same IDs. Repeated continuation does not reset attempts or duplicate work. Cancelled rows now have explicit retain_cancelled guidance. Incomplete provider output is rejected before parsing/saving, with no automatic retry.|
|Folio55|Correct injection/account refusal, but approval and record-completeness caveats stopped permitted care; later unavailable Money questions blocked care again.|Typed scoped requirements cannot hold up independent ready work. Exact graph persistence removes the old artificial Money→Health scheduling dependency. Authored Money-first/independent-care proposal is explicitly approved; real Money permission is revoked. RLS hides denied assignment/source records, while permitted care actually executes/verifies. Local test-admin metadata readback confirms Money attempts 0/result null without restoring permission. Foreign-owner and unsupported-capability attempts are denied.|
|Folio63|Correct current cancellation reasoning; initial global blockers meant no prior care output existed to preserve.|After actual care verification, an explicit current-owner cancellation transaction records cash cancelled, clears its lease/result and increments revision without resetting attempts or modifying verified care. Old queued resumes return cancelled; stale revisions cannot overwrite cancellation or authorize a correction reset. In-flight cancellation also prevents late result certification.|
|Folio76|Correct cash-only scope and expired-term skepticism, but missing external terms and routine approval blocked the supported baseline.|Authored cash-only proposal with external limitations in notes executes and verifies real saved-record calculations. No research/contact/purchase capability is added. Expired offer remains unverified and the authored final report makes no supplier or affordability guarantee.|

[Original initial decisions, refusal feedback and history-truncation flags](avery-execution-repair/diagnosis.json) · [Actual persisted six-workflow traces and outputs](avery-execution-repair/workflows.json) · [API requests/results](avery-execution-repair/api.json).

Original assignments never reached creation for five initial proposals. The recovery case had existing rows but no permitted progression. Thus downstream specialist correctness, correction and post-result judgment were mostly unmeasured; it would be wrong to blame those missing outputs on failed specialist tools. Several model errors remain real: premature conditional steps, unnecessary recovery prerequisites, and scope/classification mistakes. The frozen assessment omitted production contract explanations, which materially contributed to global blockers. Schema-valid JSON and conservative prose did not establish execution competence.

## Changes implemented

1. **Versioned planning contract.** The live schema/instructions use contractVersion 2 and typed requirements scoped to a proposed capability or all_new_work. Ordinary plan approval remains the separate authenticated member action. Tool-loaded records are not an additional user-data prerequisite; the specialist itself checks completeness. Optional questions, unavailable future work and comparisons belong in notes. Genuine authority/source/conflict prerequisites remain blocking.
2. **Ready-step selection shared by UI/server.** A scoped requirement withholds that step and its dependents. Independent ready steps can be explicitly approved. All-new-work issues block every new task. Existing correction/investigation blocks affected dependent work without holding up independent work. Legacy plans retain fail-closed global blockers; ambiguous mixed contracts are rejected. No free-text heuristic deletes or reclassifies old blockers, and no old response is transformed into a passing answer.
3. **Exact persisted graph.** The reasoned-plan route now uses approve_director_scoped_plan, not the old capability-only RPC that discarded dependsOn and imposed a serial chain. The new invoker RPC locks the current owned active goal, validates each closed-registry step/dependency, checks module access, rejects replacement checkpoints and atomically rolls back invalid graphs. No fallback silently drops dependencies if the migration is missing. Existing manual planning remains compatible.
4. **Durable cancellation.** Current authenticated owner action cancels accessible remaining rows, preserves verified rows, invalidates in-flight revisions and forbids stale resume/correction resets. It adds no external effect. The new UI control and API notice are explicit owner actions; model prose cannot cancel or authorize anything. Cancellation cannot bypass revoked module RLS: the response describes visible/accessible work only, and does not confirm cancellation of inaccessible assignments. Revocation remains enforced. Combined cancellation-plus-revocation/restoration behavior needs further review before production trust.
5. **Incomplete-output handling.** The live provider requires completed status before parsing JSON and reports an actionable incomplete-response error without saving a proposal or retrying. The output allowance remains 2400; no paid-model evidence shows this removes high-effort truncation. Frozen assessment history remains unchanged; production recovery uses structured current checkpoint/lease guidance, not reconstructed truncated prose.

New migration: `20261017215227_director_execution_contract.sql`, created with the installed Supabase CLI, applied and tested **only in a disposable local fixture**. Security invoker, empty search_path, explicit authenticated grants, no anon/PUBLIC execution or RLS weakening. Migration registry and exact-count tests updated from 125→126 without relaxing inventory checks. No hosted migration, model switch, unrelated agent changes, dependency upgrade, new service subscription, merge or manual deployment.

## Verification and its limits

- **152/152 targeted checks pass:** 76 Director/security runtime checks and 76 offline script checks, including preserved frozen/hash/grade/packet tests.
- **Six actual persisted synthetic workflows pass**, plus the real API-handler integration and preserved local database regression. They exercise actual Supabase JS, PostgREST JWT/roles/RLS, compare-and-swap, specialist computations, saved result verification, source correction, dependencies, interruption recovery, permission narrowing, cancellation and stale/foreign request denial. Invalid second steps roll back the first insert. No successful execution trace is handwritten or substituted.
- API tests inject a **synthetic session adapter**; the preserved integration also exercises shared module/age checks. This does not verify real hosted/cookie/GoTrue authentication or browser-session behavior.
- Lint and application TypeScript pass. Full suite **2418 total /2400 pass /the same 18 failure names**, separately tracked in #266. The new migration inventory checks pass. No unrelated baseline fix was folded into this work.
- Supabase security advisor, explicitly pointed at the disposable loopback database, reports **No issues found**. This covers the minimal fixture/migration subset, not a full hosted schema or the full production migration chain.
- Required build still stops at the unchanged **seven-high npm audit gate** before Next compilation. Production-only audit has zero findings but does not clear the full gate. Official npm metadata still reports braces 3.0.3 affected and latest Next lint plugin 16.4.2 depending on fast-glob 3.3.1. No compatible root patch was found. A separately reviewed Tailwind 4 migration plus removal of every vulnerable lint path, or a patched upstream release, requires full audit and compatibility verification. No install, forced update or security waiver.

[Machine verification and artifact hashes](avery-execution-repair/validation.json). Development inference credentials and consumed paid ledger remain unchanged. Disposable local services are removed after verification.

## Readiness for another independent model evaluation

**Mechanically ready for independent contract review and a future authorized synthetic retest; not certified for deployment.** There are no demonstrated component execution blockers in the six authored traces. That does not prove Avery will produce those plans, classify requirements correctly, interpret specialist evidence, or stop inventing prerequisites under the revised contract. The original independently graded model result remains semantic partial-pass/end-to-end FAIL.

Before fresh inference: independently review/freeze the revised production-oriented prompt/schema, actual evidence inputs, history policy and existing unchanged scenario criteria; prepare the new manifest against that contract; verify model/output allowance and a new owner-approved call/dollar cap. The old paid executor intentionally retains its frozen assessment contract and exhausted authorization and must not be reused as a version 2 retest. No spending request is made here.

A material production-context limitation remains: production planning deliberately supplies redacted checkpoint metadata rather than raw private financial/clinical outputs. The synthetic workflows inspect complete synthetic results, while this does not prove the live reasoner can independently read transport findings or numerical source classifications. A future production-representative evaluation must review the smallest owner-permitted evidence-summary interface or explicit member-provided evidence needed for those decisions; do not silently expose raw records to the model. Current hosted migration, real-session verification, combined revoked-work cancellation and the security build gate also remain release blockers.

Recommended next action: ChatGPT review of this contract repair and evidence boundaries, followed by preparation/review of a separately authorized regression evaluation. Preserve all independent grades; do not treat deterministic success as new model competency.

## Reproducing local integration

Use a fresh disposable database; these programs intentionally mutate their synthetic fixtures. Never point them at hosted Supabase. No inference credential is needed. Compile with `./node_modules/.bin/tsc -p tsconfig.test.json`, then:

```sh
docker network create avery-blockers-test
docker run --name avery-blockers-db --network avery-blockers-test \
  -e POSTGRES_PASSWORD=synthetic-local-only -d postgres:16-alpine
docker exec avery-blockers-db pg_isready -U postgres
# Continue only once pg_isready reports accepting connections.
docker exec -i avery-blockers-db psql -U postgres -v ON_ERROR_STOP=1 < tests/fixtures/director-database.sql
docker exec -i avery-blockers-db psql -U postgres -v ON_ERROR_STOP=1 < supabase/migrations/20261017022337_avery_director_assignments.sql
docker exec -i avery-blockers-db psql -U postgres -v ON_ERROR_STOP=1 < supabase/migrations/20261017215227_director_execution_contract.sql
docker exec -i avery-blockers-db psql -U postgres -v ON_ERROR_STOP=1 < tests/fixtures/director-execution.sql
docker exec -i avery-blockers-db psql -U postgres -v ON_ERROR_STOP=1 < tests/fixtures/director-stored-evidence.sql
docker run --name avery-blockers-rest --network avery-blockers-test \
  -e PGRST_DB_URI=postgres://authenticator:synthetic-local-only@avery-blockers-db:5432/postgres \
  -e PGRST_DB_SCHEMAS=public -e PGRST_DB_ANON_ROLE=anon \
  -e PGRST_JWT_SECRET=avery-synthetic-only-secret-at-least-32-characters \
  -p 127.0.0.1::3000 -d postgrest/postgrest:v12.2.12
docker port avery-blockers-rest
# Use the printed loopback port below in place of PORT:
DIRECTOR_TEST_REST_URL=http://127.0.0.1:PORT DIRECTOR_TEST_DB_CONTAINER=avery-blockers-db node scripts/test-director-execution-workflows.mjs
DIRECTOR_TEST_REST_URL=http://127.0.0.1:PORT node scripts/test-director-execution-api.mjs
DIRECTOR_TEST_REST_URL=http://127.0.0.1:PORT node scripts/test-director-database.mjs
docker rm -f -v avery-blockers-rest avery-blockers-db
docker network rm avery-blockers-test
```

The two new programs write synthetic evidence files; UUIDs/timestamps can differ on rerun. They do not write or regenerate the original paid evaluation packets. The security advisor was additionally run with an explicit loopback PostgreSQL URL through a temporary local-only proxy, never with `--linked`; its generic “remote database” log means an explicit connection string, not a hosted target.
