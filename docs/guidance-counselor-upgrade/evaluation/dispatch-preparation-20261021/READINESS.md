# Jordan — executable DEV assessment prepared, not authorized

October 21, 2026. Issue #272 / draft PR #273 / existing branch `codex/guidance-counselor-audit-20261020`. Remote head was checked first: `e4aa8091195583b4198da2db0642c60d35e1eb6b`; no newer overlapping comments/work were found. Codex remains executor. Read AGENTS.md and all five requested evaluation documents. The historical preparation documents and both scenario packets remain unchanged.

## Current execution environment

An isolated local worktree uses the existing, owner-authorized private DEV credential workflow. Key existence/permissions and two free model metadata requests were checked without printing or changing the credential. Both `gpt-5` and `gpt-5.6-luna` returned HTTP200. This proves account visibility at the recorded time, not that a future inference request cannot fail. No paid inference or application auth bypass occurred. No credential setup is needed from the owner. No production credentials/configuration were copied.

This is a dedicated synthetic runtime process, not a hosted owner browser test. It uses no customer session, database or record-writing adapter. Normal navigation/access checks are represented by the actual runtime outputs; no hosted Tutor session or deployed DEV integration is certified. The launcher loads only the existing DEV API key into child memory, clears unrelated model overrides/production credentials, and selects the source's standard fast/strong defaults. It does not change any hosted setting or Taylor process, budget or ledger.

The compiled runtime was rebuilt in this fresh worktree using `npm test` / `tsc -p tsconfig.test.json`; no prior .test-dist was reused. The installed dependencies were reused only after both lockfile SHA256 values matched. The manifest pins actual source and compiled-file fingerprints, published application source tree, fixtures/rubric/baseline and every dispatch script hash. `--check` verifies these and effective model selection before any provider transport. Recompilation must reproduce the pinned bytes or require a reviewed refreeze; it cannot silently substitute a stale runtime.

A preparation verifier portability bug referred to unpublished local commit73187630. It now checks published equivalent candidate `cc98fcb77b476e5b63919126628cbfe574d8856e` instead; the actual application src tree remains `0e324f52da4ad50b24a16b442ee97a199cea525b`. Application source and frozen acceptance criteria were not changed.

## Exact proposed dispatch

See [dispatch-manifest.json](dispatch-manifest.json), the final manifest SHA in [preflight.json](preflight.json), and [model visibility receipt](model-availability.json).

- Seven families / eleven revision2 turns /24 unique role-specific criteria. Revision1 and revision2 hashes remain fixed. No live answers, grades or competency claim.
- **Proposed maximum $10 total estimated API spending;88 attempted inference calls,90 total direct provider requests including the two already completed free metadata GETs.** Normal estimate53 inference calls if only the four explicit research turns research; not a guaranteed count. Maximum8 inference calls/turn. Failed/uncertain attempts count; no retries, restart or second cycle.
- Existing routing: Luna `gpt-5.6-luna` for GC01/02/03/06/07; GPT5 `gpt-5` for GC04 and all GC05 turns. Allowed GPT5 returned identities include `gpt-5-2025-08-07`; actual returned IDs must be captured, not preclaimed.
- Medium reasoning explicitly inserted for previously omitted effort; existing GPT5 semantic input/output Low retained. This pins the evaluation configuration and is disclosed as an evaluation-only difference. No model upgrade or production setting change.
- Output ceilings:4,800 tokens for plans/synthesis/semantic checks; existing1,400 for private brief/review and3,600 for public discovery/verification. Only `web_search`; at most4 actions/request,8/turn,88 across assessment. Other tools/unknown costs rejected.
- Each request <=100,000 serialized bytes before provider streaming flag; flag adds at most14 bytes. No stored provider conversation; all genuine context is visible in captured request bodies.
-170-second turn deadline; existing60-second streaming plan/synthesis timeout,25-second private phases,45-second public phases. Nonstreaming semantic checks receive the same170-second turn abort signal. Timeout or unknown usage retains the entire maximum reservation and stops the assessment, with no retry.
- New private identity `gc-20261021-pr273-assessment-v2`; exclusive new0600 ledger inside0700 directory. No ledger created during preparation. Unknown reservations cannot be implicitly resumed. Raw received payloads, timings, returned IDs/usage, original requests, actual tool traces and delivered RuntimeResult/state are durably recorded. Missing usage stays unknown, never zero.
- Fresh history/state per family; preserve the clearly labeled erroneous GC03 assistant seed, and all actual preceding delivered replies/returned state on follow-ups. Proposals are inspected, not applied to member records. No authored successful replacements.

### Pricing and maximum reservations

