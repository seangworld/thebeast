# Baseline regression disposition — Issue #266

2026-10-18. Separate from Director competency evidence; no agent upgrade.

The previous 18 failures are resolved. Final `npm test`: 2,425/2,425 pass (two new Director regressions added). Most assertions lagged intentionally shipped behavior. No assertion was removed to waive security, authorization, persistence, payment truthfulness or source verification.

| Previous failures | Cause and disposition |
| --- | --- |
| BA-IA-101 grouped switcher; BA-112 Knowledge Inspector; BA-126 Planned Workspaces; BA-107 Prompt Library; infrastructure Admin navigation | Deployed exception-first navigation (`356d985b`, `c450a817`) intentionally removed routine tool links. Assert current 16 grouped items and omitted links; retained page content, read-only and owner-boundary assertions. Routes remain present. |
| Money Settings controls | Actual accessibility/control defect: five labels lacked their input association and Save button lacked disabled state. Restore `htmlFor` and disabled while loading/saving/load error; existing save-handler guard retained. No financial behavior change. |
| BP-230 workspace hierarchy; central module navigation; BP-230 Money navigation | Funding Sources, Connected Accounts and Settings already shipped (`089ac71e`, `f3b0b3b9`, `a0acee89`). Update exact hierarchy expectations. |
| BA-107 email callback; BA-106 recovery | Initiating-origin auth callbacks shipped in `f7dcf833`; tests expected production origin for previews. Update origin assertion; internal destination and unsafe URL checks retained. |
| BM-42D debt action labels | Provider Auto Pay / BeastMoney reminder copy clarified in `c66f30dd`. Keep provider-versus-reminder distinction. |
| Debt lifecycle restore | Archived debt restore narrowed in `3dd046c5`; assert current conditional Restore and manual_restore evidence, preserving lifecycle tests. |
| Owner-only development roster | Manager capability roster shipped in `c450a817`; replace obsolete description with current description and capability lookup. Authority, owner shell and sensitive-data checks retained. |
| Sitemap; public SEO inventory | BeastFusion and buyer walkthrough already shipped (`c6e35e1f`, `f886a99a`). Add both real public routes; private-route exclusions retained. |
| BM-37 Immediate Attention | `aed522d2` distinguishes PAYMENT SKIPPED from NO PAYMENT RECORDED; assert both and Review payment record, retaining durable interest-change assertions. |
| BP-230 record-backed briefing | `c66f30dd` uses a three-column large-screen briefing; update obsolete two-column class assertion. Record-backed content/freshness checks retained. |

Product change isolated in the baseline commit: Money Settings label associations and save disabled state only. The remaining changes in this commit are regression expectations for already shipped behavior. No dependency or security-gate changes.
