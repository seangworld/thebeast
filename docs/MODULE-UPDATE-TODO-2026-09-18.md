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
- [ ] Investigate intermittent provider timeout. The first attempt read the document in 67,842 ms, then research failed safely at the 60,000 ms provider deadline. PR156 now supplies stage-specific request references; further traced runs are needed to identify the failing stage. A successful retry does not establish this issue is fixed or guarantee a speedup.
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
