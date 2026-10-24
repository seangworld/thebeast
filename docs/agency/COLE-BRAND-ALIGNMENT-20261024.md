# Cole brand alignment and Meta discovery audit — 2026-10-24

## Current identity

Umbrella agency **Beast AI Talent Agency**. Cole is the first talent: character **Cole Mercer**; public brand **Cole After Hours**; Instagram **@cole.after.hours**. **Sean Gatewood** is the real administrator and remains unchanged. Shared application name **SEANGWORLD Agency** is correct and remains unchanged.

Application constants now explicitly define the umbrella agency, character, brand and Instagram username. Agency shows the brand/handle on Cole's card and in the existing brand configuration section. The discovery hint reuses the same username constant; expected Page ID, account persistence/binding behavior, credentials, permissions and safeguards are unchanged. Displayed brand identity is not a verified connection or binding.

## Verified read-only inventory

| Location | Current finding | Action |
| --- | --- | --- |
| Application source outside historical records | No active `sean.after.hours`, `Sean After Hours` or `Sean Mercer` match found | Make current brand/handle explicit; no global name replacement |
| Saved private Cole profile | One existing profile, `Cole Mercer`, inactive; locked visual/voice/audience/topics/disclosure unchanged; all profile fields checked for old names with zero matches | No database mutation or activation |
| Connections / bindings | No rows for Cole's owner; no binding | No account creation, reassignment or credential mutation |
| Facebook Page | `Cole After Hours`, ID `1266254166581850`; public vanity path `/cole.after.hours/` | Already correct; retain asset |
| Page cover/avatar | Visible Cole Mercer/After Hours artwork and existing character appearance | Retain approved artwork; no regeneration/redesign |
| Instagram public profile | `@cole.after.hours`, display name `Cole Mercer | Fitness • Adventure • Lifestyle` | Current identity is correct; no speculative public-profile rename |
| Business portfolio | Owner saved **Beast AI Talent Agency**; same ID `1698592135026247` verified | Rename complete; no asset recreation |
| Page/app ownership displays | Now `Owned by: Beast AI Talent Agency`; same Page ID `1266254166581850` and app ID `1437303488549044` verified | Derived labels updated; IDs retained |
| Meta portfolio People | Owner corrected the Instagram-origin entry to **Cole Mercer**, still `@cole.after.hours`; same selected entry ID `61595148623612` verified | Name-only edit complete; access and real administrator unchanged |
| Meta business history | `Created by sean.after.hours on Oct 1, 2026` | Preserve historical attribution |
| Dated repository audit/history | Prior observations of portfolio `sean.after.hours` | Preserve accurate history; current dossier identity is explicit |

No saved Cole draft/publication rows were present. No profile, Page, portfolio, app, credential, connection, binding or historical asset was deleted or recreated. No production SQL writes were needed. The `future_character` presenter type is an existing internal record classification, not an outdated public character name; it remains unchanged. Leila remains deferred.

## Exact owner-controlled Meta rename

For the portfolio originally named `sean.after.hours` (ID `1698592135026247`), open **Settings → Business info → Edit beside the portfolio header → Business portfolio name**. The owner saved **Beast AI Talent Agency** in that name-only field and explicitly confirmed it as the umbrella agency. Readback verifies portfolio ID `1698592135026247`, Page ID `1266254166581850` and app ID `1437303488549044` are unchanged. Both existing asset ownership labels now use Beast AI Talent Agency. The public character brand remains Cole After Hours. The existing name-only editor was opened read-only for the owner; the executor did not type or save a value. Do not edit legal business details, administrator names, asset IDs or ownership. Verify that the same portfolio ID now has the new label and that Page/app ownership labels follow it. Leave historical Created by attribution intact. The owner subsequently found Edit on the Instagram-origin People entry and saved First name Cole / Last name Mercer. Readback confirmed the correct name, unchanged handle, same selected entry ID and same portfolio, with Save disabled when the already-saved name editor was reopened. Sean Gatewood remained the real administrator.

## Coordinated connection diagnosis

The one completed fresh callback produced only these safe facts: `expected_page_absent`; 2 Pages returned; 2 usable Page tokens; 0 linked Instagram accounts; 0 expected-Page matches. No saved connection or verified binding. The owner reports that no Page checklist was listed. There is no evidence of an explicit Cole selection, and the event does not retain the identities of the two other Pages. Their ownership/access cannot be reconstructed or asserted from the count-only record; do not label other visible Pages as those returned Pages.

