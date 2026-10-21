# Search-provider feasibility — recommendation: Serper

## Conclusion

**Recommend Serper's ordinary Search API for Jordan's discovery step**, subject to owner-controlled account access and later implementation/spending authority. Its published business-use/download license and fixed query pricing establish a concrete feasibility path without a custom search-result storage exception. No activation or live API test was performed, so account entitlement and actual endpoint behavior are not verified. This is a provider recommendation, not runtime readiness or Jordan competency certification.

Preserve unfamiliar-target general discovery and the existing private brief/separate privacy, contextual synthesis and final safety. The eventual acceptance target remains a complete delivered researched answer under the unchanged original criteria—not a successful isolated discovery/extraction stage.

## Evidence actually necessary

**Necessary factual evidence is the official source-page evidence Jordan uses**, independently retrieved from the authority/institution/issuer: effective URL, retrieval time/status, permitted retained text/excerpts, exact quoted passage and location, applicable year/version, identity-support relationship, digest, and the actual model-visible evidence/final citations. A digest without retained supporting text cannot establish what a claim was based on. Private raw page snapshots are useful only where permitted; neither a search provider nor public availability grants blanket rights over every school's content. Check source-specific access/reuse terms; preserve rights/attribution. If retention of the required supporting content is not permitted or established, do not claim that source has an auditable retained finding or assume a fair-use/license exception.

**Necessary discovery accounting is much smaller:** our approved public query, endpoint/provider, attempt/time/status, charged/reserved query unit and the connection from a selected result URL to the independently retrieved document. This enables tracing why a page was visited. It does not require archiving the complete search response.

**Optional:** full SERP JSON, all rejected candidates, rank history, snippets, knowledge panels, images and cached result pages. These may help diagnose discovery, but are not needed to prove factual answer support. Do not send snippets as verified findings, publish a search-results mirror or make full-result storage a procurement prerequisite. Default evidence minimization should retain selected candidate provenance and source evidence, not every search artifact.

This corrects the earlier design's overbroad assumption that durable full discovery results must be licensed before source evidence can be useful. A provider's restrictions still apply to selected URLs/derived metadata where its terms say so; minimization is not a licensing workaround.

## Documented permission and limits

