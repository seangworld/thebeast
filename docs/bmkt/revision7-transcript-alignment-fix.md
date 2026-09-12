# Revision 7 transcript alignment recovery

## Production failure

Revision 7 timing preparation successfully generated the one-time Matthew narration asset and submitted that exact audio to Shotstack Ingest. The transcription completed far enough to reach local SRT alignment, then failed with:

`Provider transcription does not cover the exact Revision 7 narration in order.`

The generated narration asset and transcription source already exist and must be reused. Do not regenerate narration and do not submit a final render.

## Root cause

`narrationTimingEvidenceFromSrt` currently requires each provider SRT cue, after normalization, to equal the next exact slice of canonical script words. Speech-to-text can differ in punctuation, casing, tokenization, contractions, number forms, display/spoken brand forms, or minor recognition wording while timestamps remain valid. The exact slice comparison is therefore too strict for a timing source.

## Required recovery

1. Preserve canonical Revision 7 narration as the authoritative caption text.
2. Treat Shotstack SRT only as timing evidence.
3. Normalize both canonical narration and provider transcript into comparable lexical tokens.
4. Align provider tokens monotonically to canonical tokens using bounded sequence alignment rather than exact contiguous equality.
5. Allow harmless normalization differences such as punctuation/case, contractions, hyphenation, common numeric forms, and known Beast/SEANGWORLD speech normalization.
6. Permit small provider recognition substitutions/omissions only when global alignment remains high-confidence and in order. Do not silently accept materially different narration.
7. Build output caption cues from canonical narration words, not provider transcript wording, while using provider cue time boundaries/interpolation to assign actual timings.
8. Re-segment canonical captions to at most 6 words per cue.
9. Preserve monotonic, non-overlapping timing and scene bounds. If provider cues straddle a scene boundary, split timing at the canonical scene boundary rather than failing solely because the provider's SRT segmentation differs.
10. Derive and persist alignment diagnostics: canonical/provider token counts, matched tokens, substitutions, omissions, insertions, coverage ratio, confidence, duration drift, and max boundary adjustment.
11. Fail closed on low-confidence or out-of-order transcripts.
12. Keep the <=150 ms sync verification gate meaningful; do not fabricate `maxObservedDriftMs`.
13. Add a controlled recovery path for a failed Revision 7 timing preparation that reuses the existing `narrationAssetId`, `narrationAudioUrl`, and `transcriptionSourceId`. It may re-poll/fetch the existing transcription and re-run alignment, but must not call Shotstack Create again or create a second transcription source unless the owner explicitly authorizes a new paid attempt.
14. If recovery succeeds, bind timing evidence through the existing `bindNarrationTimingEvidence` path and allow quality to reach 100/100 only if every gate passes.
15. Final composition must continue to use the exact persisted pre-generated narration audio URL.
16. No final video render, publication, automatic retry, or new Shotstack narration generation during this fix.

## Regression tests

Add tests covering:

- punctuation/case differences accepted;
- `SEANGWORLD` / spoken normalization equivalence;
- contraction/tokenization differences accepted;
- provider cue segmentation different from canonical caption segmentation;
- provider cue crossing a scene boundary is safely split;
- minor isolated recognition error accepted only above confidence threshold;
- material transcript divergence rejected;
- out-of-order transcript rejected;
- canonical captions remain <=6 words;
- canonical caption wording is preserved rather than provider STT wording;
- no overlaps and all cues stay scene-bounded;
- existing failed timing preparation is recoverable without new Create/Ingest submission;
- exact existing narration audio remains final render audio source;
- final rendering and publishing remain blocked until evidence binds.

Run `npm test`, `npm run lint`, `npm run build`, and `git diff --check` before merge.
