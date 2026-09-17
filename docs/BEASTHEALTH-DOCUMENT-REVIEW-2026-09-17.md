# BeastHealth member document review

## Implemented

Health uploads can opt into PDF/image analysis after upload, with explicit disclosure that the selected original file is sent to OpenAI. Existing files can be processed from Health Documents. Supported inputs: PDF, PNG, JPEG and WebP up to 10 MB. Other formats can use pasted text. The pasted-text path stays local and recognizes labeled facts; it does not call AI.

The original file remains in BeastDocuments. Extraction creates review proposals, never automatic profile writes. Each approval requires an individual record name, current/historical/planned status, evidence type (documented, claimed, member-reported, uncertain), and optionally a confirmed event date. A generic document date is not automatically promoted to an administration/procedure date.

Members can create an individual record or attach evidence to an existing compatible record. Exact-name duplicates are blocked server-side. Existing fields and status are preserved; missing context/date/source can be filled and new document evidence is attached separately. Conflicts require member review, not automatic replacement. Source excerpts and source document IDs remain attached; the review offers the original file for download.

Processing uses a per-member request lease, persistent per-file fingerprint/version lock, and fail-closed response validation. It rejects unrecognized signatures, oversized files, incomplete provider responses and proposals without excerpts. Failed processing does not delete the upload or create profile records; failed/stale runs can be retried. AI transcription is fallible and the UI requires comparison with the original. This is not a medical diagnosis, medication change, or VA filing feature.

## Database

Existing extraction tables are retained. Live DEV and Production already had owner-only RLS; the older API still restricted processing to admins. The new endpoint uses member Health entitlement checks. Policies now additionally verify ownership of the referenced source document/extraction. The new security-invoker approval RPC validates ownership, ready status, evidence type and concurrency, serializes same-owner approvals, and atomically creates/attaches the health record and marks the proposal approved. Stale approval clients must refresh.

Migration name: `member_health_document_review`.

- Repository / DEV migration version: `20260917162948`.
- Production recorded version: `20260917163117`.
- Identical SQL applied through the session-authorized connected workflow. Do not replay this SQL or automatically repair the version mapping; reconcile histories before a future CLI push.

## Verification

Synthetic cloned-table transaction in DEV passed idempotent approval, duplicate rejection, stale-write rejection, preserved status/context, claimed-evidence provenance and cross-owner read/approval isolation; full rollback confirmed with no leftover test schema. DEV security advisor returned no finding specific to this change. Member execute permission and no anonymous execution verified in DEV. Production policies confirmed after application.

27 focused tests cover file signature/size checks, mocked provider input and malformed responses, extraction, vaccination, advisor and persistence contracts. Production build, TypeScript and changed-file lint used as release gates. No real patient files sent for testing, no paid live provider validation, and no authenticated browser check performed.

## Remaining

Email/push vaccination reminders. Automatic personalized vaccine schedules are not implemented. File analysis is opt-in, not silent scanning of every upload; long/unreadable/unsupported files need a smaller readable input or pasted text. Medical extraction accuracy requires real-world member review.

Follow-up migration `health_document_repeat_events` allows distinct known event dates for vaccinations/procedures, appointments and measurements with the same name; same-date or unknown-date duplicates remain blocked. DEV version `20260917163328`; Production version `20260917163335`. Clone/rollback verification additionally passed separate dated vaccine doses and rejection of a duplicate same-date dose. Both migrations are intentional forward migrations, not edits to applied SQL.
