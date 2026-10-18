# Exact production release plan — FINAL OWNER AUTHORIZATION REQUIRED

No step that writes production, changes production environment variables, merges to main or deploys production has been executed. This plan is the final approval package, not an authorization token.

## Reviewed scope / immutable inputs

Primary PR #265 now contains security PR #267 via fast-forward into the **non-production** Avery branch. Verified application/security source: `c5318138a6f5b6f32d6e533a83973373a1658ec2`. Subsequent integration test/evidence-only commit on #265 has identical src/vendor/package/config bytes. Pin final #265 head from Issue #264 before approval; do not release an unreviewed later head.

Production Supabase: **`grpyzwvgqiwtxadfdtni`**, name `thebeast`, PostgreSQL 17.6.1.105. DEV: **`zvzcojwjgnedrouilovc`**, name `the-beast-dev`, PostgreSQL 17.6.1.127. Never substitute one ref for the other.

Read-only production inspection confirms all required foundation tables/selected columns and RLS exist; neither Director table nor any of the seven new Director functions exists. Required select/goal/conversation/birthday privileges already exist in production. Existing module constraint permits money/learning/home; reviewed migration adds health while preserving those values. No missing prerequisite or unrelated schema push is required. See evidence/migration-reconciliation.json.

## 1. Before any production write

1. Obtain Sean's final approval naming #265 exact head, four SQL files below, production deployment and the production model-gate choice. No paid benchmark is included.
2. Verify current production deployment and schema have not changed since this preparation. Current active custom-domain deployment was verified read-only as **`dpl_J6rqpMQTuv9gLtpBMXvXB7Z1g7at`**, `https://thebeast-meg9220ue-seangworld-3898s-projects.vercel.app`, serving `thebeast.seangworld.com`. Reconfirm before acting; record any replacement rollback target.
3. **Confirm a restorable backup / restore point before DDL.** Read-only CLI metadata currently reports `backups:null`, empty physical_backup_data, `pitr_enabled:false`, `walg_enabled:true`. This is not proof of a usable backup. No backup was created/downloaded, no customer data exported, and no paid plan/PITR activated. Use an existing verified managed backup or an explicitly authorized no-cost logical backup in approved private storage; record restore instructions/access. If a restore point cannot be confirmed, stop before migration rather than waive the check.
4. Re-run audit/fork verification and build if application/dependency bytes changed. Reject a different fork archive, unreviewed package change or different production target. Confirm current production environment uses its own Supabase URL/publishable key; do not copy DEV values into production or read/replace the existing OpenAI key.

## 2. Apply only these four reviewed Director migrations

Use the same individually transactional hosted migration mechanism tested in DEV, in this order. Check byte hashes immediately before application. No blanket `db push`, bootstrap, history repair or unrelated migrations.

| Order | Canonical SQL | SHA-256 | Actual DEV history version |
| --- | --- | --- | --- |
| 1 | `supabase/migrations/20261017022337_avery_director_assignments.sql` | `0812d557b7abca023ddab6446485a839012f2e55189bbd0026a74b2901e51af4` | `20261018205310` |
| 2 | `supabase/migrations/20261017025810_director_data_api_grants.sql` | `e671201fb5e3402691aba079dff5c8f28b84c100c17d48efca632491ff115a4e` | `20261018205316` |
| 3 | `supabase/migrations/20261017215227_director_execution_contract.sql` | `302b58a30ff11c5409eafa90b94a57d4b2f660d12a5ac719a49b57567e7f11d7` | `20261018205321` |
| 4 | `supabase/migrations/20261017230022_director_cancellation_intent.sql` | `b4d32d7af0af0084adcc9a8860bd02d7d3d96e8ef5fa22fdf329dc7af6708326` | `20261018205330` |

Hosted MCP assigns application-time versions; canonical source name is included in each history name. DEV history mapping is exact and leaves the previous 115 unrelated records untouched. Production has its own existing divergent history; record the four actual resulting versions and source hashes, without marking unrelated canonical migrations applied. Stop on existing objects, mismatched policy/function bodies or partial application; inspect, do not blindly replay non-idempotent SQL.

