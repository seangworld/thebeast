# Taylor synthetic evaluation — aggregate spend gate

**Status: guard implemented; paid assessment BLOCKED on normal local DEV owner sign-in.**

Owner authorization: one synthetic evaluation run, aggregate maximum **$10 USD**, including every verification, planning, research, synthesis, failed attempt, retry and tool charge. No real member inputs, production writes, production deployment or merge. The original four cases and criteria in PLAN.md are unchanged: **4 scenarios / 11 turns**. The separate legacy `health-veterans-personalized` case is not added to this run.

## Verified guard

The existing runner previously had no aggregate ledger and returned no complete provider usage accounting. Its nested safety, research and synthesis calls all use `digitalStaffRuntime/provider.ts`. The authenticated evaluation route now installs an async scope around the entire scenario. Both streaming and JSON provider functions reserve through that scope before fetch; every phase shares the same durable local ledger across scenarios and process restarts.

- Hard-coded $10 ceiling; client requests cannot supply a larger cap or another ledger. Fixed operator run ID: `taylor-20261018-pr271`.
- Integer nanodollar accounting. The full maximum cost is fsynced before dispatch, then settled only with valid returned model, service tier, token usage and tool information. No cache discount is assumed. Raw synthetic request/response payloads and final scenario results remain in the private ledger for evidence preparation.
- Exclusive lock prevents concurrent runs. A crash leaves its reservation/lock intact; there is no automatic stale-lock removal, refund, retry or budget reset. Unknown/failed transport or missing usage retains the entire maximum and halts further spending. Duplicate already-started scenarios cannot be replayed.
- Every next call is rejected before fetch when `settled conservative cost + full next reservation > $10`. Native provider fetch has no automatic retry loop; any future explicit retry must obtain its own reservation. An uncertain prior call prohibits retry.
- Only reviewed exact model IDs/snapshots and default service tier are accepted. Output limits are explicitly transmitted using the existing requested value or documented model maximum. Unknown models/prices, service tiers, extra tools/charges, provider history/background jobs, missing tool-call limits or expired pricing fail closed.
- The only priced hosted tool is existing `web_search`, at most three calls. Reserve a full model context for each possible tool step plus the initial inference pass, all permitted output/reasoning tokens and all three tool fees. Retain maximum tool fees in settled accounting instead of treating incomplete search-action detail as an invoice. This includes retrieved/PDF input within the model context bound; unrelated tools are refused.
- Hosted/production execution is disabled for this assessment: Vercel's ephemeral filesystem cannot establish this run's durable aggregate ledger. The existing owner authentication and database admin-role check run **before** the guard. No service-role session or synthetic admin substitutes for a real owner login.

## Pricing and model preflight (2026-10-18 America/New_York)

Official references: [GPT-5](https://developers.openai.com/api/docs/models/gpt-5), [Luna](https://developers.openai.com/api/docs/models/gpt-5.6-luna), [tool pricing](https://developers.openai.com/api/docs/pricing). The existing routing selects GPT-5 for stronger Health work and GPT-5.6 Luna for ordinary turns; no model or reasoning upgrade was made. Both exact model IDs returned HTTP 200 from **no-cost model-metadata GETs** using the existing development credential. That credential was not modified, printed, committed, or copied into a new credential file.

| Model | Context/output maxima | Accounting rates per million tokens | Maximum plain / three-search call reservation |
| --- | --- | --- | --- |
| `gpt-5` | 400,000 / 128,000 | $1.25 input / $10 output | $1.78 / $3.31 |
| `gpt-5.6-luna` | 1,050,000 / 128,000 | conservative ceilings $0.55 input / $1.98 output | $0.83094 / $2.59344 |

Luna published short-context rates are $0.20 input/$1.20 output; the guard ceilings include the documented long-context (2x input/1.5x output), cache-write (1.25x input), and possible 10% regional uplifts. Applying these ceilings to all usage intentionally overstates cost. Settled accounting is a conservative usage-based amount, **not a provider invoice**. GPT-5 uses its reviewed legacy model pricing; its maximum context is reserved even for small classifier prompts. Pricing review expires at `2026-10-19T04:00:00Z` (midnight EDT). Refresh documentation before any later run; never delete/reset a spent ledger to refresh prices.

The full run is not reserved at once: each call must fit its worst case against the remaining aggregate cap. A later call can stop even if its expected cost is small. $10 authorization does not promise completion of every scenario. See `preflight.json` for frozen fixture SHA-256 and all 11 selected turns. API tool usage and all output/reasoning usage must remain observable; otherwise stop and report the retained reservation.

## Non-paid verification

- Full regression suite: **2,482/2,482 passed**, including **13 spend-guard tests**.
- Focused guard/evaluation/evidence-quality coverage: **25/25 passed**.
- Tests cover stop-before-cap with zero network dispatch; unknown pricing/tier/tools/token limits; expired prices; absent JSON and streaming usage; model/usage mismatches; transport failure; persisted reservations; concurrent lock and cross-request aggregation; research costs; all five provider phases; and prevention of scenario replay.
- TypeScript, test compilation, lint and required security-gated build pass. Official npm audit: **zero vulnerabilities**; scoped dependency-fork verification **22/22 passed**.
- An initial client-barrel build failure was corrected by keeping the Node filesystem/async-context implementation server-only behind a client-safe provider hook. Final build verifies this separation; normal non-evaluation provider behavior is unchanged.
- The original scenario source/criteria are unchanged. No clinical accuracy or model-security pass is assigned from deterministic guard tests.

## Execution ledger and access blocker

**Paid inference attempts: 0. Input tokens: 0. Output tokens: 0. Tool charges: $0. Estimated/billed evaluation spend: $0.** Two model availability GETs were metadata checks, not inference. No new semantic/clinical results or blinded model-response packets exist yet.

Read-only owner access was verified on the deployed catalog through the existing app session. That deployment lacks this new guard and cannot be used to run this assessment. The prepared local server is bound to `127.0.0.1:3127`, uses **DEV** project `zvzcojwjgnedrouilovc`, and redirects the evaluation page to the ordinary sign-in flow (`state=session_expired`). No local DEV owner session is available. We did not extract a production session, create an admin account, bypass authentication, or use real member records. Private public-key metadata capture was removed after selecting only the existing DEV publishable key; no service key was used.

**Smallest next action:** the owner completes normal DEV sign-in directly at `http://localhost:3127/dashboard/admin/member-ai-production-evaluation`, without sending credentials/sign-in links/codes in chat. If the DEV identity lacks the existing admin role, stop rather than grant a new role. Once verified, Codex can execute the four frozen cases once, collect the private ledger's verbatim evidence, publish blinded packets, and report measured results within the same $10 authorization. Do not run the unguarded production endpoint.

Local startup helper: `/private/tmp/taylor-start-local.py`; owner-private configuration/ledger directory is outside all repositories. The original API credential remains in its existing secure location and is loaded only into server process memory. Do not copy private ledger payloads or credentials into Git indiscriminately; publish only reviewed synthetic evidence and accounting summaries. Keep PR #271 draft; no merge or production deployment.