Official [GPT5 rates/limits](https://developers.openai.com/api/docs/models/gpt-5), [Luna rates/limits](https://developers.openai.com/api/docs/models/gpt-5.6-luna) and [tool pricing](https://developers.openai.com/api/docs/pricing) were fetched October21. Policy expires **October23,2026 at04:00UTC / midnight EDT**; an expired policy blocks dispatch and requires reviewed pricing/refreeze before approval can apply.

GPT5 base input/output: $1.25/$10 per million tokens;400k context. Luna base: $.20/$1.20;1.05M context. Conservative Luna rates are $.55/$1.98 per million: long-context2x input/1.5x output,1.25x cache-write input and10% regional allowance; no cache discount, no12-hour retention requested. Web-tool reserve $.01/action plus all retrieved-content input at model rate. Standard global Responses endpoint/default service tier only; unpriced models, tiers, tools or usage halt.

| Per-call maximum reservation | GPT5 | Luna |
| --- | ---: | ---: |
| No tools,4,800 output |$0.548 |$0.587004 |
| Private phase,1,400 output |$0.514 |$0.580272 |
| Public phase,3,600 output,4 tools |$2.576 |$2.934628 |

Reservations include a full context for every possible tool step, output and maximum tool fees. Settlement uses actual input/output at conservative rates without cache discounts and retains maximum tool fees. The worst-case sum if all53 expected calls consume their artificial maxima is **$45.815084**; the universal88-call schedule is **$99.132712**. These are not proposed spending or predictions: **the $10 hard guard stops before any next reservation would cross $10**, and may leave assessment items NOT TESTED. No reliable measured Jordan cost/latency forecast exists yet; Taylor spending is not substituted as one. Passing all11 turns within $10 is not guaranteed. Record actual estimated costs separately from the provider invoice.

## Verified no-cost checks

- Fresh application suite:2,523/2,523 PASS; zero failures/skips. Compiles runtime before tests.
-15/15 guard/integration checks PASS: three-call ordinary and full eight-call researched mock flows; reservation before transport; stop after prior settlements before a cap crossing; attempted/per-turn limits; duplicate IDs/turns/ledgers; unknown model/pricing/usage; uncertain response retained; timeout; concurrent unresolved calls/session overlap; durable delivered answer/state; exact private approval required; genuine follow-up context.
- Both preparation packets and24 criteria verify; published source identity matches. Offline executable dispatch/model/hash check PASS.
- Lint, sequential TypeScript and required `npm run build` PASS. Security gate unchanged: full audit zero vulnerabilities,22/22 maintained-braces tests pass. No gate bypass. This run built locally with public DEV config only and no provider/service-role credential.
- Diff/syntax/JSON checks pass; no application changes or unrelated refactors. Mocked results are mechanics evidence only.

## Remaining source/evidence limitations

The [original source baseline](../preparation-20261020/SOURCE-BASELINE.md) and [grading rules](../preparation-20261020/GRADING-RULES.md) stay frozen. October21 recheck: [TCC program page](https://www.tcc.edu/programs/information-systems-technology/) is accessible, but its linked Network Administration catalog returned403. No challenge bypass. Exact catalog prerequisites remain unverified; Fall2027 fee/application-cutoff details and AZ-900 regional price also are not established by the existing baseline. The Microsoft [renewal policy](https://learn.microsoft.com/en-us/credentials/certifications/renew-your-microsoft-certification) still explicitly exempts Fundamentals certifications from expiry. This is evaluator preparation, not Jordan's research evidence.

Useful retrieved authoritative facts must still be demonstrated during the run. A generic refusal does not pass research success when other official evidence is available. Unavailable specific facts must be labeled unverified; honest incomplete evidence is graded per the unchanged rules. Validate any new authoritative evidence before grading. CompTIA, full education-document/roadmap access and hosted integration remain outside this assessment. Privacy/source ownership checks are model-assisted, not absolute or independent certification.

## Approval and exact next action

**Owner decision only:** approve or decline this single fixed eleven-turn DEV assessment, **88 attempted inference calls / $10 maximum**, no retries;90 direct requests including the2 already completed free metadata checks. No additional cycle, merge or production deployment. Do not create an approval receipt before actual owner authorization.

After direct approval, record a private0600 JSON receipt with `owner:Sean`, `approved:true`, the exact `manifestSha256`, `capNanoUsd:10000000000`, `maximumInferenceAttempts:88`, and `runId:gc-20261021-pr273-assessment-v2`. This is an execution record of the owner's authorization, not a replacement for it. The script refuses a missing, changed, world-readable or unapproved receipt. Run from this worktree:

```sh
npm test
node --test scripts/test-guidance-evaluation-budget.mjs
node scripts/verify-guidance-evaluation-preparation.mjs
python3 scripts/run-guidance-evaluation-dev.py --check docs/guidance-counselor-upgrade/evaluation/dispatch-preparation-20261021/dispatch-manifest.json
# Only after owner authorization, with its private receipt:
python3 scripts/run-guidance-evaluation-dev.py --execute docs/guidance-counselor-upgrade/evaluation/dispatch-preparation-20261021/dispatch-manifest.json /absolute/private/owner-approval.json
```

Stop on any guard/runtime failure; preserve all receipts and unfinished evidence. Export ungraded packets before executor grades; independent review remains pending, not claimed. Keep criteria fixed and report material readiness failures regardless of score. No paid call, new live competency grade, merge or deployment occurred in this preparation.
