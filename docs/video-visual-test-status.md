# Image-backed News test video evidence

Implementation evidence for the existing canonical TODO-003; not a new roadmap package.

Status: implementation candidate, not deployed; no new render submitted.

The owner card now offers `Prepare image-backed test` on the original News
walkthrough. This owner-authenticated, same-origin action creates at most one
separate `news-visual-test-v1` candidate per owner. It keeps the source unchanged,
binds the captured homepage and Elizabeth City images, fingerprints the new plan,
and resets render/review state. Duplicate requests return the retained candidate.
Preparation makes no provider request, and rebuilding this test's plan retains
its required visuals. Phrase captions retain all narration words but still use
estimated timing; audio alignment remains a finished-render review requirement.

The Shotstack adapter previously ignored visual assets and replaced the final
scene with a hard-coded Beast CTA. It now supports explicit per-scene image
bindings, preserves the script CTA, and accepts a manifest brand label.

For a full visual test, set `requireVisuals: true`. Missing, duplicate, or invalid
bindings fail before composition. This is opt-in for compatibility with retained
historical manifests; it does not automatically upgrade existing jobs.

Only provenance-backed first-party PNG/JPEG/WebP captures under the exact
SEANGWORLD News or The Beast `/marketing/visuals/` path are accepted. No arbitrary
URLs, credentials, query strings, or unlicensed assets are forwarded. Retained
hashes must use SHA-256; this adapter checks metadata shape, not remote bytes.
The asset preparation pipeline must verify the bytes before binding them.

## Verification

- `TZ=UTC npm test`: 2,009 passed, zero failures. The initial default-timezone
  run exposed existing date-sensitive assertions; UTC removes that environment
  ambiguity. The evidence-heading registration failure was corrected without
  weakening its test.
- Image timing/layering, missing and duplicate bindings, unsafe URLs,
  incomplete provenance, and script-specific CTA tests are included.
- Lint passed.
- `TZ=UTC npm run build` passed. Stale generated cache/export directories were
  preserved outside the repository before the successful retry. No deployment
  performed by these local checks.
- No live provider validation or finished visual render yet.

## Remaining acceptance work

1. Release and verify the bundled public captures and owner preparation action.
2. Verify phrase-caption alignment against the actual audio.
3. Present the visual draft before the next credit-consuming render.
4. Verify existing credits and submit at most one approved test, with no
   purchase, recharge, plan upgrade, or automatic retries.
5. Inspect the resulting MP4, retain it in the private owner review workflow,
   and verify the Production review experience. Preview login is owner-deferred.

Public and unattended scheduled publishing remain disabled. This foundation
does not mark the complete low-touch workflow done or authorize new spending.
