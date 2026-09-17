# BeastHealth vaccinations and advisor assistance

Scope confirmed by Sean: Health Advisor also provides veterans assistance. No filing or submission functionality, now or in future. Claim preparation is member-reported context, not a diagnosis. Uploaded medical facts must remain reviewable proposals with provenance and conflict handling.

## This release

- Vaccinations page: name, dose, received/planned/unknown status, date received, next-dose date and its source, provider/location, source document selection, notes, editing, and on-page due reminders.
- Uses owner-scoped existing Health records as procedure/vaccination subtype. Recognizes earlier profile/conversation and document-extraction vaccination entries. Preserves extraction provenance. A generic date extracted from a document is not assumed to mean date administered.
- Optimistic concurrency via owner/id/updated_at, stable insert UUID on uncertain retry, double-save locking, save readback, preserved draft on errors, and explicit discard. No automatic booster schedule or email/push delivery.
- Advisor Veterans assistance selector loads only the selected saved claim from the server with authenticated owner filtering. Existing health context remains available. Prior conversation context persists; turning the selector off does not erase earlier messages.
- VA added to allowed authoritative research domains. Prompt scope covers truthful statement preparation, evidence gaps, exam preparation, and explaining supplied records. No filing tools exist.
- Medication review shortcut prepares an editable request for current-source review. Interaction requests force evidence research, using de-identified, model-selected drug queries where available. This is evidence-assisted conversation, not a comprehensive drug-interaction database or clinical clearance.
- Health canonical context expanded from 20 to 200 records through both loading and prompt construction, plus the selected claim. Reaching the bound marks context incomplete. No automatic background scans or extra agents.
- Conversation vaccination proposals save consistently as procedures and preserve explicitly provided administration dates.

## Verification

- TypeScript, changed-file ESLint, focused vaccination/claim/persistence/runtime/UX tests and additional runtime safety/streaming tests.
- Production build and deployment status tracked in release follow-up.
- Read-only production policy inspection confirms owner predicates for Health records and veteran claims; no schema changes required.
- No authenticated browser or paid live AI-response validation performed. Unit/runtime contract tests do not establish medical accuracy or clinical completeness.

## Still required for document workflow

The existing document extraction workflow requires pasted selectable text, recognizes labeled facts only, and is restricted to the admin owner through both API and RLS. Universal member-upload parsing/OCR, structured document reconciliation with existing records, and appropriate member entitlements need a separate implementation. Do not describe this as automatic analysis of every veteran upload. The current advisor can discuss supplied text and saved records; selecting a document reference does not read its file contents.

Email/push vaccination reminders and automatic guideline-based personalized schedules are not implemented.
