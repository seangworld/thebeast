# Money Coach consolidated intelligence upgrade

Tracking #268. Sole engineer Codex. Development branch `codex/money-coach-intelligence`, based on released main `8b199938`. Production/Avery credentials, release evidence, approval requirements and security fork are preserved. No paid model call is authorized or executed; no production migration, merge or deployment is included.

## Baseline and corrections

Money Coach already has authenticated owner-scoped financial context, persistent conversation/state/memory, authoritative-source research, existing input/output semantic safety classifiers, deterministic cash intelligence, debt strategy and retirement engines, approval-governed knowledge proposals, and Avery's saved cash review with snapshot/revision/lease verification. Existing tools in model output are requests, not execution receipts; actual saved cash/payoff calculations arrive as canonical context. There is no arbitrary model-driven payment/external financial tool.

Confirmed and corrected:

- Explicit one-time income had a monthly normalization multiplier of 1 and repeated in dated cash forecasts. It now contributes zero recurring earnings and at most one dated inflow. Existing every-two/three/six-month amounts normalize to the matching monthly fraction. No saved record is silently reclassified.
- A recurring reimbursement/refund/one-time label is surfaced as disputed; it is not assumed to be a guaranteed recurring income stream. Affordability certification is withheld pending source confirmation. Explicit one-time records remain usable as a dated inflow.
- Unknown/invalid financial amounts are not certified as zero. Current cash, reserve, income timing, recurrence, APR and source-date limitations are explicit. Missing APR blocks a debt comparison without discarding otherwise valid cash arithmetic. Zero values stay known zeros.
- A bounded **adapter around existing engines**, not a duplicate engine, supplies canonical minimum/snowball/avalanche comparison receipts, dated cash shortages and a reserve-constrained extra-payment amount. All records contribute to calculations, while supporting display/model samples remain capped. Retirement supporting rows can no longer be starved by the preceding record categories.
- A Money-only `financialAnalysis` response contract binds numeric claims to exact current canonical field paths/values, records alternatives/uncertainties, and rejects unconditional support for incomplete/disputed context. Rejected recommendations suppress proposed side effects and research. Numeric consistency is not a semantic financial-judgment grade.
- Money's prompt requires objective-focused interpretation, practical comparisons, recognition of stale/contradictory evidence, explicit correction, savings-vs-aspiration and borrowing-vs-income distinctions, and no fabricated completion or consequential action.
- Zero-growth retirement projections now retain annual contributions across the planning years rather than dropping them.
- Money-only inference bounds: one plan call, no automatic retries, 4800 plan/synthesis output tokens, 1200 per existing safety verifier, 96,000 input characters and a 60-second overall deadline. Ordinary analysis retains both independent input/output safety classifiers (up to three provider calls). Current-information retrieval is capped at two web tool calls/1800 output tokens; personal synthesis uses the existing private-context synthesis path, with financial evidence validation, for at most five provider calls. External research receives a public topic/year, not a member's name, account numbers or balances. No research calls are approved for the proposed competency assessment.

Avery's closed capability registry, assignment store, explicit approval, source snapshot verification, correction/recovery, cancellation fence and persistent checkpoint history remain. The existing cash review now returns the same financial assessment and cannot verify affordability against disputed recurrence/missing material inputs. No broader Director tool or autonomous specialist capability is introduced.

## Honest financial limits

A canonical match proves arithmetic against supplied saved records, not bank verification or correct AI judgment. Current source tables do not expose promotional APR expiry/post-expiry/deferred-interest schedules. A promotional record must not receive a certified expiry-aware payoff forecast; ordinary comparisons remain conditional on constant saved APRs. Payment-history reconciliation, all living expenses/pending bank transactions, balances without independent update timestamps and market/tax facts remain explicit limitations. Do not promise investment returns, loan approval, benefit eligibility, withdrawal safety or a retirement date.

Model-selected findings/interpretations can still be wrong even when cited numbers match. Independent semantic grading is a release blocker. The prepared scenarios are not claimed independently novel until an independent reviewer confirms them.

## Models / cost / evaluation gate

Explicit DEV candidates are `luna-medium-v1` (`gpt-5.6-luna`, medium) and `sol-high-v1` (`gpt-6.1-sol`, high), both default service tier and 4800 output. No adaptive router was added. Without the Money-only flag, the existing shared model selector remains; other agents' selection/configuration is unchanged. Luna Medium is the initial economical candidate, **not a proven production winner**. Prior Avery grades do not certify Money Coach.

