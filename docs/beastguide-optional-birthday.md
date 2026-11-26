# BeastGuide optional birth date

BeastGuide signup and setup accept an omitted birth date. The shared validator accepts a missing date only when its caller explicitly selects the BeastGuide policy. Submitted dates still receive calendar and future-date validation. Empty dates are omitted from signup metadata and profile patches. Existing dates are preserved.

The web application, native draft, embedded application and hosted native gateway use the same canonical Beast account. BeastGuide identity checks call `beastguide_account_setup_complete()`. Email verification, a canonical username and a nonblank profile name remain required. The BeastOS setup rule and age restrictions for other modules retain their existing behavior.

## Database change

The additive migration was applied to the production `thebeast` Supabase project on November 26, 2026. The function exists; read-only checks confirmed anonymous execution is disabled and authenticated execution is enabled. It contains no data writes and leaves the shared setup function and profile schema unchanged.

The Supabase migration tool recorded version `20261126155424`. The source migration filename uses that recorded version so a future `supabase db push` does not try to apply the same function again.

## Verification

- BeastGuide web unit suite passed 82 tests. Syntax checks and the production Vite build passed.
- A local browser test passed at 390 and 1280 px. It submitted the real signup form to the real registration handler with synthetic upstream Auth, omitted the birthday from metadata and reached the verification screen. It sent no emails.
- The existing iOS draft plus this patch passed 94 unit tests, syntax checks and `build:native`. This builds bundled web assets. Xcode compilation and device acceptance remain separate.
- BeastOS test compilation passed. The focused setup, middleware, callback, registration and age-entitlement suite passed 38 tests.
- Six local database tests passed, covering the additive migration, null birthday, required identity/name/verification, anonymous and cross-account isolation, unchanged existing records and shared setup definition, and rollback.
- BeastOS changed-file ESLint and the full production build passed. The build included imported-artifact checks, the staff dossier gate, account-mail tests and an audit reporting zero vulnerabilities.
- Production deployments for BeastOS and BeastGuide reached Vercel READY. The BeastGuide custom domain now points at the updated production deployment; its live bundle contains the optional birth-date label.
- No hosted signup account was created. End-to-end hosted acceptance through email verification and My Library remains unverified.

## Release and rollback

The BeastOS gateway change merged as [#348](https://github.com/seangworld/thebeast/pull/348). Its production deployment is ready. The BeastGuide web change merged as [#29](https://github.com/seangworld/beastguide/pull/29), and its production deployment is ready. The custom domains were assigned to those deployments. The iOS change merged into the existing iOS draft branch through BeastGuide #28. It is source-only: Xcode archive, simulator/device acceptance and a new App Store Connect upload are still required.

Restore the prior application/gateway versions before removing the new function. The database rollback is `drop function public.beastguide_account_setup_complete();`. Retaining the unused function temporarily is also safe. Rollback needs no profile edits, date backfills, account recreation or identity relinking.

The embedded bundle was rebuilt from its existing imported source at `684ae478e60b87bf0cbb7b266c2f8b7f433eaea4` plus only this patch, producing source `449640301f506315bd19c4bc131688d862a26ac9`. Every manifest-listed file was checksum-validated while copying the new artifact. Gateway adapters outside the embedded manifest were preserved.

## Changed files

### BeastGuide web

- `api/auth-universal.js`
- `server/identity/account-profile.js`
- `server/identity/proof.js`
- `src/main.js`
- `src/universal-auth.js`
- `tests/account-profile.test.js`
- `tests/identity.test.js`
- `tests/optional-birthday.browser.mjs`
- `tests/universal-auth.test.js`

### Existing iOS draft

- `api/auth-universal.js`
- `docs/iphone-verification.md`
- `server/identity/account-profile.js`
- `server/identity/proof.js`
- `src/main.js`
- `src/universal-auth.js`
- `tests/account-profile.test.js`
- `tests/identity.test.js`
- `tests/native-api.test.js`
- `tests/universal-auth.test.js`

### BeastOS gateway and migration tracking

- `docs/beastguide-optional-birthday.md`
- `public/beastguide-app/assets/index-BFjrURO9.js`
- `public/beastguide-app/index.html`
- `src/app/account-setup/page.tsx`
- `src/app/auth/callback/route.ts`
- `src/app/components/auth/RequiredProfileSetup.tsx`
- `src/lib/auth/accountSetup.ts`
- `src/middleware.ts`
- `src/vendor/beastguide/api/auth-universal.js`
- `src/vendor/beastguide/manifest.json`
- `src/vendor/beastguide/server/identity/account-profile.js`
- `src/vendor/beastguide/server/identity/proof.js`
- `supabase/migrations/20261126155424_beastguide_optional_birthday_setup.sql` (renamed to match applied Supabase history version)
- `tests/accountSetup.test.ts`
- `tests/accountSetupMiddleware.test.ts`
- `tests/beastguide-optional-birthday-db.test.mjs`
- `tests/memberAgeEntitlements.test.ts`
- `tests/registrationContinuity.test.ts`
