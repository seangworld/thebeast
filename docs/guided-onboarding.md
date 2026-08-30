# Guided onboarding

`BO-UX-001` provides the reusable first-use walkthrough architecture for Beast and its modules. `BO-UX-003` extends that architecture with route-aware module definitions; it does not create a second onboarding system.

- Definitions live in `src/lib/guidedOnboarding.ts` and carry a stable ID and semantic version.
- The dashboard mounts `GuidedTour` after authenticated access resolves.
- Progress is scoped to member ID and tour ID. Completed and skipped tours do not replay until their definition version changes.
- Members can replay the current route-appropriate tour from **How to Use Beast**, **How to Use BeastMoney**, **How to Use BeastHealth**, **How to Use BeastEducation**, or **How to Use BeastHome**. When needed, replay returns the member to the tour's real entry surface before opening it.
- Steps may target stable `data-*` hooks. Missing optional targets fall back to a centered explanation instead of trapping or breaking the member experience.
- The modal supports Escape, contained Tab navigation, focus restoration, Back, Next, Skip, Finish, and a progress indicator.
- Existing privacy-bounded analytics record replay, continuation, dismissal, and completion without storing tour text or member content.

The initial module definitions cover the released BeastMoney, BeastHealth, BeastEducation, and BeastHome experiences. Existing Guidance Counselor, AI Tutor, and Home Inventory definitions remain contextual extensions of the same engine. BeastGoals and BeastDocuments are shared platform foundations rather than released standalone modules, so BO-UX-003 does not manufacture separate tours for them.

Definitions distinguish `initial` onboarding from `whats_new`. A What's New definition uses its own stable ID and semantic version, so it never resets or replays the original module tour. What's New is manual by default and may be automatically offered only when a future material release explicitly opts in; trivial releases should not add or trigger one.

Route selection occurs only after authenticated dashboard access resolves and is filtered by the member's eligible module navigation. Tours never grant access, replace module authorization checks, or expose Coming Soon functionality.

Success is evaluated after an appropriate measurement window using consented aggregate offers, starts, replays, completions, dismissals, optional What's New use, and subsequent module discovery. Events contain only stable tour/category/status identifiers. No student, financial, health, home, identity, conversation, document, or tour-text content is collected for onboarding measurement.