[Serper Terms](https://serper.dev/terms), updated May29,2024, reviewed October21,2026:

- Its Usage License expressly grants business users permission to download website/service materials **“for as long as your use case requires”**. This is affirmative permission, not an inference from silence about caching.
- Attribution/proprietary notices must remain; no unmodified mirror without added value, reverse engineering, limits circumvention or multiple-account circumvention.
- Its Data License preserves third-party rights. Serper's permission does not license arbitrary official-site content, search engine trademarks or public redistribution of source copies. Jordan will independently retrieve official pages, not treat provider snippets as a rights-cleared corpus.
- Serper is a third-party SERP service, not Google or an endorsed official Google API. The application would consume its documented service rather than scrape search-engine frontends itself. This intentionally revises the earlier design's blanket exclusion of SERP services; it does not authorize bypassing access controls or establish all third-party collection rights.

The documented permission supports retaining discovery artifacts for this business use with attribution and these limitations. It does not support an unlimited public corpus or exempt independently retrieved pages from their own terms. Only sanitized public target terms go to Serper; no learner/member information.

## Pricing and operating estimate

[Official pricing and FAQ](https://serper.dev/#pricing) publish a top-up model with no monthly subscription. Starter is **$50 for50,000 credits/queries**, valid **six months**, excluding sales tax/VAT/GST. Successful query responses deduct credits; zero credit balance stops new queries. The advertised2,500-query no-card offer is an account-dependent trial, not assumed availability or sustainable operating funding.

| Quantity | Search usage value at Starter rate, before tax |
| --- | ---: |
| One ordinary query |$0.001 |
| Four-query research turn maximum |$0.004 |
|100 four-query turns |$0.40 |
|1,000 four-query turns |$4.00 |
| Minimum advertised paid top-up |**$50 upfront**, not$0.004 |

At low volume, unused/expired credits increase the effective cost. For example, buying the pack solely for100 four-query turns still requires$50 cash before tax, even though only$0.40 of nominal credits is consumed. Six-month validity matters. No purchase, trial activation, card authorization or subscription was made.

These are **discovery-only** costs. Independently retrieved pages add bounded existing compute/network/storage usage, with no Serper retrieval fee in this design; those resources are not inherently free. Six model calls add their actual input/output/cache/tier costs. Full-answer average cost and completion rate remain unmeasured; do not describe the whole objective as costing$0.004. A future manifest must reserve the full inference maxima plus four priced search permits and applicable bounded surcharges. No new evaluation budget is proposed here.

## Enforceable request/cost limits

Use one ordinary single-query Search request per permit; no batch, paging, auto-followup, provider scraping endpoint or extra products. Default first-page results supply candidates; processing at most ten candidates is a local cap, not an unverified claim about arbitrary `num` options. Before implementation freeze, confirm exact standard endpoint/parameter/credit behavior against authorized dashboard documentation; any unpriced option or different unit blocks dispatch.

- At most **four outbound search attempts per researched turn**, including failed/uncertain attempts; no client/SDK retry. Provider-internal retries are covered by its advertised per-query service, not modeled as separately dispatched application requests.
- Reserve one full standard-query unit before each transport, atomically against both job-wide search count and total spending, including all inference stages. Use a conservative tax-inclusive unit when cash-equivalent caps require it; if the applicable price/surcharge cannot be bounded, do not dispatch.
- Unknown transport/cost retains the entire query reservation and halts. A failed request is never assumed free. A valid response with unexpected credit accounting, price/model/tool setting or malformed provenance halts. Do not infer that sufficient remaining prepaid balance authorizes exceeding the job cap.
- A25s search pool, controlled concurrency, separate bounded page fetch queue and existing no-restart/delivery rules remain. Rate limits are not spending limits;50QPS Starter capacity does not replace the four-permit guard.
- Retain gross list-price accounting even if eligible trial credits cover cash usage; record credit discounts separately. Zero-balance enforcement is only an account backstop; it is too broad to enforce a small per-evaluation cap by itself.

This is materially different from counting emitted hosted model web items: the application controls each single-query HTTP dispatch directly. No hidden model search stage, speculative result-count billing or assumption that a lower usage meter is authoritative is needed.

## Exact account-access requirement

After separate authority to set up/use it, **Sean must own or authorize access to one Serper business account** through [Serper](https://serper.dev/). An existing organization-controlled account is preferable; account existence was not checked. Owner sign-in must occur normally, not via shared passwords/cookies or automated account creation.

An authorized API key for the ordinary Search endpoint, visible in that account's dashboard, must be placed directly into the approved private DEV secret configuration (future server-only `SERPER_API_KEY`, not a public/client environment variable). Proposed local setup location after authorization: `~/.config/seangworld/serper-dev.env`, owner-only mode0600, loaded server-side by the future DEV adapter. This file/binding does not exist as part of this work and the current runner does not load it. Do not edit or replace the existing OpenAI development credential. No key should be pasted into chat, GitHub or an evaluation packet. Access also needs dashboard visibility of remaining credits, exact query costs, taxes/expiry and any optional automatic top-up settings. Do not enable automated purchases/reloads.

If an existing eligible trial has sufficient credits, a later authorized DEV assessment might avoid a top-up; eligibility must be confirmed by the owner account. Otherwise the concrete paid-access requirement is the advertised **$50 minimum Starter top-up plus applicable tax**. That is a new purchase requiring owner authorization, even without a recurring subscription. No enterprise contract or separate Serper retention waiver is established as necessary for the modest discovery evidence described above; source-page rights remain separate.

## Alternatives examined and why not selected

- **Brave:** explicit broad API-data retention prohibition in its [FAQ](https://api-dashboard.search.brave.com/documentation/resources/help-feedback); do not invent an exception for selected result URLs. Independent page retrieval does not waive Brave's own returned-data terms.
- **Exa:** [terms §4.2(a)](https://exa.ai/assets/Exa_Labs_Terms_of_Service.pdf) restrict downloading/copying service information except browser display cache or express permission. Its license to Exa to store user input/output is not a grant to us. Its own zero-retention policy is also not our retention license. Not selected without clearer written permission.
- **Tavily:** [public terms](https://www.tavily.com/terms) distinguish Output from Services and describe output use, but the reviewed text did not establish an equally clear affirmative download/retention grant for this evidence package. Absence of an express ban is not enough to assert permission.
- **SearchApi:** [public terms](https://www.searchapi.io/legal/terms) preserve data attribution and third-party rights, but service-copy restrictions and no equally clear retained-evidence grant leave more interpretation than Serper's express download clause.

No vendors were contacted and no legal/contract exception was solicited. Directory CLI remained unavailable from the earlier read-only setup check; no software was installed. This review used primary public provider documentation, not account APIs or paid tests. Vendor marketing quality claims were not used as evidence of Jordan accuracy.

## Preservation and acceptance

All six GC ledgers/historical evidence remain unchanged at **$4.25159388** conservative accounting, including **$4.152 unresolved reservations**. No refunds/releases or retroactive reconciliation. No fresh evaluation ledger, paid inference, provider API test/metadata call, service activation, implementation, merge or deployment.

Recommendation is concrete and feasible at the discovery-contract level; the remaining access gate is an owner-authorized Serper account/key and available credits, plus an approved integration/budget. Source-specific retention, endpoint parameter confirmation and engineering/security verification remain implementation gates. The original researched-answer acceptance criteria are unchanged. No new isolated paid probe is recommended or authorized, and this provider review supplies no new competency grade.