SQL effects: new owner-scoped assignment/cancellation stores and invoker RPCs; strict objective version locks; restrictive module/age read policies on existing specialist sources; supported Health denial in the existing override table; explicit grants that retain owner RLS. No source financial/clinical rows, bills, balances, documents, other agents, billing or licensing records are edited.

Immediately verify: both new tables have RLS; anon cannot read/execute; functions use invoker rights and empty search_path; owner predicates exist; cancellation trigger installed; scope/dependency approval RPC exists; new status includes cancelled. Compare grants/policies to reviewed definitions and run advisors. Existing DEV advisories were unchanged, with zero new Director findings; do not blanket-revoke unrelated RPCs as part of this release.

## 3. Deploy the approved production code

Only after schema checks and Sean's final authorization, merge approved #265 into main / permit its production-triggered deployment using the existing Vercel project **`prj_EWJx7hi5tqZxOX0PGLPUN3Qh3d2P`**, team **`team_kVdwsQ6tnUnYgRVqyGxxHB22`**. Never promote the DEV preview artifact: it embeds DEV public configuration. Build production from reviewed source with production-only variables. The unchanged required `npm run build` includes full npm audit plus private-fork integrity/path/security tests; no bypass.

**Production inference choice must be explicit in final approval.** To activate the upgraded paid planning path, approved production settings are `BEAST_DIRECTOR_REASONING_ENABLED=true`, `BEAST_DIRECTOR_MODEL_CONFIG=sol-high-v1`, using the existing unchanged server OpenAI credential. Descriptor: `gpt-6.1-sol`, high reasoning, default tier, 4800 max output, 80s timeout. These flags were NOT changed in production. Without that explicit activation, inference remains disabled and only deterministic saved-record checkpoints are enabled. No fresh paid model test is included in release verification; normal production usage is distinct from an additional competency evaluation. Do not infer authorization for extra benchmark calls.

Avery remains a supervised coordinator of two bounded saved-record reviews, not an autonomous booking/payment/publication agent. Independent intelligence grade remains **23/24 PARTIAL-PASS**; deterministic hosted checks do not upgrade that grade or prove a fresh corrected model narrative.

## 4. Post-release verification / monitoring

Confirm active production deployment id and source; browser/Supabase host is production; no DEV fixture credentials or service keys in public bundles. Verify real approved production login and Director goal retrieval, explicit approval UI and accurate unfinished-goal language using an authorized synthetic/test account only. Verify deterministic saved-record execution/cancellation with safe synthetic records if the final approval includes production synthetic testing. No model call, customer-record edits or model retry merely to complete a smoke test.

Observe deployment errors, Director endpoint status/latency, source-read failures, checkpoint revision/attempt transitions and tenant/module denials through existing logs, without recording raw health/financial snapshots, credentials or model prompts. Use existing instrumentation; no subscriptions. Stop/rollback on new tenant leakage, unsafe authorization, fabricated completion, missing schema, unexpected failed source reads or repeated checkpoint writes. Record a healthy smoke outcome before declaring live release complete; no such production claim is made now.

## 5. Rollback considerations

Default is **code rollback to the verified previous production artifact**, subject to the final authorization/incident procedure, retaining additive Director tables/history. Do not drop assignment/cancellation data or delete source records to roll back UI code. Keep inference disabled during diagnosis, preserve failed/successful checkpoint evidence, and do not restore cancelled authorization.

A database rollback is separately reviewed: restore only newly added policies/grants/constraint/function definitions to the pre-release metadata baseline and account for any newly stored health denial rows before narrowing the module constraint. Reverting the module check blindly can fail; dropping tables loses new history. Prefer a forward correction or retained additive schema. Use the verified backup/restore plan if a destructive database recovery becomes necessary; never perform it automatically.

Reverting the private dependency fork restores seven npm findings and closes the build gate. That is not an acceptable new production build or an audit waiver; an existing known-good rollback artifact is distinct from compiling a new insecure release.
