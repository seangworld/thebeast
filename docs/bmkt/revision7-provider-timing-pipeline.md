# Revision 7 — Actual Provider Timing Pipeline

## Problem discovered after Production creation

Revision 7 correctly blocks paid composition until actual narration timing evidence is bound, but the current implementation only accepts a caller-supplied timing-evidence payload. It does not yet acquire provider timing evidence itself.

That is insufficient for unattended BeastMarketing operation and leaves Owner intervention at the wrong abstraction layer.

## Required production flow

1. Generate the exact approved narration once using Shotstack Create API text-to-speech with the accepted Matthew / en-US settings.
2. Persist the resulting narration asset ID, immutable/authorized asset URL when ready, actual duration, provider request metadata, and any credit usage.
3. Transcribe that exact generated narration asset through Shotstack Ingest/transcription so timestamped SRT/VTT or equivalent provider timing data comes from the same audio that will be used in composition.
4. Parse the provider timestamps into Revision 7 `NarrationTimingEvidence` and bind them through the existing validation/binding path.
5. Validate complete text coverage, scene bounds, non-overlap, duration consistency, and <=150 ms accepted drift/tolerance.
6. Final Shotstack composition must use the exact pre-generated narration audio asset that was transcribed. It must not regenerate text-to-speech inside the final Edit request, because regenerating narration would invalidate the timing evidence.
7. Only after evidence is successfully bound may Revision 7 reach 100/100 and expose the one-owner-authorized paid composition render.

## Owner workflow

BeastAdmin should expose a controlled action such as `Prepare actual narration timing` on an unbound Revision 7 candidate.

The action may perform provider narration generation/transcription and therefore must disclose the estimated provider cost before execution and require Owner authorization for any paid provider call. It must not submit the final video composition or publish externally.

After provider processing is complete, BeastMarketing should poll/inspect asynchronously through explicit Owner-driven status checks or the existing status workflow, bind the evidence automatically, and show the resulting sync/preflight state.

## Render invariants

- Runtime remains >=60s (61.5s planned).
- Accepted Matthew voice/pacing remain unchanged.
- Center narration overlay stays removed.
- Bottom captions only, plus branding and CTA.
- Static `contain` screenshots only.
- Slower cadence and black-separated fades remain unchanged.
- `news-test-home` remains first and last.
- External and YouTube publishing remain disabled.
- No automatic retry.

## Evidence integrity

Never fabricate timing timestamps or mark `timingEvidenceBound=true` from estimated/calibrated timing. Persist actual provider identifiers, source asset identity, duration, transcription/timing source, verification timestamp, and sanitized diagnostics.
