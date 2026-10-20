# Taylor source-list correction — October 20

Issue #270 / PR #271. The independent reviewer found an unrelated 38 CFR 21.86 citation in the research metadata. The final answer omitted it, but the Health reader displayed all retrieved sources.

The runtime now returns only retrieved URLs cited in the final delivered Health answer, after grounding and safety processing. A shared pure filter also runs in the live and restored Health conversation adapters, so previously persisted unfiltered source lists do not display uncited links. Whole normalized HTTP(S) URLs must match; substring/lookalike matches, malformed/credential-bearing URLs and duplicates are rejected. Query strings and fragments are preserved. Markdown delimiters and prose punctuation are handled without removing balanced URL parentheses.

Health research provenance now distinguishes retrieval from citation and no longer asserts that every retrieved page supports the response. Citation membership is not semantic fact-checking: a wrongly cited source can still be irrelevant. This change addresses the demonstrated uncited-source defect, not arbitrary source entailment.

The regression reuses the original published H-C response and metadata without changing them: four retrieved links become exactly three cited links, excluding section 21.86. Mocked runtime coverage verifies filtering after final synthesis and neutral provenance. The legacy saved-answer adapter also filters against its actual rendered prose sections; an unrendered field cannot authorize a citation. Behavior coverage verifies persisted payloads are unchanged. Adapter wiring covers live/restored answers; no UI layout or database migration changed.

No paid inference, ledger reset, historical evidence edit, production member-data operation, merge or deployment. Validation and independent follow-up review results are recorded in the PR comment for the published candidate.

The separate reviewer confirmed the concrete source-list defect and legacy restoration gap are resolved, with no remaining material finding within this scope. The reviewer inspected tests without executing them. The implementation run passed all 2,517 tests (five new source-filter tests); final build/type/security results are in the candidate verification comment.
