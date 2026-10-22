# GC-only budget guard — implemented, not live-dispatched

October 20, 2026. `scripts/guidance-evaluation-budget.mjs` is isolated evaluation support, not a production runtime change or an active paid dispatcher. It does not import or alter Taylor's guard, ledgers, prices or authorization. No network call occurs on import.

Implemented controls:

- Exclusive new GC ledger in a private directory, 0600 file; cannot overwrite or resume an existing ledger implicitly.
- Persist and fsync the complete worst-case reservation before transport; atomic subsequent updates.
- Maximum proposed cap $10, maximum 88 attempts across eleven turns, maximum eight calls per turn. These are configurable downward; there is no approved GC spending authorization yet.
- Explicit 4,800 output-token ceiling for previously uncapped evaluation calls; preserves lower runtime limits of 1,400/3,600. This is an evaluation configuration difference and must appear in the final dispatch manifest.
- Four web-tool calls per request supported; other tools, unknown parameters, unpriced models/tiers, expired pricing, stored conversation history and excessive request size rejected.
- Reservation includes full configured context for every possible tool step, output ceiling and maximum search charges. This is deliberately conservative; it is not an actual spend estimate.
- Settlements verify model, usage and tool counts. Missing usage, timeout, network error or unexpected model retains full reservation and halts. Duplicate request IDs, repeated turns, overbudget requests and excess attempts stop before transport. No retries.
- Final execution adapter must install the existing provider reservation hook in a dedicated process; this module is not registered in the production app. It is not safe to overwrite another active evaluation's hook in a shared server process.

Verification updated October 21: eleven standalone tests pass, covering reservation-before-send, four-tool support, overbudget prevention, unknown usage, duplicate IDs/turns/ledgers, output/model/tier/tool bounds, timeout, per-turn attempt ceilings, unresolved concurrent reservations, durable delivered results, and all three calls in a mocked ordinary GC runtime turn. Integration calls used a synthetic key and mocked transport; zero real model calls. The dedicated local adapter also passed a complete eight-call mocked research turn, including both four-tool-cap public stages, private-context separation and overlapping-session rejection.

Official pricing/model references were opened October 20:
https://developers.openai.com/api/docs/pricing
https://developers.openai.com/api/docs/models/gpt-5
https://developers.openai.com/api/docs/models/gpt-5.6-luna

Published base token rates alone do not establish the final conservative policy: applicable long-context/cache-write rates, effective DEV model IDs and account availability must be pinned before dispatch. No live pricing policy has been activated. Synthetic test prices are explicitly test inputs, not a billing proposal.

The dedicated synthetic adapter is implemented in `scripts/guidance-evaluation-session.mjs`; it rejects production mode and nonsynthetic owner IDs, enforces the 170-second deadline, and checks the ledger after runtime return so fallback cannot hide unresolved spending. It now persists the delivered RuntimeResult, including returned conversation state, sources, timings and validation failures, before completing the turn. An overlapping adapter session is rejected before it can replace the process-level accounting hook. It must still run in a dedicated process, not alongside other evaluation systems.

Next concrete gates: configure an authorized DEV credential path, pin an expiring reviewed price policy and request/fixture hashes, then present the exact run and cap for owner approval. FAFSA baseline evidence is now recorded in SOURCE-BASELINE.md; detailed TCC catalog prerequisites remain unverified. No grade, merge or deployment.

A presence-only environment check found OPENAI_API_KEY absent in the current execution process. No key value was read or printed. This does not establish whether another DEV environment has credentials. No live availability or authenticated provider check was attempted. Do not ask the owner to paste secrets into a public issue or report.

October 21 follow-up also checked the project's conventional local configuration paths: `.env.local`, `.env.development.local`, `.env.development` and `.env`. None exists in this checkout. The process key remains absent. No other environment's credentials were extracted or repurposed. Work is stopped at the credential/access boundary; no task is running in the background.
