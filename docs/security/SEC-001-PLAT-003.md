# SEC-001 / PLAT-003 security audit

## Production header policy

Beast applies the security headers in `next.config.js` to every application and
API response. The content policy allows only the origins required by the
deployed application: same-origin application resources, configured Supabase
HTTPS/WebSocket traffic, data/blob resources used for member assets, and HTTPS
images/media. Frames, plugins, cross-origin forms, and cross-origin base URLs
are denied. OpenAI and Google provider calls remain server-side and therefore
are not CSP connection sources.

Next.js emits inline App Router bootstrap scripts and the application uses React
inline style values, so production `script-src` and `style-src` retain
`'unsafe-inline'`. `unsafe-eval` is development-only. A future nonce-based
dynamic rendering migration could further narrow the inline-script policy.

## Dependency findings and disposition

The initial `npm audit` result contained one critical and eight high-severity
affected packages:

| Package | Path / exposure | Disposition |
| --- | --- | --- |
| `next` 13.5.6 | Direct production framework. Its middleware authorization bypass was exploitable because Beast protects routes in middleware; the reported SSRF, cache, and denial-of-service advisories were also production-relevant or potentially exploitable. | Upgraded to 15.5.21, the first compatible patched line covering the reported advisory range. Request APIs were migrated to the supported async contract and the full application was rebuilt and tested. |
| `postcss` | Direct build dependency and bundled through Next.js. The arbitrary file read/path traversal and line-return parsing findings require attacker-controlled CSS or build input, which Beast does not accept in production. | Upgraded and pinned to 8.5.23, including the Next.js transitive path. |
| `ws` | Transitive runtime dependency of Supabase Realtime. A hostile or compromised WebSocket peer could potentially exercise the reported stream/fragment handling issue. | Overridden to 8.21.0. |
| `nanoid` | Transitive build dependency through PostCSS. Beast does not pass member-controlled negative or zero sizes to this package. | Overridden to 3.3.17. |
| `js-yaml` | Transitive ESLint/build tooling only; production does not parse member-supplied YAML through it. | Overridden to 4.3.1. |
| `brace-expansion` | Transitive ESLint/build tooling only; production does not evaluate member-supplied glob expressions through it. | Overridden to patched 1.x and 2.x releases. |
| `minimatch` | Transitive ESLint/TypeScript tooling only; not part of an application request path. | Overridden to 9.0.7 in the affected TypeScript-ESLint path. |
| `@typescript-eslint/parser` / `typescript-estree` | Direct/transitive development tooling that carried the vulnerable glob dependency. | Retained at compatible versions with the patched targeted transitive override. |

After remediation, `npm audit` reports zero known vulnerabilities. No force-fix
was used. Remaining platform risk is the documented Next.js inline bootstrap
allowance and broad HTTPS image/media support needed for legitimate member
assets; neither permission grants provider credentials or expands server-side
authorization.

## SEC-002 boundaries

Provider credentials remain read only from server environment variables,
authorization construction remains centralized in the Digital Staff provider,
logs redact credential-shaped values, and client responses retain generic
provider errors. Security regression tests enforce these boundaries and ensure
OpenAI is absent from browser CSP connection origins.

No database migration or production SQL is required by this change.
