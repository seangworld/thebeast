# BeastOS core member-experience pass

This pass covers BeastOS Home, the shared Dashboard action controls, Director context/conversations, and Relationship Center. It follows the Calendar/Notifications/Messages release in PR167.

## Changes

- Home no longer displays a hardcoded learning activity count or fixture household invitation/sharing alerts. Household access links to saved Personal Hub details. Ask AI opens the Director instead of a non-existent Search anchor.
- Home query failures are visible and retryable instead of being treated as an empty, healthy snapshot.
- Dashboard source-item controls previously built local request objects and claimed changes were sent without dispatching or saving anything. Those controls are removed. Existing workspace links remain, with clear instructions to change status/dates at the source. This does not implement cross-module snoozing, completion, or rescheduling.
- Director context excludes deleted/archived goals and deleted documents. Goals remain explicitly aspirations, not achieved facts. Money/Health records and specialist summaries are gathered only when the current member has module access. A missing/unavailable source is identified rather than treated as having no items.
- Director browser submissions have a synchronous pending guard. History/new-thread controls prevent switching while a turn is running; failed pending questions are cleared when moving to another conversation. This guards repeated clicks, not cross-device server idempotency.
- Relationship Center has retry recovery and clearer member wording.

## Validation

- Automated context tests cover deleted/other-member goals, module-access filtering, and partial source failure.
- Rendered Director tests cover repeated submission attempts, pending history controls, and failed-question isolation between threads.
- Existing tests are updated to assert real source links instead of the removed simulated-dispatch interface.
- No database migration, model change, member record modification, or synthetic AI conversation is required for this pass.
- Browser/CDP availability remains the limitation on a signed-in visual check. Notification permission and physical-phone receipt from PR167 remain a separate owner check.