Read-only Meta asset comparison confirms:

- Cole Page and SEANGWORLD Agency app (`1437303488549044`) are both owned by the same portfolio, now named **Beast AI Talent Agency** (previously `sean.after.hours`), with Sean Gatewood full access to both.
- Cole's Page is linked to `cole.after.hours`; actual Page access settings also show Sean full access through this portfolio.
- The app's Connected assets list is empty. Its Connect assets picker offers **Ad accounts** only (zero available), not Pages or Instagram accounts. The picker was cancelled without changes. An empty list here does not establish a missing Page-to-app assignment or justify asset recreation.
- The saved personal Business Integration is active with four enabled permissions; it does not expose a per-Page grant list. Business-level Connected apps warns some authorizations appear only in personal Business Integrations.

### Current official documentation and supported boundary

Meta's current [IG User reference](https://developers.facebook.com/documentation/instagram-platform/instagram-graph-api/reference/ig-user) explicitly says that if the app user received a Page role via Business Manager, the Facebook Login Instagram read path additionally requires **ads_read or ads_management**. Cole's observed portfolio-based role meets that condition. `ads_read` is the narrower documented option for that read requirement; `ads_management` is not justified by this task. This is an identified documented permission gap for Instagram reads, not proof that it caused `/me/accounts` to omit Cole.

Meta's [get-started guide](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/get-started/) and [User accounts reference](https://developers.facebook.com/docs/graph-api/reference/user/accounts/) describe Page discovery under the granting user and Page-task requirements. They do not establish that changing the portfolio's display name, adding an ad-account assignment, or requesting broad `business_management` will fix this recorded omission.

The app permission table independently shows `ads_read` and `ads_management` at **Add**, while the four current Instagram/Page permissions are **Ready for testing**. `business_management` is already configured in the app as Ready for testing, but is not requested by this OAuth flow; configured availability is not a granted user permission. The current application retains its four scopes. No additional permissions, ad assets or consent actions are added by this branding batch. A future approved scope correction should use the documented least-privilege option and preserve the Instagram-only purpose and all safeguards; validation would require separately authorized consent/reads. No reset, OAuth retry, paid call, publishing or automation is performed here. Branding cleanup does not itself solve the connection failure.

## Validation and release tracking

Full suite: 2,651 passed, zero failures. Standalone typecheck, lint (no ESLint warnings/errors), dossier source/history gates and production build passed, including the required security audit (zero vulnerabilities). Existing route tests cover unchanged scopes, state isolation, diagnostic redaction, account save and binding boundaries. No new tests were added for the reversible display-copy change. One coordinated production release is authorized; confirmed PR/SHA, live UI/dossier checks and owner Meta rename readback will be recorded in the linked Cole tracking record [Issue292](https://github.com/seangworld/thebeast/issues/292), without a second receipt deployment.

### Future supported permission correction (not executed)

The existing app UI path is **Use cases → Manage messaging & content on Instagram → Customize → Permissions and features → ads_read**; the row currently offers **Add**. A separately authorized correction would configure/request `ads_read` alongside the current four scopes, preserve all binding/state safeguards, and validate with a separately authorized future consent/read. Do not choose `ads_management`, add ad-account assets, or request broad permissions merely to experiment. No such permission addition or consent retry is part of this read-only diagnosis/branding release, and the documented Instagram-read requirement must not be presented as a proven cause of the earlier Page-list omission.

After the owner's rename, read-only verification shows the portfolio and both existing asset ownership displays use **Beast AI Talent Agency**, with the same IDs. The earlier observation that no name-only control was found was superseded by the owner locating Edit and saving Cole Mercer. This correction retains that investigation history rather than rewriting old evidence. No access was removed or changed. Instagram public profile/handle and Facebook cover/Page/vanity path remain Cole-branded.

## Post-name-correction attempt

The owner separately authorized and completed one further connection attempt after correcting the People name. Production diagnostic release PR296 remains live. Its safe event again returned expected_page_absent: 2 Pages, 2 Page tokens, 0 linked Instagram accounts, 0 expected-Page matches. Read-only production lookup confirms no saved Instagram connection and no Cole binding. Therefore the label change did not fix discovery. No further attempt, paid call, permission addition, binding, publishing or automation was initiated. Remaining old names are accurate historical Created by attribution and dated audit/history; no known active Cole label retains the old name.
