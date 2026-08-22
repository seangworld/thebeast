# SW-SEO-229 Search Opportunity Intelligence

SW-SEO-229 extends the owner-only SEANGWORLD Intelligence workspace with
bounded Google Search Console page-to-query evidence. It does not edit public
SEANGWORLD pages, make SEO changes, or promise rankings.

## Evidence and baseline

- Current and immediately preceding 7, 30, or 90 day periods use finalized
  Search Console data through the same verified reporting date.
- Page, query, and page/query reports are read server-side with provider
  concurrency capped at three. Page/query evidence is capped at 500 rows per
  period and uses the existing 15-minute provider cache.
- Every displayed row preserves clicks, impressions, CTR, average position,
  current-minus-prior change, baseline dates, and the finalized-through date.
- A missing prior page/query row remains unavailable. It is not converted to a
  prior-period zero.
- Search Console may anonymize or omit queries. Rows are evidence samples, not
  exhaustive page totals.

## Deterministic ranking

Each current page/query row receives one score from 0 to 100 and exactly one
disposition:

- **Improve Existing Page:** at least 50 impressions, CTR below 3%, and average
  position from 4 through 20.
- **Create Supporting Content:** at least 50 impressions and position no worse
  than 40 when the query currently resolves to a broad home, articles, guides,
  tools, or docs hub.
- **Investigate:** at least 100 impressions with average position worse than 20
  or an impression decline of at least 25%.
- **Watch:** at least 25 impressions with new, growing, or near-achievable
  visibility that does not meet an action threshold.
- **Ignore:** evidence below the action thresholds, including fewer than 10
  impressions with no clicks.

The score weights sampled impressions, an achievable position, low CTR, and
impression growth. The rationale shown beside each row names the rule that
produced its disposition. A disposition is an owner-review input, not a causal
claim or authorization to change content.

## Boundaries

The API remains admin-only and read-only. It stores no query data, changes no
database or provider configuration, and returns no credentials. An accepted
SEO change must retain its displayed baseline and later compare post-change
results against it without claiming causation.

BeastHunter and **Hunt Our Data** handoff remain unavailable until BeastHunter
has a canonical governance registration and an approved integration contract.
