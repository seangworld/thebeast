import assert from "node:assert/strict";
import test from "node:test";
import { KDP_MANUSCRIPT_VERSION, kdpChapterInstructions, parseKdpChapterDraft } from "../src/lib/kdpManuscript";

test("KDP-003 accepts only sufficiently developed drafts with attributable sources", () => {
  const url = "https://example.gov/report";
  const draftText = Array.from({ length: 320 }, (_, index) => `word${index}`).join(" ");
  const parsed = parseKdpChapterDraft({
    output_text: JSON.stringify({ draftText, sourceNotes: [{ title: "Primary report", url, claim: "Supports the current program description." }], limitations: ["Confirm the publication date."] }),
    output: [{ action: { sources: [{ url, title: "Primary report" }] } }],
  }, "2026-09-12T18:00:00.000Z");
  assert.equal(KDP_MANUSCRIPT_VERSION, "0.1.0");
  assert.equal(parsed.sources.length, 1);
  assert.equal(parsed.sources[0].retrievedAt, "2026-09-12T18:00:00.000Z");
  assert.match(kdpChapterInstructions(), /review draft, not an approved or publishable manuscript/i);
});

test("KDP-003 rejects uncited and undersized provider output", () => {
  assert.throws(() => parseKdpChapterDraft({ output_text: JSON.stringify({ draftText: "Too short", sourceNotes: [], limitations: [] }), output: [] }), /failed minimum length/i);
});
