# Kenny feedback — 37-item execution ledger

Owner requested implementation November 4, 2026. Executor: Codex. Two review branches: BeastOS `codex/kenny-account-onboarding`; BeastGuide `codex/beastguide-kenny-web-feedback`. No production release, hosted migration, SMTP/provider activation, spending or native packaging is authorized by this ledger. Preserve the released PR #7 / stabilized PR #6 data boundaries and rollback.

“Candidate” means implemented for review, not released or live-accepted. “Pending” is unfinished; research is not delivery. Existing live functionality is not re-claimed as newly tested.

| # | Item | Status / next action |
|---|---|---|
| 1 | User-selected unique username; no automatic assignment | Candidate mandatory canonical-registry setup gate; existing profiles trigger inspected and does not assign usernames. Production origin of reported automatic name remains unconfirmed. |
| 2 | Username rules below field | Candidate shared and claim UI; existing usernames displayed rather than replaced. |
| 3 | Mandatory post-verification setup | Candidate `/account-setup` reuses existing Profile editor, canonical username claim and age fields; flag requires reviewed additive self-read RPC. |
| 4 | Preserve usernames and IDs | Candidate claim refuses replacement and displays own authoritative value. Local PostgreSQL preservation/isolation passed. No hosted account/data writes. |
| 5 | Username + verification confirmation | Candidate own-username display, authenticated claim response and explicit verification status. |
| 6 | Clear username errors | Candidate unavailable/already-assigned/invalid/service-failure handling; private SQL errors never exposed. |
| 7 | Username confirmation email | Pending authenticated idempotent sender integration; existing SMTP untouched. See decision record. |
| 8 | Forgot Username | Candidate privacy-preserving email recovery link to own canonical username; shouldCreateUser=false; actual delivery pending. |
| 9 | Forgot Password | Existing flow retained, made accessible when canonical username login is enabled; focused tests passed. Live email recovery not repeated. |
| 10 | Login Help / FAQ | Candidate `/login-help` with requested guidance. |
| 11 | Resend verification | Candidate public recovery page, generic response and cooldown; existing authenticated resend retained. No signup call. |
| 12 | Account-change notifications | Pending hosted security-notification/template review and username application-mail path. |
| 13 | Persistent sessions/logout/revocation | Existing controls retained; candidate setup checks revoked/disabled sessions. Existing test coverage retained; fresh physical-device acceptance pending. |
| 14 | Return to originally requested app | Candidate retains initiating app through registration/verification, confirms verified success, and carries safe requested workspace/Guide page through explicit setup return. Foreign URLs rejected. SSO remains separate and unimplemented. |
| 15 | BeastGuide menu + dashboard | Existing flag/entitlement-aware menu retained; candidate dashboard shortcut plus Applications link. No feature flag override. |
| 16 | Application directory | Candidate registry-backed directory with actual statuses/links; no invented launches. |
| 17 | Preserve BeastOS PWA | Manifest, worker and installation implementation unchanged; existing tests retained. Physical phone install not repeated. |
| 18 | Cross-app secure SSO | Supported canonical OAuth 2.1/PKCE design researched; hosted configuration/security/client decision pending. No token relay implemented. |
| 19 | Shared future-app pattern | Canonical registry/setup and supported SSO contract documented; per-app isolation remains mandatory. Future apps not scaffolded. |
| 20 | Measure/remove refresh delay | BeastGuide candidate removes awaited external hydration. Held-provider browser cloud render measured 61 ms locally; Kenny's real signed-in timing remains unmeasured. |
| 21 | Progressive library hydration | Candidate cloud-first render; each provider result patches details without replacing controls, focus or current page; account-generation checks retained. |
| 22 | Top Bookmark item | Candidate moves Home Screen help out of footer into top navigation. |
| 23 | Authorized popular/trending feeds | Existing implemented adapters remain disabled without configuration/rights. |
| 24 | Movie provider rights | TMDB commercial route assessed; license/access decision pending; no verified approved alternative established. |
| 25 | Concert/event provider | Ticketmaster coverage/quotas/terms evaluated; commercial/storage approval and access pending. |
| 26 | UFC/PPV schedules | Sports free limits reviewed; complete coverage/rights not established. Manual events retained; no paid provider. |
| 27 | Sports artwork | Released official Chiefs URL/fallback retained. No artwork regression introduced; official source rechecked during this work: HTTP 200, image/svg+xml. |
| 28 | Kenny/other-user defects | Specific startup dependency fixed in candidate. Current hosted Guide verification callback is missing from canonical allowlist, causing fallback to BeastOS Site URL; exact one-URL repair awaits security/release approval. Additional tester reports remain pending. |
| 29 | Protect fixes/isolation/data/rollback | Existing release gates retained; no new hosted writes. Current working rollback remains PR #6 deployment dpl_8XRqjSTvXMCKRL1XNugbAxkeFuc3; serving PR #7 dpl_2RceGBX1UokoLWajsNRge8KXCh5J is unchanged. |
| 30 | iPhone/iPad application | Deferred until web/auth candidate stable and approved. |
| 31 | Native canonical Beast login | Deferred with native packaging; no separate identity project. |
| 32 | Explore BeastOS profile entry | Candidate standalone web Profile Explore BeastOS link, with separate-session notice; native behavior deferred. |
| 33 | Seamless native → BeastOS SSO | Pending supported SSO review/activation and native acceptance. |
| 34 | Native safe areas/navigation/callbacks | Web safe areas retained; native implementation deferred. |
| 35 | AdMob anchored banner/consent | Deferred; no app/unit exists yet, no paid/live ads activated. |
| 36 | App Store assets/privacy/deletion/validation | Deferred until web/native prerequisites; no Apple app record or submission claimed. |
| 37 | Submit/close V1 | Not complete. Requires actual native acceptance, exact release approval and confirmed Apple submission. |

No paid inference/evaluation, credentials rotation, production account changes or unrelated BeastOS/News work. The desktop workspace's pre-existing uncommitted universal-auth work remains untouched.
