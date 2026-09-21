# ATLAS — private owner assistant

ATLAS: Assistant for Tasks, Learning, Action, and Strategy. Working identity approved by Sean. Wake phrase: **Hey Atlas**. Voice: OpenAI Onyx with neutral American male delivery instructions. Name availability/exclusivity has not been established.

## Delivered scope

- Owner-only workspace at `/dashboard/operations/atlas` with text and push-to-talk transcription review, AI audio playback and stop controls, conversation receipts, explicit memory, tasks, and paired-device controls.
- Background queue stores requests before responding; `after()` begins processing and a minute cron rescues queued work. Atomic claim prevents two workers executing one turn. Five-minute stale processing is marked failed without replay.
- Live read-only GitHub repository and Vercel deployment checks reuse existing BeastAdmin provider credentials; `Check my connections` works without an AI model call. Rundown and project-status questions can include fresh provider evidence and dated canonical BeastFusion context. Missing configuration is reported explicitly.
- Deterministic `Remember …` and `Add task: …` writes; fixed-destination `Check my sites` HEAD checks. Saved monitoring summaries provide dated operational context. The model gets bounded saved context and no arbitrary action tools.
- Mac companion: Vosk local wake/command recognition; commands alone are sent to BEAST. Ambient recordings are not uploaded/stored. Text reaches the existing AI provider for general answers. Generated voice comes from OpenAI. Mute, stop, keyboard controls, pairing and Keychain storage are included.

## Actual boundaries

No browser automation, remote desktop, arbitrary shell execution, code modification/deployment, messaging, payment, social publication, scheduled reminders, or new ongoing monitoring is enabled. Existing observation summaries are read, not regenerated. No automatic import of ChatGPT history, connectors, or Library todo files. ATLAS checklist is a separate saved list. User must install/run the companion on their Mac; this is not a signed installer or always-running iPhone service. Local wake detection uses speech recognition rather than a trained custom wake-word model and may mishear speech or speaker echo. A nearby speaker is not authenticated by voice. Headset testing is recommended.

## Security and cost controls

- All four tables use RLS and grant access only to service_role. Routes require a verified Supabase user with authoritative profiles.role=admin; browser mutations require the fixed production Origin.
- Device tokens contain 256 random bits, are hashed server-side, expire after 90 days, and are revocable. Admin role is checked on every request. Device bearer access cannot pair/revoke devices or delete/change existing records; those require browser owner authentication.
- AI provider key stays on the server. Existing OPENAI_API_KEY reused; ATLAS_MODEL optionally overrides the existing ordinary model default `gpt-5.6-luna`.
- OpenAI TTS `gpt-4o-mini-tts` / onyx; transcription `gpt-4o-mini-transcribe`. No API credit purchases are made.
- Atomic server-side quota: 100 calls each for turns, speech, transcription per UTC day, including failed reserved requests. This is a request cap, not a guaranteed dollar spending limit. Requests bounded to 4,000 characters, recordings to 30 seconds in UI / 4 MB server-side, output to 1,500 tokens, provider timeouts enforced.
- Fixed HTTPS homepages only, no redirects followed: BEAST, SEANGWORLD, News. Reachability is not functional acceptance.
- Microphone permission allowed only on the ATLAS document route; remains denied elsewhere.
- User must explicitly start microphone recording in web; local desktop listening begins only when companion starts. No automatic login/startup installation.

## Validation / setup

Run `npm test`, `npm run build`, and `python3 -m unittest discover -s desktop/atlas -p 'test_*.py'`. Browser fixture validates UI without live owner credentials. Supabase migrations require dev/prod access checks and quota verification. Mac microphone/wake accuracy/interruption and actual API audio must be verified on Sean's Mac; do not equate mocked flows with that acceptance.

Download source bundle: `/downloads/atlas-desktop.zip`. Canonical source in `desktop/atlas`. Rebuild zip after changing those sources. Existing `CRON_SECRET` enables `/api/cron/atlas`. No new credential is needed for ordinary web AI if the existing OpenAI account supports configured models.

Official references: https://developers.openai.com/api/docs/guides/text-to-speech ; https://developers.openai.com/api/docs/guides/speech-to-text ; https://alphacephei.com/vosk/install ; https://supabase.com/docs/guides/database/postgres/row-level-security

Web speech includes native audio controls so iPhone users can press Play if automatic playback is blocked, without requesting another paid synthesis.
