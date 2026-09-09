# Public News traffic aggregate

Owner-requested automatic Site News activity includes public page-view totals. This endpoint exposes only a fixed News-host aggregate and dated window, never visitor identities, paths, campaigns, provider identifiers, credentials or raw errors.

`/public/news-traffic` reuses the existing GA4 workload identity and property binding. It requests one bounded minute-level report for `news.seangworld.com`, with a12-second deadline and a shared300-second cache. No arbitrary host, property, range or query input is accepted. Existing owner-only Intelligence endpoints and standing-observation grants are unchanged.

The rolling24-hour window ends at the last complete minute. GA4 property timezone metadata determines row inclusion. Ambiguous DST-transition windows, malformed/truncated/thresholded/sampled reports and failures remain unavailable. Explicit complete empty reports may establish zero; omitted evidence does not. Counts represent reported page loads, not unique readers, and recent analytics may be delayed.

Validate strict parsing, boundary dates, metadata suppression, fixed provider request/privacy, cache and public endpoint integration. Full application tests/types/lint/build and independent review are required. Authenticated/rendered Preview remains owner-deferred and unperformed. No provider funding/binding/grant, schema, cron, worker or Fact Brief hold change. Internal aggregate support introduces no module version change. Rollback is an isolated code revert; no data rollback.

References: https://developers.google.com/analytics/devguides/reporting/data/v1/api-schema and https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/ResponseMetaData.

Live initial verification returned unavailable. Bounded internal diagnostics distinguish missing configuration, identity failure, HTTP status, timeout and report shape/suppression. Only fixed stages, booleans and bounded row totals are logged; no bodies, raw exceptions, identifiers or credentials. Public response remains the same aggregate contract.

Live diagnostics identified an empty report with matching headers and timezone but omitted row count. GA4 uses ProtoJSON, whose implicit zero integer and empty repeated fields are omitted by default. The parser accepts omitted `rowCount` only when `kind` is `analyticsData#runReport`, rows are absent or an empty array, and all existing header, metadata and window checks pass. Nonempty reports still require an exact row count; null/malformed rows and unidentified missing evidence remain unavailable. Cache version 2 prevents the earlier rejected empty report from being reused after this parsing correction.

Response format references: https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/RunReportResponse and https://protobuf.dev/programming-guides/json/#presence-and-default-values.

Refresh reliability follow-up: the fixed cache key could serve an expired report while starting background revalidation. Live requests still returned the 17:22 report at 17:32. The route now partitions its shared cache by the server's five-minute period and awaits a report on the first request in a new period. HTTP responses are no-store so a second CDN cache cannot replay the previous period. Requests within a period still reuse the shared result; request parameters cannot choose a key or provider report. Failure semantics and the 12-second provider deadline are unchanged. An actual-route regression test retains expired cache entries and verifies same-period reuse plus fresh reads after rollover and an idle hour.
