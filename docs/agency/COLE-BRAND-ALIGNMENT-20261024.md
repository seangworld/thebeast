# Cole brand alignment and Meta discovery audit — 2026-10-24

## Current identity

Character **Cole Mercer**; public brand **Cole After Hours**; Instagram **@cole.after.hours**. **Sean Gatewood** is the real administrator and remains unchanged. Shared application name **SEANGWORLD Agency** is correct and remains unchanged.

Application constants now explicitly define the character, brand and Instagram username. Agency shows the brand/handle on Cole's card and in the existing brand configuration section. The discovery hint reuses the same username constant; expected Page ID, account persistence/binding behavior, credentials, permissions and safeguards are unchanged. Displayed brand identity is not a verified connection or binding.

## Verified read-only inventory

| Location | Current finding | Action |
| --- | --- | --- |
| Application source outside historical records | No active `sean.after.hours`, `Sean After Hours` or `Sean Mercer` match found | Make current brand/handle explicit; no global name replacement |
| Saved private Cole profile | One existing profile, `Cole Mercer`, inactive; locked visual/voice/audience/topics/disclosure unchanged; all profile fields checked for old names with zero matches | No database mutation or activation |
| Connections / bindings | No rows for Cole's owner; no binding | No account creation, reassignment or credential mutation |
| Facebook Page | `Cole After Hours`, ID `1266254166581850`; public vanity path `/cole.after.hours/` | Already correct; retain asset |
| Page cover/avatar | Visible Cole Mercer/After Hours artwork and existing character appearance | Retain approved artwork; no regeneration/redesign |
| Instagram public profile | `@cole.after.hours`, display name `Cole Mercer | Fitness • Adventure • Lifestyle` | Current identity is correct; no speculative public-profile rename |
| Business portfolio | Display label `sean.after.hours`, ID `1698592135026247` | Owner rename guide below; verification tracked in release receipt |
| Page/app ownership displays | `Owned by: sean.after.hours` for existing Cole Page and app | Derived portfolio label; verify after the portfolio rename, retain IDs |
| Meta portfolio People | Instagram-origin entry `sean.after.hours` with `@cole.after.hours` | Remaining internal label; public IG identity is already correct. No separate safe rename control verified; do not rename Sean's personal profile or recreate this entry |
| Meta business history | `Created by sean.after.hours on Oct 1, 2026` | Preserve historical attribution |
| Dated repository audit/history | Prior observations of portfolio `sean.after.hours` | Preserve accurate history; current dossier identity is explicit |

No saved Cole draft/publication rows were present. No profile, Page, portfolio, app, credential, connection, binding or historical asset was deleted or recreated. No production SQL writes were needed. The `future_character` presenter type is an existing internal record classification, not an outdated public character name; it remains unchanged. Leila remains deferred.

## Exact owner-controlled Meta rename

In the existing `sean.after.hours` business portfolio (ID `1698592135026247`), open **Settings → Business info → Edit beside the portfolio header → Business portfolio name**. Replace only that portfolio display name with the owner-approved agency label and Save. The owner has typed **SEANGWORLD AI Talent Agency** into the editor; that proposed umbrella label is separate from the public character brand **Cole After Hours**. Owner confirmation/save verification is pending at this audit point. The existing name-only editor was opened read-only for the owner; the executor did not type or save a value. Do not edit legal business details, administrator names, asset IDs or ownership. Verify that the same portfolio ID now has the new label and that Page/app ownership labels follow it. Leave historical Created by attribution intact. If the Instagram-origin People label remains old after refresh, record that location; do not guess at an account/identity edit.

## Coordinated connection diagnosis

The one completed fresh callback produced only these safe facts: `expected_page_absent`; 2 Pages returned; 2 usable Page tokens; 0 linked Instagram accounts; 0 expected-Page matches. No saved connection or verified binding. The owner reports that no Page checklist was listed. There is no evidence of an explicit Cole selection, and the event does not retain the identities of the two other Pages. Their ownership/access cannot be reconstructed or asserted from the count-only record; do not label other visible Pages as those returned Pages.

Read-only Meta asset comparison confirms:

- Cole Page and SEANGWORLD Agency app (`1437303488549044`) are both owned by the same `sean.after.hours` portfolio, with Sean Gatewood full access to both.
- Cole's Page is linked to `cole.after.hours`; actual Page access settings also show Sean full access through this portfolio.
- The app's Connected assets list is empty. Its Connect assets picker offers **Ad accounts** only (zero available), not Pages or Instagram accounts. The picker was cancelled without changes. An empty list here does not establish a missing Page-to-app assignment or justify asset recreation.
- The saved personal Business Integration is active with four enabled permissions; it does not expose a per-Page grant list. Business-level Connected apps warns some authorizations appear only in personal Business Integrations.

### Current official documentation and supported boundary

Meta's current [IG User reference](https://developers.facebook.com/documentation/instagram-platform/instagram-graph-api/reference/ig-user) explicitly says that if the app user received a Page role via Business Manager, the Facebook Login Instagram read path additionally requires **ads_read or ads_management**. Cole's observed portfolio-based role meets that condition. `ads_read` is the narrower documented option for that read requirement; `ads_management` is not justified by this task. This is an identified documented permission gap for Instagram reads, not proof that it caused `/me/accounts` to omit Cole.

Meta's [get-started guide](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/get-started/) and [User accounts reference](https://developers.facebook.com/docs/graph-api/reference/user/accounts/) describe Page discovery under the granting user and Page-task requirements. They do not establish that changing the portfolio's display name, adding an ad-account assignment, or requesting broad `business_management` will fix this recorded omission.

The app permission table independently shows `ads_read` and `ads_management` at **Add**, while the four current Instagram/Page permissions are **Ready for testing**. `business_management` is already configured in the app as Ready for testing, but is not requested by this OAuth flow; configured availability is not a granted user permission. The current application retains its four scopes. No additional permissions, ad assets or consent actions are added by this branding batch. A future approved scope correction should use the documented least-privilege option and preserve the Instagram-only purpose and all safeguards; validation would require separately authorized consent/reads. No reset, OAuth retry, paid call, publishing or automation is performed here. Branding cleanup does not itself solve the connection failure.

## Validation and release tracking

Full suite: 2,651 passed, zero failures. Standalone typecheck, lint (no ESLint warnings/errors), dossier source/history gates and production build passed, including the required security audit (zero vulnerabilities). Existing route tests cover unchanged scopes, state isolation, diagnostic redaction, account save and binding boundaries. No new tests were added for the reversible display-copy change. One coordinated production release is authorized; confirmed PR/SHA, live UI/dossier checks and owner Meta rename readback will be recorded in the linked Cole tracking record [Issue292](https://github.com/seangworld/thebeast/issues/292), without a second receipt deployment.
