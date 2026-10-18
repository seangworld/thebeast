# Avery hosted DEV completion / production approval package

**READY FOR PRODUCTION APPROVAL — not deployed to production.** Engineering/DEV release criteria pass. Final production migration, main merge, deployment and optional paid production inference activation remain reserved to Sean. A restorable backup must be confirmed as the first pre-DDL execution check; current API metadata did not expose one. [Exact production sequence, backup conditions and rollback](PRODUCTION-RELEASE-PLAN.md).

## Completed integration

Security PR #267 (`c5318138`) was fast-forwarded into the existing non-production Avery branch / PR #265. GitHub marked #267 merged into that branch; main and production were untouched. The narrow maintained fork, all installed consumer paths, archive/source integrity, depth/cycle behavior, 22 security tests and full audit remained enforced. Tailwind 3.4.19, Next 15.5.27 and application code were preserved.

Existing the-beast-dev project `zvzcojwjgnedrouilovc` was inspected before writes. All prerequisites/columns/RLS existed; four Director migrations were missing. Only those exact reviewed source files were applied in dependency order. History increased from 115 to 119; generated hosted versions map to canonical names/hashes in [reconciliation](evidence/migration-reconciliation.json). No unrelated history was marked/repaired or pushed. Seven new functions are security invoker with empty search_path; anon execute denied. New tables have RLS and anon reads denied. Existing advisor counts did not increase and no new Director notices appeared.

Verified hosted preview: **https://thebeast-6vi46p30f-seangworld-3898s-projects.vercel.app**, deployment **`dpl_BZu5ng2VYstsksESBF6usHBn4cCZ`**, preview target, application commit **`c5318138a6f5b6f32d6e533a83973373a1658ec2`**. Vercel project `thebeast`, Node 24, full required build passed remotely. Same-project short-lived OIDC was supplied only to the preview origin; Deployment Protection remained enabled.

Avery-branch preview overrides explicitly bind DEV public URL/key, set `BEAST_DIRECTOR_REASONING_ENABLED=false`, and clear inherited paid/privileged external service credentials and analytics. Global, production and other-branch values were not modified; existing AI development credential untouched. Real browser network and deployed server operations verified the DEV project exclusively. The secret DEV API key was used only locally for synthetic setup/evidence/cleanup, never installed in the preview or published.

## Real hosted end-to-end evidence

Three new synthetic DEV accounts (two adults, one minor) were created through GoTrue Admin without sending email. Real password login/getUser, SSR cookies and deployed authenticated sessions were used. An authored synthetic plan fixture exercised approval; **it was not an AI response**. No paid/model transport was called.

| Requirement | Actual hosted outcome |
| --- | --- |
| Login / sessions / unauthenticated denial | Pass; real GoTrue and application 401 |
| Director dashboard / goal create-retrieve | Pass; real authenticated PostgreSQL and browser |
| Explicit approval / specialist selection | Pass; browser authorizes ready supported steps |
| Health → Money dependency | Pass; Money attempt remains zero until Health verified |
| Actual specialist execution / verification | Pass; both stored and independently checked, original goal remains Active |
| Repeat / stale approval | Pass; no extra attempts, stale approval 409 |
| Correct source / recompute | Pass; 4800 corrected to 2800, old result invalidated, same checkpoint verifies at attempt 2 |
| Interruption / lease / recovery | Pass; exhausted expired lease blocked, explicit correction resumes same id |
| Revoke / cancel / restore permission | Pass; direct source reads denied, hidden work fenced, verified Health retained, Money attempts stay zero |
| Stale queued restart | Pass; cancellation returns intended 409 and direct stale write is denied |
| Tenant / minor / module boundaries | Pass; foreign API 404 / no foreign rows; minor RPC denied |
| Self role escalation | Denied by existing hosted privilege trigger; role unchanged |
| Inference disabled | Pass; reason action 503; no provider request |
| Desktop / mobile | Director 1440/390/375; Money and Health 1440/375; no horizontal overflow |
| Money dashboard | Loads current synthetic $2800 data; no local-fixture permission error |

The earlier Money failures were missing grants in the local canonical fixture. Hosted DEV already had select privileges on bill_payments, debt_payments, learning_profiles and subscriptions. Actual hosted Money renders normally; no new grant/migration was needed for those tables. No broad customer access was added to make this pass.

One test-harness correction was needed: its first run expected HTTP 200 after owner cancellation; the deployed endpoint correctly returned its documented 409 denial. The expectation was corrected and the hosted test passed. No application/security behavior was loosened, no model result edited, and no competency criteria changed.

## Combined gates

- Full npm audit: **0 findings**, enforced together with private fork verification/security regressions.
- Required production build: **PASS locally and in hosted Vercel preview**, including full audit and 22 fork security tests. Remote build log excerpt is included.
- Existing full regression: **2,425/2,425 pass**. Previously verified TypeScript/lint remain passing; current production build performs both again. No source/package change since the fork verification.
- Runtime/source/styles/vendor/config bytes are identical to c5318138; only hosted test drivers and release evidence are added in this follow-up.
- Source ownership, cancellation, explicit approval, clinical/financial limits and unfinished objective reporting remain unchanged.
- Independent **23/24 PARTIAL-PASS remains locked**. Hosted mechanics do not certify fresh AI judgment or make it FULL PASS.

[Actual sanitized checkpoint/history projection](evidence/actual-checkpoints.json), [hosted assertions](evidence/hosted-results.json), [browser/module results](evidence/module-visual.json), [test run](evidence/hosted-run.txt), [remote build](evidence/remote-build.txt). Screenshots use only newly created synthetic data. After evidence capture, sessions were revoked and only the three task-created synthetic accounts/overrides were removed; DEV schema remains installed. Credentials, tokens, private account/password files, raw configuration and source snapshots are excluded.

## Production preparation and remaining gate

Read-only production compatibility confirms required foundations, privileges and PostgreSQL support; no Director tables/functions yet. Current active production rollback deployment is `dpl_J6rqpMQTuv9gLtpBMXvXB7Z1g7at`. Exact four source hashes and DEV-tested order, configuration, backup/rollback considerations, deployment and monitoring are documented. Production backup metadata exposes no verified restore point (`backups:null`, PITR disabled); confirmation or an authorized no-cost backup is a mandatory pre-execution check, not a claim of an existing backup.

No unresolved Director integration defect was found. Existing unrelated database advisor warnings remain outside this release and were not weakened or suppressed. No production migration/configuration change, main merge, production deployment, new service/subscription, upstream submission or paid evaluation occurred. Final production execution is not authorized by this report. Pin the final #265 head from Issue #264 and obtain Sean's approval before that stage.
