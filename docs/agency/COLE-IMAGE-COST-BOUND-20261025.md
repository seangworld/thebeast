# Cole first private draft: exact request cost-bound investigation

Date: 2026-10-25. Executor: Codex. Base: production main e8745f0b (PR303/304). No paid evaluation, generation, publication, credential changes or production deployment performed in this investigation. Overlapping open PR259 is historical Agency UI work; no competing active cost-bound implementation found.

## Exact configured production request

| Field | Value |
| --- | --- |
| Endpoint | POST https://api.openai.com/v1/images/edits |
| Model snapshot | gpt-image-2.5-flare-2026-09-08 |
| Reference | PR302 owner-approved tattoo-free Cole PNG, 1254 × 1254, 2,021,199 original bytes |
| Reference SHA-256 | c84a2646f592c74d92430e33753b10b87a3c9cc6dec1eb8e3539383842a4e3bb |
| Image input | Exactly one PNG data URL, read from existing private owner storage and checksum-verified; no mask |
| Prompt | Deterministic daily concept; exact face, athletic, 6 ft 1 in proportions, dark tousled hair, trimmed beard, NO tattoos; no borrowed images |
| Output | n=1; size=1024x1024; quality=low; output_format=jpeg |
| Other | No stream/partial-image request, no automatic retries, input_fidelity omitted |
| Local limits | 180-second client timeout, 8 MiB accepted image, one durable daily claim |

The local timeout, response-size rejection and job count do not impose a provider billing maximum. Preserve the original private reference, existing Instagram binding, exact-post approval and duplicate guards.

## Current official evidence and determination

[Model pricing](https://developers.openai.com/api/docs/models/gpt-image-2.5-flare): text input $5/M tokens; image input $8/M; image output $30/M. [Image guide](https://developers.openai.com/api/docs/guides/image-generation#cost-and-latency) says to measure actual usage after generation. Its current 1024-square calculator example shows 196 output tokens / $0.00588, explicitly an output-only estimate. Text and reference-image input are additional; direct edit requests do not receive the Responses-only cached-input discount. This is not a quoted total or maximum.

For text input T, reference-image input I and image output O, standard usage cost is (5T + 8I + 30O) / 1,000,000 USD. Fixed image dimensions and count do not establish published maximum values of I and O for this snapshot. The [edit request schema](https://developers.openai.com/api/reference/resources/images/methods/edit) supplies size, quality and n, but no documented per-request maximum billable tokens or dollar limit. The [Responses image-tool guide](https://developers.openai.com/api/docs/guides/tools-image-generation) does not establish an equivalent image-cost guarantee; moving APIs would add a mainline model charge, not prove a bound for the configured direct request. Vision-model patch calculators are not a documented replacement for GPT Image edit token accounting.

[Spend controls](https://developers.openai.com/api/docs/guides/spend-limits) now include organization/project hard monthly limits. Critically, the same official page warns that enforcement is delayed and spend can exceed the threshold. [Alerts](https://developers.openai.com/api/docs/guides/terraform/rate-limits-and-spend) alone do not stop requests. Neither establishes an absolute $10 maximum with a quantified overshoot allowance. No shared organization/project settings were changed.

**Determination:** the current documented contract does not support a defensible guaranteed monetary maximum for this exact reference edit. Do not set requestMaximumMicros to a typical price, treat a reservation as a provider cap, or dispatch under the unchanged strict ceiling. A provider-contract limitation remains; not an owner Meta/account setup problem. No first photo/caption draft exists.

## One proposed alternative; NOT executed or approved

Use one generation under existing included ChatGPT/Codex image usage, if that included allowance is available, then import the saved original result plus a locally authored caption into the existing private Agency review path. The [official included-image guide](https://learn.chatgpt.com/docs/image-generation) identifies the built-in model as gpt-image-2 and says it consumes general included usage; this is an explicitly proposed model/workflow change from Flare, not a silent substitution.

Estimated incremental API spending: **$0**, because this alternative would make no billed Images API request. Existing subscription charges are separate and not quoted here. It consumes included plan quota (potentially materially more than a text turn); availability is not assumed. Precise spending restriction: at most one generation invocation using verified included allowance, no API-key fallback, no purchased-credit draw, no top-up, purchase, upgrade or retry. If included allowance cannot be confirmed or is exhausted, stop. No guaranteed dollar-valued quota estimate is claimed.

The exact private Cole reference and tattoo-free identity constraints would remain. Save the resulting bytes unchanged with honest included-tool provenance, create a private draft through an explicit import path with owner/day duplicate protection, and require Sean's exact-post approval. Do not manufacture an API reservation/usage receipt for included-plan generation. No public posting or unattended mode. This proposal needs the owner's decision before changing the workflow or dispatching it; it does not implement automatic daily API preparation.

## Actual state and scope of this update

Read-only production check: approval_required control enabled, one held job, zero Cole Agency posts and zero reservations. No provider generation call was made. The $10 API ceiling, private storage and Instagram-only safeguards remain unchanged.

The canonical Cole dossier source and append-only maintenance/history receipt are updated in the accompanying draft PR. They are **not deployed**: the user explicitly rejected another readiness-only release. Live SW HQ synchronization remains pending a subsequent authorized functional batch; the live dossier already states that request_cost_bound_unverified blocks generation. This investigation is not success against the real-photo acceptance criterion.
