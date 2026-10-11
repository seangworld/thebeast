# BeastFusion Professional — authentic demo capture runbook

Status: internal preparation only. No footage recorded, no provider calls made, no publication authorized.

## Source of truth
Use the customer-distributed BeastFusion Professional installer/version verified on 2026-10-10, not the older `codex/commercial-runtime-boundaries-20261008` candidate. The latter documents a local setup UI but does not establish the final release feature set. Existing fixture: `examples/beastfusion-demo-workspace/` (PR #257). Do not claim that BeastFusion fixed the example until an actual run proves it.

## Capture prerequisites
- Use a separate clean copy of the demo fixture, outside production repositories and installation directories; initialize/commit the project if required by the released runtime.
- Verify the installed runtime's supported test invocation and editable file scope. The fixture uses `shipping.js`, `shipping.test.js`, and `npm test`; older first-job UI only accepts `.test.mjs` test paths and may therefore be incompatible. **Do not rename tests or change the released runtime blindly.** If the released UI does not support `npm test`, adapt a copy of the fixture to a supported `.test.mjs` file and confirm baseline before recording.
- Record product version, source archive identifier, and date privately; redact activation key, session token, local account paths, provider key, and billing details.
- No paid AI request without separate owner approval. A static guided tour may be recorded without AI execution, but label it accordingly.

## Demonstration narrative (2–3 minutes)
1. **Problem (0:00–0:20)**: In the isolated sample, $49.99 has $5.99 shipping, $50.00 incorrectly has $5.99 shipping, and $50.01 has free shipping. Show genuine baseline test output (one expected failing case).
2. **Scope (0:20–0:55)**: In the real installed BeastFusion UI, specify objective: `Fix free shipping at exactly 5000 cents without changing validation or member benefits.` Editable file `shipping.js`; read-only context `shipping.test.js`; run the test command supported by the installed release. Show explicit approval gates and budget limits without secrets.
3. **Execution (0:55–1:40)**: Only if separately authorized and actually run, show real Developer, test, and Reviewer evidence. Preserve unedited output. If not executed, label clearly `Guided interface tour — no AI job executed` and stop before claiming any result.
4. **Human decision (1:40–2:10)**: Show the actual Accept/Reject interface if present. Never imply that a candidate was accepted, merged, pushed, or deployed unless that happened and was verified.
5. **Offer (2:10–2:30)**: `$499 one-time per installation; customer supplies AI provider account and pays usage separately; 12 months of updates included.` Link `https://thebeast.seangworld.com/beastfusion/how-it-works`.

## Evidence checklist
- [ ] Released build identity and clean demo-project baseline recorded
- [ ] Actual runtime screenshots captured with all secrets redacted
- [ ] Actual bounded scope and approval controls captured
- [ ] Provider spending explicitly approved before any real AI execution
- [ ] Real job logs and reviewer/test outcomes saved if executed
- [ ] Claims reviewed against evidence; no simulated UI passed off as real
- [ ] Owner approves public footage/page changes before publication

## First-customer pilot
Use the existing `docs/commercial/beastfusion-first-customers-20261010.md` outreach pack. Select 10 individual technical prospects with a demonstrable need for review-controlled AI coding. Record only actual contact attempts, replies, objections, demo requests, and purchases. No scraping, mass mailing, outreach, paid advertising, or invented metrics. Evaluate message/channel after 10 genuine contacts; publication and sending require explicit owner authorization.

## Completion boundary
Engineering preparation is complete when a real, redacted tour or owner-approved executed demo is captured and checked against the released runtime. Marketing publication and prospect contact remain separate owner approval gates. Do not reopen licensing or installer acceptance tests.
