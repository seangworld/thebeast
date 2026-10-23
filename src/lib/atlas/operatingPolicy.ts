// Owner backburner decision. Reactivation requires an explicitly approved code/release change.
// Preserve records and routes; restore a recurring cron only as part of that separate decision.
export const ATLAS_PAUSED = true;
export const ATLAS_PAUSED_MESSAGE = 'ATLAS is paused by the owner. Existing records and device settings are preserved. Reactivation requires a separate owner-approved release.';
