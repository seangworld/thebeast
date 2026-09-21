# Home Studio room-review upgrade — September 21, 2026

Owner direction: continue improving Home Studio and hold affiliate links until Sean is ready.

## Delivered

- Room length and width determine a proportional outline and floor area, consistently in the workspace and downloadable HTML packet. Measurements outside the supported numeric range are identified before planning or saving; unknown values can stay blank. Openings and furniture remain descriptive notes, not automatically positioned objects.
- Each room photo has an editable description and can become the primary concept view without deleting/re-uploading it. The design request receives the ordered descriptions alongside the existing views. Promoting, relabeling, or removing photos clears image confirmation and the prior concept image.
- Editing a room brief preserves the previous plan for reference. A changed brief blocks mismatched plan saving, packet/data export, and image generation until rebuilt or restored. Restore explicitly confirms replacement of current brief edits.
- Reattaching photos to a saved project preserves its plan. A notice explains that the plan has not re-analyzed changed photos; members may rebuild or review the existing concept instructions before generating from the chosen primary view.
- A failed rebuild leaves the previous plan available. Inputs are locked during plan/image/photo requests to prevent applying responses to a different brief. Starting a new room or opening another saved project confirms replacement of unsaved session content.

## Affiliate hold and cost boundary

Affiliate enrollment, tracking IDs, referral tags, checkout and automatic purchasing remain on hold. Existing ordinary retailer search links remain unchanged. No new dependency, database migration, storage retention or provider action was added. Planning and optional image generation keep their existing explicit request behavior and existing provider costs. This work does not claim they are free.

## Verification

- Twelve focused Home Studio tests cover existing input/privacy/retailer/packet behavior plus aspect ratios, area, invalid measurements, primary order, plan/brief consistency, restoring edits, saved-photo reattachment, failed rebuild preservation and reset confirmation.
- Repository TypeScript and changed-file ESLint checks pass.
- Local browser component harness passes desktop and 390px mobile flows with no page errors or horizontal overflow: load a fixture project, prepare two images, label/promote primary, invalidate image consent on promotion, edit brief, block stale save/export, fail a rebuild, restore the old brief, reject an invalid measurement before requesting, successfully replace a plan, save a fixture without photos, download packet, and cancel/confirm reset.
- The harness uses the real workspace components and styles; saved-project and AI HTTP responses are mocked. No real saved project was changed, and no image-provider credits were consumed. This is not signed-in production save/load or live provider acceptance.
- Final follow-up adds readable dimension text beside area and blocks saving a brief with invalid measurements. These use the same validated geometry and input errors.

Production authorization and existing account/entitlement checks are unchanged. The deployment result is recorded in the associated pull request; local interaction checks and hosted build verification are distinct.
