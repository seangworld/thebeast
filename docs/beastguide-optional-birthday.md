# BeastGuide optional birth date

The BeastGuide signup and setup forms retain an optional date input. The shared validator accepts a missing date only when its caller explicitly selects the BeastGuide policy. Submitted dates still receive calendar and future-date validation. Empty dates are omitted from signup metadata and profile patches. Existing dates are preserved.

The web application, native draft, embedded application and hosted native gateway use the same canonical Beast account. BeastGuide identity checks call the proposed `beastguide_account_setup_complete()` function. Email verification, a canonical username and a nonblank profile name remain required. The BeastOS setup rule and age restrictions for other modules retain their existing behavior.

## Proposed database change

Review [the proposed migration](../supabase/migrations/20261126034316_beastguide_optional_birthday_setup.sql) before any production application. A read-only production inspection on November 25 confirmed that `profiles.birthday` is nullable, its table constraints do not require a date, and the new-user profile trigger inserts only the account ID. The current shared setup function explicitly requires a nonnull date.

The proposal adds one authenticated self-read function using the current account UUID. Its query requires verified email, a canonical username and a profile name. It contains no data writes. Anonymous execution is revoked. The existing function and profile schema retain their definitions.

The migration has been tested only in disposable local PostgreSQL through PGlite. No hosted migration or account creation was performed.

## Verification

- BeastGuide web unit suite passed 82 tests. Syntax checks and the production Vite build passed.
- A local browser test passed at 390 and 1280 px. It submitted the real signup form to the real registration handler with synthetic upstream Auth, omitted the birthday from metadata and reached the verification screen. It sent no emails.
- The existing iOS draft plus this patch passed 94 unit tests, syntax checks and `build:native`. This builds bundled web assets. Xcode compilation and device acceptance remain separate.
- BeastOS test compilation passed. The focused setup, middleware, callback, registration and age-entitlement suite passed 38 tests.
- Six local database tests passed, covering the additive migration, null birthday, required identity/name/verification, anonymous and cross-account isolation, unchanged existing records and shared setup definition, and rollback.
- BeastOS changed-file ESLint and the full production build passed. The build included imported-artifact checks, the staff dossier gate, account-mail tests and an audit reporting zero vulnerabilities.

## Release and rollback

Obtain owner approval for the migration and production release. Apply the additive function before deploying gateway clients that call it. The new clients fail closed if the function is unavailable. Then deploy the matching gateway and web application, and update the native draft using its normal reviewed build process. Verify a synthetic acceptance account with no birth date through email verification and My Library before declaring hosted acceptance.

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

### BeastOS gateway and proposed migration

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
- `supabase/migrations/20261126034316_beastguide_optional_birthday_setup.sql`
- `tests/accountSetup.test.ts`
- `tests/accountSetupMiddleware.test.ts`
- `tests/beastguide-optional-birthday-db.test.mjs`
- `tests/memberAgeEntitlements.test.ts`
- `tests/registrationContinuity.test.ts`
