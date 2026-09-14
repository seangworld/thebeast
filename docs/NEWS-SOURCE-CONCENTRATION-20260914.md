# News source concentration projection

Owner-approved source-diversity code release, based on canonical Beast main 8930d13917b48ea57dd849a4c1d42c81cf32b77b.

The existing News Operations workspace (also embedded in Company Analytics) now distinguishes registered coverage totals from snapshot feeds, publisher labels, World/USA pools and visible columns. A read-only panel warns when one publisher or observed publisher-host family exceeds 50% of a pool or visible lane. Fewer than three visible publishers is labeled limited-source fallback. Missing, invalid or stale evidence never becomes an all-clear. Families describe observed hosts, not corporate ownership.

The parser validates lane identity, distribution counts and shares, timestamps and the 12-story bound. Tests cover majority warnings despite large totals, the exact 50% boundary, invalid/missing/future evidence and independently calculated staleness.

No new feeds, source activations, provider changes, spending authority, content publication, auth behavior or database migrations are included. Release path: local tests/typecheck/lint/member-AI validation/build, exact preview verification, approved merge, governed Vercel release, public status and deployed-code verification. Revert this isolated change for rollback.
