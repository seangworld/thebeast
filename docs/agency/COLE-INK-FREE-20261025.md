# Cole canonical tattoo-free appearance — 2026-10-25

## Owner decision and exact file

Cole Mercer’s canonical appearance is mature, athletic, dark tousled hair, trimmed beard, **NO tattoos**. This supersedes the Pinterest-attributed blue-shirt portrait and previous two-full-sleeve requirement. Old dated dossier history is retained and explicitly superseded by this decision.

Approved file: `Cole Mercer’s Ink-Free Coastal Portrait.png`; PNG, 1254 × 1254, 2,021,199 bytes. SHA-256: `c84a2646f592c74d92430e33753b10b87a3c9cc6dec1eb8e3539383842a4e3bb`. Visual inspection confirms the supplied coastal portrait and bare arms. An ASCII-named upload copy has identical bytes/checksum; no conversion, crop, upscale or new generation.

Owner reports that ChatGPT generated the portrait from a written description without an outside reference image, followed by editing to remove tattoos. This is owner-reported provenance, not an independently verified generation history or guarantee of uniqueness/exclusive rights. Appearance/profile-picture approval does **not** approve future posts or publishing assets.

Owner reports that Instagram and Facebook profile pictures already show this portrait, the Facebook cover was removed, and old Facebook photos were deleted. These account actions were not repeated or independently claimed as verified by this batch.

## Private storage and display

Existing production project: thebeast (`grpyzwvgqiwtxadfdtni`). Existing bucket: `beast-marketing-media`, verified `public=false`, PNG already allowed. Existing storage object SELECT/INSERT/UPDATE RLS requires authenticated admin plus the user’s own first path segment. No bucket setting, RLS policy, service, dependency or credential changed.

Private object: `<authenticated-owner-id>/agency-appearance/cole-ink-free-coastal.png`. Actual upload metadata confirms image/png and 2,021,199 bytes. Original Unicode filename upload did not create an object; ASCII-named retry succeeded. No duplicate successful upload or overwritten object. Anonymous public and authenticated URL forms both denied access (HTTP 400).

The existing owner-only Agency endpoint downloads Cole’s PNG through the verified owner’s session and RLS. It uses a fixed owner-prefixed object path, exact size and SHA-256 checks, `image/png`, private/no-store headers, and no-store storage download. No service credentials or signed URLs are exposed. It never falls back to the superseded JPEG. Thumbnail/name and Brand & Style use the same endpoint; native enlargement and collapsed provenance retained. No new PNG is committed or bundled. The old Cole JPEG is removed from the current source tree and deployment tracing.

Leila’s appearance, JPEG bytes/display path, deferred status and dossier are unchanged. Her earlier repository-storage situation is not claimed fixed by this Cole-only batch. The separately paused private-storage branch remains untouched.

Cole’s persisted visual direction was changed with an exact previous timestamp check. Only visual_identity and updated_at changed; publishing/disclosure/identity workflow approval flags remain as before. Existing profile fingerprints continue to invalidate approvals when appearance changes. Cole’s Instagram connection and binding are untouched.

## Historical public exposure — not erased

The retired `assets/agency/cole-blue-shirt.jpeg` remains in public repository history. Known exact locations:

- Repository `https://github.com/seangworld/thebeast`, public at audit.
- Added commit `21c27f177895f8c6e18b57eaed72bade67edb6b7`.
- Branch `codex/agency-reference-images` and PR301 head `b4178d664fa8e692a4a5ffd02f9ebaade35f75f3`; `refs/pull/301/head` remains reachable.
- Production merge `02fac3a3ce1d59ca7f16c3bb9138876234639413` in main ancestry; PR301’s Files Changed/commit/archive/raw views can retain the JPEG.
- Git blob `ae741c952b474c27f1d638b66b0ba32f3cc6e2b7` (retired Cole JPEG).
- Prior production deployment `dpl_5DViLYKHDsZNu4faqFC5QMsQwVCY` and PR301 preview deployments bundled that old JPEG; their owner-authenticated endpoints remain separate from the corrected deployment. They were not deleted.

For example the old public file is addressable at `https://github.com/seangworld/thebeast/blob/21c27f177895f8c6e18b57eaed72bade67edb6b7/assets/agency/cole-blue-shirt.jpeg`. Deleting the latest file does not erase shared Git history, forks, caches or clones. No history rewrite, force-push, branch deletion, visibility change or old deployment deletion was performed. Separate owner approval is required for a coordinated history/ref/cache cleanup; assess GitHub support and clone/fork limitations before doing it. No claim that the retired image has become fully private.

## Validation and release

Focused tests cover owner/allowlist checks before access, owner-scoped private download, query-path injection rejection, exact size/hash failures without fallback/provider error leakage, PNG type/no-store response, unchanged Leila bytes and reference URLs excluded from publishing. Dossier source/history gates, complete tests, typecheck/lint, production/security build and traced-file exclusion are required. Hosted checks precede one authorized merge/deployment. Exact production SHA/deployment, served PNG checksum, anonymous denial, enlargement and live SW HQ dossier verification are recorded in the batch PR/Issue292 after readiness, without another receipt deployment.

No new generation, paid testing, purchases, services, dependency upgrades, OAuth changes, posts, DMs or automation activation.
