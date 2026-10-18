# Avery production release — 2026-10-18

Sean's final authorization explicitly covered a no-cost production database backup, followed only after verified restoration by the four reviewed migrations, production merge/deployment, Sol High activation and post-release verification. Codex was the sole executor. No competency evaluation was repeated.

## Verified backup gate

Production project `grpyzwvgqiwtxadfdtni` had no listed managed backup (`backups:null`, PITR false); `walg_enabled:true` was not treated as a verified restore point. A complete custom-format logical archive was created using the existing authenticated CLI's temporary database login, with read-only transactions and one exported repeatable-read snapshot. Existing database passwords and development API credentials were not changed.

A private owner-only directory outside all repositories holds the backup, role definitions without passwords, full checksums, exact location and practical restore instructions. Directory mode 0700, every file 0600, owner verified. The exact path is intentionally absent from this public record. Receipt: **avery-pre-release-20261018**. No paid backup/PITR, branch, project or service was provisioned.

The final archive was restored successfully into a fresh local PostgreSQL database using the exact official production image `public.ecr.aws/supabase/postgres:17.6.1.105`. The container had no networking or published ports, and cron execution was disabled. Bootstrap roles/ownership, archive and supplemental runtime restores each exited 0. **All 202 tables, 14,483 rows and full-row digests matched the same production snapshot; sequence state and all seven extension versions matched.** Schema, grants, RLS/policies/functions, Auth, Storage metadata and migration history were included. pg_net transient tables and sequence, omitted by pg_dump even with explicit table selection, were preserved with snapshot-bound binary COPY and restored separately. The isolated restored copy and temporary connection credential files were removed after successful verification. The original verified backup remains privately retained.

Archive SHA-256: `a0adc36e475deb0af5b6f7f1e5151c4fd2735c4b7903485c008888b18645ef2a`. Full sanitized integrity receipt: `evidence/production-backup-verification.json`.

This restores the captured **pre-release database** state. Storage object bytes, platform configuration, external encryption keys and original login passwords are outside a logical database backup and were preserved in existing infrastructure. Vault had zero secrets. This is a local private backup, not off-site disaster redundancy. Production restoration remains a separately reviewed recovery action, never automatic.

## Production changes / deployed source

PR #265 merged at approved head `8c8a6f12c397dd5f06ec6ab03cfc781dd19383dc`; main merge commit **`8b199938842d7eda73c888bb57d351fd42329b14`**. Application/security bytes match the previously verified `c5318138a6f5b6f32d6e533a83973373a1658ec2`; the intervening changes were integration evidence/test drivers. No unrelated application development was performed.

Only the four frozen SQL files were applied, individually and in order, after backup verification:

| Canonical source | Actual production migration version |
| --- | --- |
| 20261017022337_avery_director_assignments.sql | 20261018214541 |
| 20261017025810_director_data_api_grants.sql | 20261018214553 |
| 20261017215227_director_execution_contract.sql | 20261018214604 |
| 20261017230022_director_cancellation_intent.sql | 20261018214616 |

Each source SHA-256 matches the reviewed release plan. Both new tables have RLS and no anonymous SELECT; all seven Director functions are invoker functions with empty search_path and no anonymous EXECUTE. Cancellation fencing and owner predicates are installed. Existing security-advisor findings are unchanged: 26 no-policy informational notices, 4 search-path warnings, 42 anon and 55 authenticated definer-execute warnings, and 1 leaked-password-protection warning. Counts and finding descriptions match the pre-migration baseline; no Director finding was added. These existing platform notices remain outside this release's scope.

Existing Vercel production project/team was preserved. The only added production variables were `BEAST_DIRECTOR_MODEL_CONFIG=sol-high-v1` and `BEAST_DIRECTOR_REASONING_ENABLED=true`; all **47** previously present production environment entries are unchanged. Existing server OpenAI key remains unchanged. The production readiness API reports `gpt-6.1-sol`, High reasoning, default tier, 4800 max output, 80-second timeout. This is configuration/readiness verification, not a new paid inference test.

**Live production:** https://thebeast.seangworld.com

**Deployment:** `dpl_B4S7WnXbsHsNGGGhDUNBrrwigVLR`, Ready, production, main commit above, with the custom domain assigned. Built freshly with production variables; no DEV preview promotion. Required `npm run build` passed: private-fork integrity checks, **22/22 security checks**, full npm audit **0 vulnerabilities**, Next.js compile, lint/types and deployment all succeeded. Existing full validation evidence remains **2,425/2,425 application tests** and **764/764 upstream fork compatibility tests**; it was not needlessly repeated because application/dependency bytes did not change.

## Actual production smoke

One new synthetic account only; no existing customer records were used or edited. The test plan was an explicitly labeled authored fixture, not model output. **No model call or paid competency cycle occurred.**

- Real hosted GoTrue login/getUser and SSR cookies succeeded; unauthenticated Director API returned 401.
- Browser selected the saved synthetic objective, displayed the authored proposal and explicitly authorized the supported steps. Both checkpoints were stored before execution with zero attempts and the Health→Money prerequisite intact.
- Health and Money actual saved-record tools executed and independently verified; each checkpoint had one attempt. Resume latencies were **1,291 ms** and **1,404 ms**. A duplicate supervision request did not increment attempts. The life goal correctly remained Active.
- Foreign/random objective returned 404; the synthetic ordinary member's attempted admin-role update was rejected by the existing privilege-escalation trigger.
- Director, Money and Health rendered at **1440 px / 375 px**, with production Supabase requests only, no horizontal overflow, data-load error or browser page error. Screenshots were visually inspected and remain private local evidence.
- Explicit cancellation succeeded; subsequent resume returned 409. No paid planning action was invoked.
- Synthetic sessions were revoked, login banned and tested denied, goal archived and Money/Health access disabled. Immutable audit history was retained; no audit constraints were disabled. Task-created temporary service-key/password files were removed.

Sanitized actual smoke outcomes: `evidence/production-smoke-results.json`. Production metadata, hashes, migration mapping and advisor comparison: `evidence/production-release-schema.json`. Bounded runtime-log observation since activation found zero 5xx records and zero Director inference receipts; this does not establish long-term error rates.

## Status / remaining limits

**Production release COMPLETE / smoke VERIFIED.** Existing independent intelligence grade remains **23/24 PARTIAL-PASS**. Avery is released as a supervised coordinator of the two bounded saved-record reviews, not an autonomous booking/payment/publishing agent. No fresh model inference was used to claim stronger competency.

Rollback artifact retained: `dpl_J6rqpMQTuv9gLtpBMXvXB7Z1g7at`. Prefer code rollback with additive history retained; never automatically drop Director history or restore production from the backup. The next action is owner use of the supervised workflow and review of normal operational evidence. Unrelated platform advisory/baseline follow-up stays separate under #266; no new paid evaluations or unrelated development is included.
