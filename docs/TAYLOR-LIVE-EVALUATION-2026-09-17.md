# Taylor live evaluation

Added individual scenario controls to the owner-only synthetic evaluation page, preserving the existing authenticated admin gate and fixed server-side catalog. Added two Taylor cases (four turns total): personable support under time constraints, correction and truthful statement drafting, original synthetic PDF interpretation with a conflicting-side entry and embedded instruction, and current VA research connected to the document. No real member records are loaded or written by these scenarios. No model override or arbitrary uploaded input is accepted by the evaluation API.

Local validation: seven catalog/boundary tests and changed-file ESLint passed. Production build passed. Live results will be recorded after deployment; execution completion alone is not a quality pass.

## Live finding

PR #143 deployed READY as 3369db1c3bb028ce7b8f6ec293bf61770d2f6296 (dpl_3FqpefHNtj5BwuntMwZncLjw15WU). The owner signed in through the secure browser sign-in flow. Health Advisor rendered the new controls and existing owner records; no health-record changes were made.

The personable veterans scenario was executed in production using only fictional data. Both turns stopped at semantic input verification, returning `semantic-verifier-unavailable` and the generic medical-boundary fallback. Production provider logs explicitly report HTTP 429, type `insufficient_quota`, code `credit_balance_exhausted`. This was an operational failure, not a capability pass. The second scenario was not run because it would hit the same exhausted balance.

Follow-up correction: invalid/unavailable semantic verification now returns the service-unavailable message instead of a misleading medical refusal. Evaluation completion excludes unavailable/timeout/malformed/inconsistent verifier results; UI explicitly distinguishes execution completion from answer quality and preserves partial results on exceptions. Safety verification remains fail-closed. The exhausted API balance must be restored before actual answer quality and original-PDF interpretation can be assessed. Original upload/storage selection is not yet tested end-to-end.

Correction validation: 28 targeted tests passed, including the exact provider-quota failure and incomplete-evaluation regression; changed-file ESLint passed. A clean production build passed after clearing a stale generated build directory that caused ENOTEMPTY during output cleanup.
