# Local SQL mechanics

`verify.mjs` exercises only an isolated synthetic PGlite database. No remote database, account, generation or publishing call is made. It reuses the existing SQL-test runtime and exact lockfile retained in PR #259 commit `569612f0af46d97ebc9f7130152fc50d8f172b9f`; no application dependency is added or upgraded.

Restore that retained tool outside the application when needed:

```sh
mkdir -p /private/tmp/cole-sql-fixtures
git show 569612f0af46d97ebc9f7130152fc50d8f172b9f:scripts/agency-sql-validation/package.json > /private/tmp/cole-sql-fixtures/package.json
git show 569612f0af46d97ebc9f7130152fc50d8f172b9f:scripts/agency-sql-validation/package-lock.json > /private/tmp/cole-sql-fixtures/package-lock.json
npm ci --ignore-scripts --prefix /private/tmp/cole-sql-fixtures
node scripts/agency-fixtures/verify.mjs
```

Alternatively set `AGENCY_SQL_RUNTIME` to the absolute `dist/index.js` of that same installed retained runtime. The 28 assertions cover direct-role denial, composite ownership, duplicate content/account IDs, receipt requirements, single claims and preparation-abandon/publish-intent races. They establish PostgreSQL mechanics, not hosted provider behavior or live agent competence.
