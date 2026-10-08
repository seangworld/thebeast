# BeastFusion Commercial Edition verification handoff — 2026-10-08

## Roadmap Item
Continue Commercial Edition: $499 perpetual, twelve months of updates, optional $149 yearly updates/support renewal, self-install, customer-funded BYOK.

## Validation
68 affected runtime/governance tests pass, including clean extraction, offline dependency installation, activation, controlled Developer → Reviewer first job, expired update coverage, authorization before adapter imports, scope, cost, candidate binding and product completeness. 11 payment/download tests pass using the installed Stripe SDK for signatures and mocked storage. Changed payment/download routes and their helpers pass strict TypeScript checks. BeastFusion CI validation passed at ff1c017e54b3c42948197f505dd4403fc9bd86dd. The application preview deployment passed at c38e7e826c2cb99a1a4201c7caad5ea193db9956. Full release validation, real payment/database integration, real BYOK execution and the guided customer application remain unverified.

## Execution Timeline
Execution timing unavailable.

## Git Status
Source snapshots: beastfusion main 22a95cc17e6fc2e1b660bf260a25bc9b68dd71f6; thebeast main 908cd9690689bf335a87d4ff98aafcbe4ddd857a. Implementation is saved in draft PRs beastfusion #165 (codex/commercial-runtime-boundaries-20261008, ff1c017e54b3c42948197f505dd4403fc9bd86dd) and thebeast #237 (codex/commercial-payment-boundaries-20261008, c38e7e826c2cb99a1a4201c7caad5ea193db9956). Both implementation refs were one commit ahead and zero behind main at inspection. Local workspaces are source snapshots, not authenticated Git worktrees.

## Deployment Status
The application preview deployment completed successfully for implementation c38e7e826c2cb99a1a4201c7caad5ea193db9956. No production deployment, secret modification, database migration, storage creation, payment or paid AI call occurred.

## Manual Actions
Exact development-environment approval is required by GOVERNANCE.md / GV-005. This is an integration blocker, not product completion.

## Implemented
- License, owner/package, candidate-only, repository, required-test, existing-change and explicit-cost gates run before adapter imports.
- Runtime trusts the vendor public key bundled with the package, never a job-selected key.
- Separate Developer/Reviewer objects; completeness requirements preserved in review.
- Public-key-only allowlisted standalone package; private keys and owner state excluded.
- Checkout defaults closed; live sales require owner terms/release approval plus pinned private delivery.
- Stripe asynchronous payment success supported; duplicate webhook insertions cannot reactivate revoked licenses.
- Authenticated active-own-license downloads select a covered historical release and issue a sixty-second URL only after verifying bucket privacy.

## Verified environment facts
Production thebeast (grpyzwvgqiwtxadfdtni): license table exists, RLS enabled, no BeastFusion download bucket.
Development the-beast-dev (zvzcojwjgnedrouilovc): license table absent, no BeastFusion download bucket.
Vercel thebeast (prj_EWJx7hi5tqZxOX0PGLPUN3Qh3d2P): preview Stripe settings exist; signing key and customer delivery settings do not. Secret values were not printed.

## Concrete approval request: development and branch preview only
1. Apply existing supabase/migrations/20261006230000_beastfusion_commercial_license.sql to development project zvzcojwjgnedrouilovc. Verify history, RLS and own-customer access.
2. Create private development bucket beastfusion-customer-test without public-read policies.
3. Generate a separate test-only Ed25519 signing key. Set its private key as sensitive preview variable BEASTFUSION_LICENSE_PRIVATE_KEY_PEM, scoped to the commercial verification branch. Package only the public key.
4. Configure that branch to use development Supabase and existing Stripe test settings, BEASTFUSION_TEST_CHECKOUT_ENABLED=true, the private bucket and a controlled release catalog. Verify isolation before sending events.
5. Run real test-mode purchase → signed webhook → license → signed key → entitled download → clean install → controlled first governed job.
No live payment, paid AI call, production secret/database change or production deployment is included.

## Remaining public-release gates
- Built-in customer GitHub/BYOK adapters and complete standalone guided application; controlled adapters only prove boundary mechanics.
- Real integration verification above and actual provider execution under spending authorization.
- Owner-approved actual terms; LICENSE-BEASTFUSION.md remains a placeholder.
- Production signing-key custody, private storage, approved artifacts and owner-authorized deployment.
- Update/revocation/refund lifecycle and canonical version reconciliation.

Keep sales closed while gates remain unresolved.
