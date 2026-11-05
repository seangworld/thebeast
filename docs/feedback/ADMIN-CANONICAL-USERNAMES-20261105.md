# BeastAdmin canonical member usernames

## Verified root cause

The Members table labeled `Username / display name` rendered `displayName`. Its existing owner-checked `get_beast_admin_member_directory()` RPC used `public.profiles.display_name`, preferred_name, full_name, then profile.username. It never read `beast_identity.usernames`. A production aggregate read found 15 canonical Auth accounts, 5 registry assignments, 2 populated profile usernames, and 4 assigned accounts without a profile username. The live RPC returned no username field.

## Focused correction

Read `beast_identity.usernames.username` by the unique canonical `user_id = auth.users.id` through the existing owner-authorized RPC. Retain every prior JSON field and account ordering exactly. Keep Auth as the complete directory source and left joins, including accounts registered through Guide and accounts without profiles. No synchronization writes, new identities, username changes, profile changes, new services or table changes.

Desktop and mobile Members show the canonical username or `Setup Required`. The existing first-column sort control now sorts its actual username value; all other sorts, filters, pagination, selections and actions remain in place. Search retains display-name/email matching and adds canonical username matching. Display-name editing remains the existing separate profile operation and does not rename a canonical username.

Most-used module rendering, usage RPC, activity tracking, roles, access controls and authentication remain unchanged. The private registry remains inaccessible to browsers. Existing owner-role checks and authenticated-only RPC grants remain enforced; anonymous/non-admin users are denied.

## Validation

- `npm test`: 2,718 passing, no failures.
- `npm run build`: passes staff dossier/source gate, verified embedded Guide release, audit (zero vulnerabilities), Next build, lint and TypeScript.
- `node scripts/test-admin-usernames-db.mjs`: actual isolated PostgreSQL/PGlite test of owner/anonymous/non-admin boundaries, canonical usernames vs stale profile names, Guide signup, unassigned/missing-profile account inclusion, exact equality of every old directory field/order/activity/access, unchanged profiles and registry.
- Source regression compares the replacement function to the existing function with only the single new JSON field and left join removed; they are identical.

The PostgreSQL harness reuses the existing BeastGuide acceptance dependency; set `BEASTGUIDE_CHECKOUT` to an existing checkout with `@electric-sql/pglite` if needed. No additional dependency or hosted test account is introduced.

## Release and rollback

Owner requested deployment after validation. Baseline production: BeastOS commit 81d22b5d293b46fdf959b6fb1b5fe3b7cbe3bb9b, deployment dpl_DKkiRpzhkWTbPEUTNw75ecG3jxXe. Retain it. Database rollback is the previously deployed directory function definition, captured before replacement; the new field is additive and compatible with the old UI. Do not apply any deferred username-mail migration or auth configuration changes as part of this release.

Production verification must compare account/profile/username/module-access fingerprints and the existing directory JSON minus username, compare usage-function definition, verify all Auth IDs are present once and canonical mappings match, then verify the live owner Members UI. Record actual released source and deployment separately after promotion.
