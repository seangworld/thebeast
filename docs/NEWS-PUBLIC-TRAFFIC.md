# Public News traffic aggregate

Owner-requested automatic Site News activity includes public page-view totals. This endpoint exposes only a fixed News-host aggregate and dated window, never visitor identities, paths, campaigns, provider identifiers, credentials or raw errors.

`/public/news-traffic` reuses the existing GA4 workload identity and property binding. It requests one bounded minute-level report for `news.seangworld.com`, with a12-second deadline and a shared300-second cache. No arbitrary host, property, range or query input is accepted. Existing owner-only Intelligence endpoints and standing-observation grants are unchanged.

The rolling24-hour window ends at the last complete minute. GA4 property timezone metadata determines row inclusion. Ambiguous DST-transition windows, malformed/truncated/thresholded/sampled reports and failures remain unavailable. Explicit complete empty reports may establish zero; omitted evidence does not. Counts represent reported page loads, not unique readers, and recent analytics may be delayed.

Validate strict parsing, boundary dates, metadata suppression, fixed provider request/privacy, cache and public endpoint integration. Full application tests/types/lint/build and independent review are required. Authenticated/rendered Preview remains owner-deferred and unperformed. No provider funding/binding/grant, schema, cron, worker or Fact Brief hold change. Internal aggregate support introduces no module version change. Rollback is an isolated code revert; no data rollback.

References: https://developers.google.com/analytics/devguides/reporting/data/v1/api-schema and https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/ResponseMetaData.
