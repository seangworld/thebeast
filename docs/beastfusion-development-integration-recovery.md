# BeastFusion development integration recovery

## Roadmap Item
Unblock the development customer purchase flow without changing production or removing Vercel Deployment Protection. This is a candidate recovery configuration, not commercial release approval.

## Validation
32 focused tests passed: email-code helper and rendered sign-in flow, development webhook signature and environment boundaries, actual Stripe price verification, entitlement download, preview diagnostics and replay protection. Modified login/helper/checkout sources pass strict TypeScript checks. Edge entry and handler pass JavaScript syntax checks. Deno deployment/bundling, real email delivery, real customer authentication, Stripe delivery and full customer fulfillment remain pending.

The email-code UI is disabled by default. It uses normal Supabase email OTP verification and a subsequent getUser check, rejects disabled app-metadata users, clears the code after submission, preserves the safe purchase destination, and sends no code/email to analytics. Secure browserAuth can accept the code without a manual cloud-browser takeover once enabled. Actual secure-prompt availability remains to be verified.

The development receiver uses the same purchase and actual-line-item validators as the application. It requires a valid Stripe signature, a restricted test read key, the exact development project URL, explicit enablement, the configured $499 price, and the development checkout scope. It rejects live events, unpaid sessions, wrong price/customer/currency, oversized payloads, and unrelated integrations. Duplicate delivery cannot reactivate revoked licenses or extend their coverage. Storage/API failures return retriable status without provider diagnostics or secrets.

## Execution Timeline
Execution timing unavailable.

## Git Status
Candidate sources are prepared for the existing thebeast draft review branch codex/commercial-payment-boundaries-20261008 (PR #237). Existing concurrent price-verification work is preserved. No main merge is part of this recovery.

## Deployment Status
The proposed receiver is a separate Supabase Edge Function in development project zvzcojwjgnedrouilovc, named beastfusion-dev-webhook. Its URL will be https://zvzcojwjgnedrouilovc.supabase.co/functions/v1/beastfusion-dev-webhook. It performs development license writes directly after signed-event and price verification; it does not access or bypass the protected Vercel preview. No function or Stripe endpoint has been created by this recovery yet.

The application source tags development-only test Checkout sessions with verification_scope=beastfusion-dev-commercial-20261008. Other checkout environments are tagged commercial. The source change grants no payment or fulfillment authority by itself.

## Manual Actions
The following exact configuration changes require owner approval under GV-005 before execution:

1. In Supabase project zvzcojwjgnedrouilovc only, install supabase/auth/templates/development-magic-link-code.html as its Magic Link email template, retaining the existing email OTP expiry and length. Read-only dashboard inspection confirmed a 3600-second expiry and eight-digit length on 2026-10-08. The input accepts 6–10 digits while Supabase enforces the configured token. Do not change production templates, passwords, users, SMTP credentials or redirect allowlists.
2. In Vercel project prj_EWJx7hi5tqZxOX0PGLPUN3Qh3d2P, set NEXT_PUBLIC_BEAST_EMAIL_CODE_ENABLED=true only for Preview branch codex/commercial-payment-boundaries-20261008 and build a fresh preview. Leave other branches and Production untouched.
3. Deploy supabase/functions/beastfusion-dev-webhook/index.mjs and its handler/shared purchase validator to development project zvzcojwjgnedrouilovc as beastfusion-dev-webhook. Set verify_jwt=false only for this new Stripe receiver because its body implements Stripe signature authentication; retain JWT requirements for all other functions. Store BEASTFUSION_DEV_WEBHOOK_ENABLED=true, the configured test STRIPE_BEASTFUSION_PRO_PRICE_ID, and a new dedicated restricted test key as BEASTFUSION_DEV_STRIPE_READ_KEY in development function secrets. The new key needs only Checkout Session read access and must never enter source, logs or chat. Do not export the existing Vercel privileged credentials.
4. In Stripe test account acct_1TovjIGl8yDG6HDc only, create a separate endpoint at the new development function URL for checkout.session.completed and checkout.session.async_payment_succeeded. Store its newly returned signing secret as BEASTFUSION_DEV_STRIPE_WEBHOOK_SECRET in development function secrets. Leave we_1UO3XlGl8yDG6HDcyqEvbsUX and all existing endpoints untouched. Honor any native Stripe confirmation prompt.

The connector cannot create a restricted Stripe API key or set Supabase function secrets. These operations require the authorized dashboard path; if dashboard access or a secure secret transfer is unavailable, report that exact blocker rather than exporting existing server credentials or disabling protection.

After configuration, verify missing/invalid signature responses at the deployed receiver, request a fresh sign-in email, obtain a real customer session through secure browserAuth, then run real Stripe test Checkout and verify delivery, own license, signed key, entitled archive checksum, clean installation and controlled first job. No synthetic event or fixture is purchase evidence.

Rollback: disable the new test endpoint, set development webhook enablement false, disable the branch email-code flag, restore the previous development Magic Link template, and revoke the dedicated test read key. None of these steps requires a production modification.
