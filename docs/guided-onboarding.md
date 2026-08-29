# Guided onboarding

`BO-UX-001` provides the reusable first-use walkthrough architecture for Beast and its modules.

- Definitions live in `src/lib/guidedOnboarding.ts` and carry a stable ID and semantic version.
- The dashboard mounts `GuidedTour` after authenticated access resolves.
- Progress is scoped to member ID and tour ID. Completed and skipped tours do not replay until their definition version changes.
- Members can replay the current tour from **How to Use Beast / Take the Tour Again**.
- Steps may target stable `data-*` hooks. Missing optional targets fall back to a centered explanation instead of trapping or breaking the member experience.
- The modal supports Escape, contained Tab navigation, focus restoration, Back, Next, Skip, Finish, and a progress indicator.
- Existing privacy-bounded analytics record replay, continuation, dismissal, and completion without storing tour text or member content.

The first contextual definition covers the Guidance Counselor. Future modules should add definitions to the same architecture rather than creating parallel tutorial systems.

Success is evaluated after an appropriate measurement window using aggregate tour starts/replays, completions, dismissals, and subsequent module discovery. No student content is collected for onboarding measurement.
