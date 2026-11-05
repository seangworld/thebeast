# Account-mail claim failure — exact diagnosis and focused candidate

Owner authorized diagnosis/correction preparation only. No production configuration, deployment, migration, credential, permission, SMTP or mail activation is authorized by this work. Issue #316 remains open; no pending message retry.

## Exact failure

The claim RPC is invoked and fails INSIDE public.beast_account_mail_claim(uuid,text,text), not before the RPC. Safe aggregate live logs for the original November 5 21:18:00–21:19:00 UTC window show exactly one successful queue RPC (HTTP 200) and one claim RPC (HTTP 400). No addresses, request headers, tokens or database rows were logged/read from those events.

Read-only production schema inspection confirms auth.users.email is varchar, while claim declares recipient text. PostgreSQL resolves `case when q.kind='owner_registration' then owner_recipient else u.email end` to character varying. Reproducing the deployed function in isolated PostgreSQL with actual Auth email varchar(255) gives SQLSTATE **42804**, message **structure of query does not match function result type**, detail **Returned type character varying does not match expected type text in column recipient (position 3)**. This is fixture-only evidence with the same deployed function and production types, corroborated by the live RPC failure; no production receipt was claimed during diagnosis.

The failed statement rolls back its lease update. Thus the existing message remains pending with leased_at/sent_at NULL even though claim was called. In delivery.ts, Supabase's claim error becomes **ACCOUNT_MAIL_STORE**, which the route masks as **ACCOUNT_MAIL_PROCESSING_UNAVAILABLE**. SMTP send is downstream and is never reached. The earlier isolated harness used email text, masking the production-type mismatch; both mail PostgreSQL harnesses now use varchar(255).

## Configuration lead ruled out safely

The full scoped Vercel environment metadata includes an existing hidden Sensitive SUPABASE_SERVICE_ROLE_KEY binding targeted to Production, as well as Preview entries. The Production entry predates the test. Its value was NOT requested, retrieved or exposed. A shortened/truncated listing is not proof it is missing. Do not copy a Preview value, rotate credentials or add a speculative replacement.

The temporary sending build was removed at the prior safety stop, so no direct runtime-secret readback or new diagnostic deployment was attempted. Actual execution nevertheless establishes its required configuration:
- HTTP 202 plus canonical queue creation means server-mail flag was true; accountMailAdmin passed the canonical identity/public URL pin and requireSupabasePublicConfiguration before createAdminClient returned a client. Missing service-key configuration would throw ACCOUNT_MAIL_CONFIGURATION before queueing and return 503 instead.
- A successful service-only canonical queue RPC proves that administrative client authentication worked for that request. Current metadata independently confirms the Production key binding.
- Current BEAST_IDENTITY_URL matches canonical grpyzwvgqiwtxadfdtni; Production public URL/key bindings are present. The successful helper path verifies usable public configuration in the actual sending candidate without printing any key.
- JS evaluates accountMailAdmin() and smtpSender(process.env) before entering deliverAccountMail. The live claim RPC therefore proves that SMTP required presence/format validation and createTransport initialization completed in that candidate. Reviewed host/port/user/sender configuration was also checked by equality, never by printing values. Password binding remains hidden/present. This does NOT prove SMTP authentication or provider delivery: no send occurred.
- Actual SMTP transport construction passes offline with fixture-only configuration and no network send. No real credential was loaded for this experiment.

All three Production custom flags remain explicitly false. Existing pending receipt c3b15281-fbd3-42bf-a86f-7ca5ae8c5e40 is still pending/unleased/unsent. No new recovery request or general dispatcher drain occurred. Existing working production/rollback remains 24d4a9e87e09e230d2507d19f3875ca8d2b305ec / dpl_FrXerDEXGfEofbFRrqnucEDXDeZC, with prior Stage 1 dpl_6XGtB7duMH5Dv9iopwKcRzrF8Gs2 retained.

## Smallest correction

Forward migration **20261105213413_account_mail_recipient_return_type.sql** replaces ONLY the existing claim function and changes one expression to `else u.email::text end`. Declared recipient type and actual CASE output then agree. Recipient policy, account validation, function ownership/ACL, rate limits, locks, leases, dedupe, receipts and failure isolation are unchanged. Original deployed migrations stay immutable. Only the required migration inventory/counts and regression fixtures/tests are updated. No runtime SMTP/Auth/admin-client behavior is modified.

Migration SHA-256: **0f7c8907a5f53c4e74c2a4d4188d57d6f6101e8ae73c5352a857abe72de60ca8**.

## Verification

- 2,739 full-suite tests pass, zero failures.
- Required production build passes, including 20 focused mail unit/gateway tests, both real isolated PostgreSQL/PGlite suites, staff/history/artifact gates, TypeScript/lint and audit zero vulnerabilities.
- Regression first reproduces 42804 and unchanged pending/unleased/unsent state using a fixture transaction; no production message used. Apply explicit cast, then the same recovery claim succeeds. Existing non-admin owner claims also pass with realistic varchar schema.
- Exact before/after function comparison permits only the cast; exact ACL remains unchanged. Existing account/profile/username and delivery invariants continue passing.
- New unit test verifies a claim RPC 42804 is surfaced as ACCOUNT_MAIL_STORE with zero SMTP sends and no finish call.
- All real credentials, role grants, production data/receipt and SMTP remain unchanged during preparation. No test accounts or emails.

## Required approval / safe release plan

No Production credential/configuration correction is indicated by the evidence. Approval is required ONLY for the exact candidate source, reviewed forward migration and mail-OFF deployment. Capture fresh preservation/queue baselines; merge/build/stage the approved source, apply ONLY this migration to canonical grpyzwvgqiwtxadfdtni, check exact grants/output types, preserve pending receipt and retain current working mail-off deployment before promotion. Do not rotate/copy/rebind service-role, SMTP or dispatch secrets.

Do not invoke claim for the real pending message as a migration check. After approved release, any resumed delivery attempt needs explicit authorization for that EXISTING pending receipt. Do not create another recovery request or reset dedupe/receipt state. Confirm provider acceptance and actual mailbox delivery separately before any public recovery or owner-alert activation. Backup remains off. On failure keep all flags false and hold the receipt; never blind-retry. Existing mail-off deployment rollback remains safe with the additive function cast. If exact SQL rollback is needed, restore the previous function definition from 20261105205657 only while sending remains off; it deliberately restores the known mismatch and is not a delivery remedy.
