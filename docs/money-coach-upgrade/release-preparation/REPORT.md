# Money Coach production release preparation — 2026-10-18

Status: **READY FOR PRODUCTION APPROVAL**. Release scope: supervised financial analysis and recommendations. No autonomous payments, investments, financial-account modifications, or guaranteed outcomes.

## Candidate and independent evidence

Application candidate: `d42be7b7b20f9e51ffd80bc170c2d5a2ac6bf008`; application source tree `beec15cdcc00152ecea2293e8c96d5861e40766c`. The final release-packet commit adds documentation only. Source, tests, dependencies and vendor bytes match the already verified `0f7dd394cc72217782db7987813a537f92866954`; hosted DEV application bytes match `8cb4ccf254b4f6f1efba7dbab894782aa8a107c4`.

[Locked independent grading](https://github.com/seangworld/thebeast/issues/268#issuecomment-6256567528): 8/8 exercised financial families passed; 11/11 financial responses validated and delivered; no critical financial reasoning error observed. PASS for bounded financial advice and delivered contract; PARTIAL for the complete nine-family model gate because the attack scenario was refused by the input classifier before the plan model. Independent prompt-injection/security competence of Luna Medium was therefore not demonstrated. Preserve that distinction and all original evidence. No additional evaluation is proposed.

Final v2 assessment: 34 attempted calls, zero retries, $0.0387376 estimated API cost; 82,511 input tokens (66,732 cache-write, zero cached-read), 15,749 output tokens including 4,131 reasoning tokens. Actual model `gpt-5.6-luna`: Medium for 11 plans, Low for 23 classifier calls. Mean response latency 12.532 seconds; worst 19.149 seconds. These are assessment measurements, not a production service-level guarantee.

## Security and Avery compatibility

| Boundary | Existing enforcement and evidence |
| --- | --- |
| Customer isolation | Authenticated owner-scoped queries, current conversation ownership, database owner RLS and restrictive Director module policies. Cross-customer requests fail closed. |
| Payments/transfers | No executable financial transaction tools; bounded read/calculation capabilities only. |
| Untrusted instructions | Untrusted context treatment plus input/output safety classifiers; classifier remains enabled. |
| Unsupported record changes | Runtime and persisted approval checks reject income, debt, APR and bill modifications. Only supported goal/preference operations can be proposed. |
| Invalid calculations | Canonical calculation engines, typed evidence, exact numeric claims, snapshot and contradiction checks reject unsupported answers. |
| Approval | Supported consequential changes require explicit current member approval and owned current evidence; a model cannot approve its own proposal. |
| Capability expansion | Fixed capability registry, current age/module authorization, revision checks, cancellation and revocation safeguards. |

Fresh focused checks: **124/124 passed**, covering financial contracts, agent security, assignment persistence, execution contracts and evidence access. Existing **2,465/2,465** regressions, TypeScript and lint remain applicable because application/test/dependency bytes are unchanged. Fresh official-registry `audit:ci`: **zero vulnerabilities**, **22/22** scoped fork checks. Required production build passed, including the security gate; exact current-head Vercel preview `dpl_3SoWVcB2qpKV2Ggqk8iS5q5utsZk` is Ready and its build log confirms audit/fork/compilation success. Anonymous preview Director API returns 401.

Existing hosted DEV verification: **12/12** checks, including Health-to-Money ordering, explicit scope/approval, canonical specialist execution and verification, source correction at the same checkpoint, duplicate prevention, lease recovery, cancellation, module revocation, tenant/minor restrictions, reimbursement correction and Money identity/provider failure. Director desktop 1440 and mobile 390/375, and Money Coach desktop 1440/mobile 375 screenshots were inspected without overflow. Synthetic DEV accounts were disabled and temporary credentials removed. See `../evidence/correction-20261018/` for original results. No fresh model calls or customer writes were needed.

## Production compatibility and configuration

Read-only production inspection confirms existing Auth, financial, chat, goal, memory and Director tables/columns/functions and required RLS. Avery's four reviewed migrations are installed. **No Money Coach database migration is required.** Director financial-access policies are RESTRICTIVE and combine with owner policies; they do not grant cross-customer access.

Current main/production application commit: `8b199938842d7eda73c888bb57d351fd42329b14`. Production Supabase project: `grpyzwvgqiwtxadfdtni`; compiled public application references that project. Public login returns 200 and unauthenticated Director conversations return 401. Existing provider/Supabase credentials are present as sensitive configuration; their values were neither exported nor changed.

After final owner authorization, set only production `BEAST_MONEY_COACH_MODEL_CONFIG=luna-medium-v1` (`gpt-5.6-luna`, Medium, default tier, 4,800 maximum plan output tokens; existing Low safety classifiers, 1,200 output tokens; 60-second budget and no automatic retries). Currently this Money setting is unset. Preserve `BEAST_DIRECTOR_REASONING_ENABLED=true`, `BEAST_DIRECTOR_MODEL_CONFIG=sol-high-v1`, existing secrets and global model settings. Do not upgrade Avery or any other agent.

Production advisors report no ERROR findings. Pre-existing warnings include mutable search paths (4), security-definer execution visibility (42 anon/55 authenticated), and disabled leaked-password protection; 26 tables have RLS without policies (default deny). These are disclosed platform follow-ups, not introduced by this PR. See sanitized advisor/catalog JSON. This release does not widen SQL privileges or expose arbitrary RPC execution.

## Backup, release and rollback

Verified current restore point: `money-coach-pre-release-20261018` (see `production-backup-verification.json`). A consistent read-only snapshot restored successfully into a fresh local database with networking disabled, no published ports and cron execution disabled. All 204 table counts and full-row digests, sequences and extension versions matched, including released Avery assignments. Roles (without passwords), ownership, grants, RLS, functions, migration metadata and supplemental pg_net runtime state restored without error. SHA-256 integrity was reread successfully. Cached image `17.6.1.105` matches production extension versions; the initial `17.6.1.143` restore was rejected because pg_net differed, and was discarded. No production writes or spending occurred. The owner-private archive and recovery runbook are outside all repositories (directory 0700/files 0600); temporary source/local credentials and the isolated container were removed. Storage object bytes, platform settings, external encryption keys and existing role passwords remain outside the logical backup and are unchanged by this release. The old `avery-pre-release-20261018` archive remains untouched; it predates Avery's schema and is not used as the current restore point.

Final authorization procedure: verify final PR head, production alias and main have not drifted; confirm the current backup receipt remains appropriate; merge the exact reviewed head and deploy its merge result with only the Money configuration above. Recheck audit/build and deployment identity. This is a future plan, not authorization to execute now.

Rollback application target: current Ready production `dpl_B4S7WnXbsHsNGGGhDUNBrrwigVLR` (`8b199938...`), `thebeast-a7ll2hadi-seangworld-3898s-projects.vercel.app`. Revert Money configuration to its prior unset state; retain Avery Sol High. No schema rollback is required. Database restoration is a separately reviewed emergency action and must not erase newer customer/checkpoint history automatically.

Post-release smoke plan: verify login, authenticated ownership boundaries and Director/Money rendering, approval controls, persisted checkpoint continuity and financial evidence display using authorized synthetic accounts; do not modify customer finances. Any paid model smoke interaction requires explicit inclusion in final production authorization; no new competency benchmark is planned. Review existing safe error/correlation logs, validation failures, financial evidence/snapshot freshness, checkpoint outcomes and latency. Reconcile provider usage/billing manually: per-turn Money token/cost accounting is not proven persisted by the runtime, so do not claim automated production cost monitoring. No new service is needed.

Single next owner action after the receipt is verified: authorize the exact final PR #269 head for production merge/deployment and Money-only model activation. No merge, deployment, paid AI call, production schema/data mutation, or Taylor development occurred during preparation.
