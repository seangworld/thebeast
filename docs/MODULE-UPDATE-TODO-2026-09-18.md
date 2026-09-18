# Module update checklist

## Owner action

- [x] Secure Beast test-browser sign-in succeeded. The previous login blocker is resolved; no further sign-in action is currently needed.
- Do not request passwords or verification codes in chat.

## Education

- [x] Released [PR153](https://github.com/seangworld/thebeast/pull/153), production commit `ae9ad12ff14900ba3f4db4211204942f698ceac9`, deployment `dpl_61e6x5GV2gQpuEVqC22syFv7668a` READY.
- [x] Counselor context includes discovery answers and record phase/date/source provenance; excludes archived, proposed and rejected profile records. Guidance respects available hours, budget, uncertainty and declined paths.
- [x] Correct status grouping for schools, certifications and funding; no substring-based award or active-credential inference. Recommended, Not awarded and Needs review remain visible.
- [x] Tutor context no longer invents a career or assessed mastery; retains learning preferences and zero available hours. Tutor identity stays distinct from Guidance Counselor.
- [x] Production build completed with 199 static pages. TypeScript compilation and 175 affected tests passed, including corrected stale infrastructure expectations.
- [x] Four signed-in production synthetic Education scenarios completed: adaptive planning/handoff, counselor injection boundaries, Tutor shown-work correction, Tutor integrity boundaries. Completion alone is not a quality pass; see findings below.
- [x] Signed-in Tutor, Schools, Certifications and Funding pages loaded. Existing records displayed; an uncertain certification appeared under Needs review. Funding empty state did not invent awards. These read-only checks do not exhaust every status fixture.
- [x] [PR154](https://github.com/seangworld/thebeast/pull/154) fixes a live teaching gap in both Tutor prompt paths: a request to use another first operation must be evaluated against the original problem. TypeScript and 24 existing tests passed; Preview build READY; merged as `6a4c5fe61a71dde4a66dda375b4f6fdeee9bacaf`.
- [x] PR154 production deployment `dpl_5BE1kNd4TBSYbPyrxPUTT2msbpiN` READY with the production domain. Alternative-method explanation succeeded in both post-release runs; the second run passed all four teaching steps (5.2–5.7 seconds per turn).
- [x] Investigated initial-review fallback and released a demonstrated wording-rejection fix in [PR156](https://github.com/seangworld/thebeast/pull/156). Natural error explanations and guided questions no longer require the previous narrow wording. All four production teaching turns passed afterward (5.0–7.6 seconds). The original rejected raw answer was not captured; this does not prove every intermittent fallback is eliminated.
- [x] Actual signed-in Tutor photo flow exercised with two synthetic worksheets in separate sessions. Readable image: identified the distribution error and guided correction without revealing the answer. Unreadable image: requested readable evidence without inventing a result, but used a generic fallback. Images are labeled synthetic QA; no personal facts were supplied. Conversation entries remain in the owner's test sessions.
- [x] Live counselor member-context check completed: accurately summarized saved career direction and college preference, distinguished a considered certification from an earned credential, and identified absent earned-credential records without fabricating them. No record-update proposal was shown. This was a visible conversational check, not a database-write audit.

### Education evaluation findings

- Planning adapted six weekly hours to three and shifted the activity mix to the learner's changed preference. Tutor handoff completed with entitlement rechecked and without copying source conversation, memory or records.
- Counselor did not explicitly explain the entitlement recheck in its answer, although execution verified it. A follow-up instruction now explicitly explains the access recheck, minimum learning context and no automatic copying of conversation/memory/sensitive records, without claiming execution prematurely. Release/live verification is recorded in the accompanying pull request; the underlying authorization boundary already passed.
- Counselor rejected injected instructions and did not guarantee admission or employment.
- Tutor identified the distribution error, recognized the learner's correction and supplied targeted practice without its solution. The alternative-method turn initially finished the existing intermediate equation instead of explaining a different starting method; PR154 addresses that gap.
- Tutor rejected injected instructions, declined to validate unseen work and declined answer-only assistance for a live graded test.
- No school applications, enrollments, external contacts, purchases or database migrations were performed. Dormant course delivery remains disabled. External program eligibility and links were not exhaustively verified.

## Health / Taylor

- [x] [PR152](https://github.com/seangworld/thebeast/pull/152) released as `6d334bb11d18d25d860a75719e448bf73ecc6fa8`; production deployment `dpl_EJsEM1JGuFKrxH88RUyVdKvtzQ3W` READY with the production domain.
- [x] 35 combined Health/runtime/latency/Education-context tests passed before release. Exact GPT-5 bounded drafting and research planning are tuned; clinical analysis, final research synthesis, model selection and safety checks are unchanged.
- [x] Production synthetic personal-statement scenario completed. Draft took 49,298 ms versus prior 64,185 ms (about 23% lower in this single sample; not a guaranteed improvement). Initial next-step answer took 68,393 ms.
- [x] Draft preserved corrected 2005 onset and unknown month. Missing details remained explicit blanks; no invented active-duty status, continuous symptoms, medical nexus or filing.
- [x] Original-document/research retry completed: document reading 32,167 ms; research 87,312 ms versus previous 109,713 ms (about 20% lower for this successful sample). Answers preserved page references, diagnosis, missing service/nexus evidence, right-ankle/left-knee distinction and no filing. Research linked official VA and eCFR sources and mapped the three direct-service-connection elements to the fictional letter. VA source content was independently checked; detailed regulatory subclaims were not exhaustively audited.
- [x] Traced the repeated timeout to external evidence retrieval: reference `99aa8e24-ced2-41dd-8079-567f095d88e7-research-in-context-research`. Original-document reading completed in 59,700 ms; retrieval hit the 60-second provider deadline. This was not a document-reading or final-synthesis timeout.
- [ ] Validate the targeted retrieval adjustment in PR157: exact GPT-5 Health evidence retrieval uses medium rather than high search context and a bounded 90-second provider allowance. The overall member request deadline remains 170 seconds, with caller cancellation, required web search, allowed official domains, citation checks, final synthesis and safety validation retained. No model change or automatic retries. This is a reliability adjustment, not a guaranteed speedup or proof that provider timeouts are eliminated.
- [x] PR156 refined clinician-question wording to request an independent opinion about whether evidence supports a relationship, including contrary evidence and uncertainty, rather than assuming a favorable nexus conclusion. No filing functionality was added.
- Veterans assistance is explanation, evidence organization and truthful preparation only. No filing or submission.

This is the working checklist for this module pass, not the platform-wide roadmap. Production observations use approved synthetic scenarios unless explicitly identified as read-only member UI checks; no member details are included here.

## Reliability follow-up released — PR156

- Natural-language review regression reproduced: valid explanations using “the mistake happens” and guided questions could fail narrow word checks. The guard now recognizes these forms while still rejecting unsupported “looks fine” responses and preserving contract/semantic checks. The original rejected model text was not captured, so this is a demonstrated failure mode, not proof of that exact incident's cause.
- Review failures now acknowledge an incomplete review instead of blaming the student for missing readable work. Insufficient-evidence fallback requests a clearer image without implying dishonesty.
- Taylor instructions now ask for an independent clinician assessment, including contrary evidence and uncertainty, without requesting a predetermined favorable opinion.
- Owner synthetic evaluations now attach unique per-turn request IDs, preserve plan/research/synthesis suffixes in provider errors, and display sanitized error category/reference. No raw prompts, credentials or member data are added to diagnostic output. Timeout limits are unchanged; intermittent timeout resolution is not claimed.
- TypeScript test compilation and 56 targeted capability, Health, runtime and Tutor tests passed. Production deployment `dpl_6mWLysnbXYx78Kq8ofSQuYu5tiZ5` READY, commit `d8869528a1b87a68bd142b234855075a3c87b2a4`; all four post-release Tutor teaching turns passed without validation failures.
- Handoff-clarity follow-up: TypeScript and 60 targeted tests passed. This changes explanation only; it does not broaden access or copy additional member context.

## Traced follow-up after PR157

- PR157 deployed as `b8a2b3478f0c6b4164ab9a86284049a9991a1d13`, deployment `dpl_2K8yK3oGY2SN5gLT6tLCno5bHy9v` READY. All 72 targeted tests passed before release.
- Live handoff execution still correctly rechecked access and copied no source conversation/memory/records, but semantic output verification rejected the explanatory responses as protected-instruction disclosure. Follow-up classifier guidance explicitly distinguishes public product/privacy explanations from hidden prompts, secrets, internal access configuration and bypass instructions. No deterministic bypass or removal of semantic validation is introduced.
- The next Health run failed in `read-original-plan`, reference `eefb1dfe-f1ee-4ff0-b316-3441f4d90610-read-original-plan`. This shows the intermittent 60-second bound can affect original-document planning too, not only web retrieval. A targeted 90-second document-planning allowance applies only to GPT-5 Health requests with attached originals. Overall member deadline and cancellation remain unchanged; there are no automatic retries or model changes.
- These are bounded reliability corrections requiring live validation, not a claim that all provider latency is resolved. Rollout and post-release results are recorded in the accompanying pull request.

## PR158 verification and bounded research follow-up

- [x] PR158 production `88f223299052897a12b7e282c31aba168836071a` passed the remaining Education handoff check: both counselor turns passed validation, access was rechecked, Tutor was invoked, and no source conversation/memory/records were copied. The signed-in Education checks for this module pass are complete.
- [ ] Taylor research remains unresolved: original-document reading completed in 75,635 ms, but external research hit the 90-second provider timeout (`ab578df4-6a6c-40a6-a0cc-0ed2525f8034-research-in-context-research`). Extending the allowance did not resolve it.
- Follow-up limits exact GPT-5 Health evidence retrieval to three built-in tool calls and a concise evidence brief. Unsupported questions must remain explicit gaps. Required search, official domain restrictions, source attribution, private-context separation, final synthesis, safety checks and the 170-second member deadline remain in place. No automatic retries or further timeout increase. Local and live verification are recorded in the accompanying PR; a tool-call cap alone is not a latency guarantee.
- API reference: https://developers.openai.com/api/reference/resources/responses/methods/create (`max_tool_calls` bounds total built-in tool calls).

## PR159 live result and veterans validation scope

- PR159 is live as `2e7f30831dee7fae35b204ad2a9a8f5c8c588fec`. Document reading completed in 78,905 ms; the research turn finished in 127,638 ms without a provider timeout, but semantic output validation returned `other_boundary_violation` and the answer was replaced with a generic fallback. This is not a research quality pass. The rejected candidate is not retained in the visible evaluation.
- Inspection found a scope mismatch: Taylor's advisor explicitly permits veterans preparation, but the independent classifier described Health as health information only. The follow-up aligns its scope with already-authorized decision-letter explanation, official requirements, evidence organization and truthful preparation. It continues to reject filing, submission, representation, guarantees, invented evidence, medical nexus conclusions and predetermined favorable opinions. No unsafe-verdict bypass is added. This is a demonstrated instruction mismatch, not proof of the specific rejected answer's cause.
- Production verification of the aligned scope remains pending; see the accompanying PR for release and live results.

## BeastOS core pass — September 18

- Home sample learning count and household alerts removed; actual Personal Hub link and Director entry point corrected.
- Home and Relationship Center failure states offer retry.
- Dashboard no longer claims that unsent local action requests changed source records. Members use each item's workspace link to edit its status/date.
- Director context filters deleted goals/documents and unavailable Money/Health records and summaries; member goals remain aspirations.
- Director pending-turn controls prevent repeated browser submissions and cross-thread placement of failed questions.
- Details and validation scope: `docs/BEASTOS-CORE-PASS-2026-09-18.md`. Release evidence is recorded in the accompanying PR.
- [x] Owner confirmed a test notification arrived on his iPhone on September 18. This verifies phone test delivery, not a scheduled bill or new-message event.
- Notification setup follow-up: restore this installation’s saved preferences, show connected status, make customization/device management optional, identify test destinations, and preserve browser subscriptions on save failures. Existing similarly named installations are not automatically deleted.
- [ ] Observe an actual scheduled bill reminder and a new-message notification end to end.
- [ ] Signed-in visual review of the revised setup and BeastOS core pages; automated interaction tests cover saved preferences, updates, test targeting and retry.

## Cashflow Expenses Ahead follow-up

- Replaced Bills Ahead with one Expenses Ahead table ordered by due date, showing bill amounts and remaining debt minimums for the next 30 days. Shared occurrence calculations handle recurring dates, partial payments, reversed payments, archived/paid-off records and month boundaries.
- Updated Cashflow's 7-day/30-day summaries and due-soon alert to use the combined expenses.
- Calendar, notification list and device reminder digest now include eligible debt minimums alongside bills, with owner/module checks and existing reminder opt-outs preserved. Private lock-screen text remains generic. The digest retains its existing daily delivery key to prevent a second same-day send after release.
- No payment, balance, due-date, income-pot or bank changes are performed by these views. Future projected cycles have no income-pot assignment unless saved for that occurrence.
- Validation and production release status are recorded in the accompanying pull request.
- Money briefing/autopay follow-up: issue #170. Whole-row dragging and Save/Undo: issue #171; Undo must reverse exactly one most-recent movement per click, including both affected pots.

- Payoff Plan what-if custom order now supports whole-row drag highlighting, explicit drop positions, cancel without reorder and numbered-position fallback. Preview changes still require the existing copy-to-settings and save controls; no automatic financial writes.
- What-if comparison starts with the current page strategy when supported; every card and its retained Review button select the payment preview. Current settings are also selectable. Preview selection is explicitly separate from saving the strategy.
