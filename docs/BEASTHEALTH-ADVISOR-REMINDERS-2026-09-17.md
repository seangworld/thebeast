# Health Advisor and vaccination reminders

Taylor Brooks now has the Health & Veterans Information Advisor title and expanded capability descriptions. The existing advisor supports appointment preparation, records review, potential medication interaction review, vaccination dates, and veterans evidence and personal statement preparation. This release does not change the model or confer clinical or VA accreditation. No claim filing or submission is supported.

Added editable task starters, recorded vaccination date reminders in the advisor and Notifications, and private calendar downloads with seven-day and same-day display alerts. Dates come from saved records, never an inferred clinical vaccination schedule. Calendar files exclude vaccine names and medical notes; imports are snapshots and calendar applications control alert delivery. Direct email and push delivery are not enabled.

The reminder API checks membership and Health entitlement and queries only the authenticated owner's nonarchived records. Incomplete lists fail explicitly. No database migration or paid service was added.

Validation: TypeScript and changed-file ESLint passed; 18 focused tests passed, including date boundaries, invalid/archived records and calendar privacy; production build passed. Signed-in browser flows, actual calendar imports and live AI answers were not exercised this turn.

Production confirmation: PR #141 merged as dde44aeaa90809b719a7f5dd752c04da33be0bab. Vercel deployment dpl_GbqdaH5wS4ELdk2qFPufbfJmWvDy reached READY with thebeast.seangworld.com assigned and no alias error. Unauthenticated production GET /api/health/reminders returned HTTP 401 with no health data. This confirms deployment and the unauthenticated boundary, not a signed-in end-to-end test.
