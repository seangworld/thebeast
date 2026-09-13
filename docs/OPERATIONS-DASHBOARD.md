# SEANGWORLD HQ

## Owner-approved scope

Create a desktop-first company headquarters with phone check-in support. SEANGWORLD HQ is the company-wide CEO/CFO/COO layer; BeastAdmin administers The Beast only. Individual venture control panels retain their own operational depth. Reuse BeastFusion, identity, agents, data, and existing workflows rather than creating a second business engine.

## Navigation and compatibility

`/dashboard/operations` is the current owner-only route for SEANGWORLD HQ. It has its own desktop sidebar and a compact mobile menu. SEANGWORLD HQ is available beside BeastAdmin in the owner navigation and mobile More menu. Members and the owner's Member view cannot use these controls.

The route remains `/dashboard/operations` for bookmark and rollback stability; the product identity shown to the owner is SEANGWORLD HQ.

| Previous destination | SEANGWORLD HQ destination |
| --- | --- |
| CEO Mode at `/dashboard/admin` | `/dashboard/operations/briefing` |
| Empire Overview | `/dashboard/operations/finances` |
| Revenue | `/dashboard/operations/revenue` |
| Company Overview | `/dashboard/operations/company` |
| Company Analytics | `/dashboard/operations/analytics` |
| BeastHunter | `/dashboard/operations/opportunities` |
| News | `/dashboard/operations/news` |
| Change the World | `/dashboard/operations/change-the-world` |
| Marketing and its five specialist sections | `/dashboard/operations/marketing` and the corresponding section |
| Marketing / Publishing | `/dashboard/operations/publishing` |

Business routes retain their current implementation, with one new route export per workspace and temporary redirects for old bookmarks. Existing API endpoints, owner checks, storage, approvals, costs, and provider integrations are unchanged. The admin root intentionally becomes the BeastAdmin overview. Technical controls stay accessible in BeastAdmin; SEANGWORLD HQ links to the existing BeastFusion projection and shared staff/proposal components.

## Responsibility boundary

| Surface | Responsibility |
| --- | --- |
| SEANGWORLD HQ | Company-wide finance, revenue, analytics, strategy, opportunities, production, cross-venture agents, and owner approvals |
| BeastAdmin | The Beast product family, members, product settings, platform health, and engineering controls |
| Venture control panels | Detailed operating controls for News, Change the World, and future SEANGWORLD ventures |
| BeastFusion | Sole canonical authority for roadmap, governed execution, release truth, agent coordination, and lifecycle state |

SEANGWORLD HQ is an operating projection and launch surface. It does not become a duplicate roadmap, execution registry, or source of release truth.

## Production workflow

`/dashboard/operations/production` is the revenue-production front door. The owner starts with an idea, asks for an opportunity, or begins client work. The repeatable operating sequence is Choose → Set the run → Agents produce → Owner review → Publish or deliver.

The first increment routes only to verified existing factories. KDP uses one master manuscript with Kindle, paperback, and hardcover as output formats. FacelessReels is the current video production engine; BeastMarketing coordinates discovery, scripting, calendar, approvals, publishing, analytics, and optimization. The custom Revision 7 renderer remains preserved but paused. Client packages, durable timed runs, cross-factory progress, and batch review remain explicitly disconnected until their BeastFusion execution paths are implemented and verified.

No new product lifecycle registry, execution authority, agent, scheduler, database, or company membership system is introduced. This is an operating view of the existing businesses, not a claim that each venture has revenue.

## Financial provenance

The overview shows AdSense's reported month estimate only when the provider returns an available finite amount and currency. Other revenue is not inferred. Known monthly costs use the existing owner-entered expense ledger and are labeled partial estimates. Empty, unknown, and failed responses remain unavailable; an explicit measured zero remains zero. Company profit is not established from incomplete coverage.

## Access and validation

Operations inherits the dashboard and BeastAdminShell owner/member-view checks. Middleware also verifies the authenticated user's role in `profiles` for direct Operations requests. Missing identity redirects to login, nonowners redirect to the member dashboard, and profile-query errors fail closed. Existing owner-only APIs remain the data authorization boundary.

Validation commands: `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, `node scripts/verify-operations-components.cjs`, and `git diff --check`. The component harness uses local test fixtures only; it does not sign into production or fabricate live business evidence. It checks missing vs explicit-zero money, empty expense records, mobile menu interaction, and denial before protected data fetches.

## Rollback

Base: `8467f983c4e3ef81bfe3b6123ae3550f2742004c` in `seangworld/thebeast`. Revert the Operations change to restore the previous admin navigation. Temporary redirects avoid a permanent browser cache. No database migration or provider configuration change is needed.

## Implementation evidence

- Complete repository test suite: 2,082 passed, 0 failed, 0 skipped.
- Full TypeScript, ESLint, production build, and diff whitespace checks: passed.
- Component interaction harness: passed, including owner/member isolation and financial empty/error/zero cases.
- New direct-request middleware tests: owner allowed; member, missing role, anonymous, and failed authorization source denied safely.
- No database artifacts changed. Existing financial calculations and API guards remain covered by the complete suite.
- Live authenticated owner/provider verification is separate from local fixture evidence; no production login or business transaction was performed during local verification.