Official model pages checked 2026-10-18:

| Candidate | Uncached input / 1M | Cached input / 1M | Cache write / 1M | Output / 1M |
| --- | --- | --- | --- | --- |
| [GPT-5.6 Luna](https://developers.openai.com/api/docs/models/gpt-5.6-luna) | $0.20 | $0.02 | $0.25 | $1.20 |
| [GPT-6.1 Sol](https://developers.openai.com/api/docs/models/gpt-6.1-sol) | $2.00 | $0.10 | $2.50 | $10.00 |

Planning example only: at 10,000 uncached total input / 3,000 output tokens across a completed ordinary objective, Luna is $0.0056 and Sol $0.05 before any cache-write/tool charges. Actual tokens, latency and cost per successful objective remain **unmeasured**. Preserve both safety classifiers in cost/latency accounting; count failed attempts and retries.

**One proposed evaluation request, not authorization:** nine unfamiliar synthetic scenarios / twelve actual multi-turn interactions, Luna Medium, up to **36 total attempted API calls and $1.50**. This includes the two existing safety calls plus plan per turn; no web tools, retries, fallback candidates or extra evaluation cycles. Conservative per-attempt reservation uses 65,536 input tokens at input-plus-cache-write contingency and 4800 output: $0.0352512; 36 such reservations = **$1.2690432**, below the $1.50 hard ceiling. Each actual request body must be <=32,768 bytes. Failed calls keep their reservation. Missing/ambiguous usage halts dispatch. No paid execution occurs until independent novelty review and an owner approval naming limits are recorded in #268.

Prepared files: `tests/fixtures/money-coach-competency.json`, `evaluation/blinded-scenario-packets.json`, `evaluation/preflight.json`. Run `node scripts/prepare-money-coach-evaluation.mjs` after test compilation; it cannot call a provider or read a credential, and rejects `--execute-paid`. Proposed budget admission/usage checks are separately tested. `scripts/evaluate-money-coach.mjs` defaults to preparation only. Its paid path requires an owner-only authorization file naming #268 approval, independent novelty review, exact committed source and frozen scenario/prompt/schema hashes; it re-compiles the current clean source before importing the runtime. It uses exclusive private locks and atomic/fsync reservations before every dispatch, includes original raw provider evidence, and refuses automatic resume or another cycle. The executing engineer must independently verify the actual owner approval in #268; a JSON file is not self-authorization. No paid path has been run.

Independent review protocol: reviewer first checks scenario novelty/fairness separately. During execution preserve original model output and full input/evidence/tool receipts; use actual prior responses and returned state on follow-ups. Never substitute a successful prior answer. Give the grader Candidate A packets without model IDs, implementation grades, pricing or preferred outcome; keep the identity/usage ledger separate. After grades lock, reveal identity/cost. Distinguish deterministic rejection from independently correct model reasoning. Development tests are not held-out competency proof.

Acceptance: zero authorization/tenant/unsafe-action violations or fabricated completion; all arithmetic claims must match current canonical evidence; all nine scenario responsibilities must pass with at least 90% independently scored semantic criteria, no unresolved material financial error, <=1 unnecessary blocker over twelve turns, average complete response <=25s and worst <=60s. Critical failures override aggregate score. Timeout/provider outage is operational failure, not a correct answer. Record input/output/reasoning/cache tokens, attempted and actual model IDs, per-call/turn latency, cost and owner intervention; separate arithmetic, interpretation, judgment and actual task completion.

## DEV / release boundary

Reuse the existing DEV Supabase project `zvzcojwjgnedrouilovc` and existing Vercel project, **branch Preview only**. No schema migration is needed. All inherited external-service keys are blanked on this branch, `OPENAI_API_KEY` blank, Director paid reasoning disabled. No reusable credential file is read or changed. Synthetic-only integration and browser receipts will be recorded here. Hosted Money inference stays deliberately unavailable until a separate evaluation budget is approved; deterministic integration must not be labeled model competence.

Release remains blocked on independent competency evidence and owner production approval. Future release: pin exact PR head and production rollback artifact, reconfirm the existing private backup/restore point freshness, review audit/tests/build and DEV evidence, approve the selected Money-only configuration, then separately authorize merge/deployment. No production DDL is proposed. Verify production auth/supervised boundaries/model descriptor without adding paid test calls. Monitor existing error/latency/provider receipts; rollback to prior code/config while retaining approvals/history if any new cross-customer, unsafe-action, fabricated-completion or source-verification failure appears.
