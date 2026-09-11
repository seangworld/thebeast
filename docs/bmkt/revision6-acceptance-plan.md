# BeastMarketing Acceptance Test #2 — Revision 6

Owner-directed remediation after Revision 5 review.

## Preserve from Revision 5

- Matthew / en-US energetic conversational delivery and accepted speaking pace.
- Static screenshot presentation.
- `contain` framing on the 1080x1920 canvas; no screenshot crop or distortion.
- No pan, zoom, push, pull, or slide motion.
- Simple supported fades only.
- Existing owner-authorized SEANGWORLD News capture inventory only. Generated storyboard/substitute imagery is explicitly excluded.
- External and YouTube publishing remain disabled pending Owner Approval.

## Revision 6 hard requirements

1. **Monetization runtime**
   - Final program runtime must be at least 60.0 seconds.
   - Target 61–62 seconds to provide margin rather than landing exactly on the boundary.
   - Expand useful narration/content; do not create dead air or slow the accepted voice merely to reach runtime.
   - Pre-render gate must reject a monetization-oriented candidate below 60.0 seconds before paid rendering.

2. **Audio-derived synchronization**
   - Actual generated narration timing is authoritative.
   - Caption cues must be generated/aligned from the actual narration timing, not proportional word-count estimates.
   - Slide boundaries should follow actual narration/phrase boundaries where practical.
   - Target caption/audio alignment within approximately ±150 ms.
   - Do not stretch or slow accepted narration to fit old caption timestamps.

3. **Visual cadence**
   - Hold screenshots roughly 1–2 seconds longer than Revision 5 where appropriate.
   - Use clean static holds and fades.
   - Maintain useful visual changes across the 60+ second program; no filler holds.

4. **Opening and closing visual**
   - First visual must be the existing owner-authorized SEANGWORLD News homepage capture from the approved Acceptance Test asset inventory.
   - Last visual must be that same existing SEANGWORLD News homepage capture.
   - Do not generate, substitute, or synthesize a homepage image.

## Zero-cost validation before render authorization

- Confirm >=60.0 seconds (target 61–62).
- Confirm first and last visual IDs both resolve to the approved News homepage capture.
- Confirm all visual assets are from the existing approved News asset inventory.
- Confirm all screenshot clips use `contain`, are static, and preserve complete source visibility.
- Confirm no pan/zoom/push/pull/slide effects.
- Confirm supported fade transitions and no same-track overlap.
- Confirm voice identity/delivery settings remain accepted.
- Confirm captions and slide boundaries are derived from actual narration timing evidence.
- Confirm sync tolerance gate passes.
- Confirm external/YouTube publication locks remain active.

No Revision 6 paid render may be submitted until these gates pass and the Owner explicitly authorizes one render.
