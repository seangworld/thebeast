import assert from "node:assert/strict";
import test from "node:test";
import JSZip from "jszip";
import { PDFDocument } from "pdf-lib";
import { buildKdpPackage, buildKdpPreparationFiles, KDP_PACKAGE_VERSION, requestedKdpInteriorFormats } from "../src/lib/kdpPackage";

const draft = Array.from({ length: 180 }, (_, index) => `word${index}`).join(" ");
const input = {
  publicationId: "8f7454d2-0262-446d-b9df-7a512c54ab71",
  title: "Practical Test Book",
  audience: "working families",
  topic: "Build a sustainable household plan",
  brief: { positioning: "A concise practical guide for working families.", readerOutcome: "Build a plan the household can maintain." },
  formats: ["ebook", "paperback"],
  chapters: [
    { chapterNumber: 1, title: "Start Here", draftText: draft, sources: [{ title: "Official source", url: "https://example.gov/one", claim: "Supports chapter one." }] },
    { chapterNumber: 2, title: "Next Steps", draftText: draft, sources: [{ title: "Official source", url: "https://example.gov/two", claim: "Supports chapter two." }] },
  ],
};

test("KDP-004 maps selected publication formats to applicable interior files", () => {
  assert.deepEqual(requestedKdpInteriorFormats(["ebook"]), ["epub"]);
  assert.deepEqual(requestedKdpInteriorFormats(["paperback", "hardcover"]), ["docx", "pdf"]);
  assert.deepEqual(requestedKdpInteriorFormats(["ebook", "hardcover"]), ["epub", "docx", "pdf"]);
});

test("KDP-004 builds structurally valid EPUB DOCX PDF and owner package files", async () => {
  const built = await buildKdpPackage(input);
  assert.equal(KDP_PACKAGE_VERSION, "0.2.0");
  assert.equal(built.fileName, "practical-test-book-kdp-package.zip");
  const zip = await JSZip.loadAsync(built.bytes);
  for (const name of ["ebook-interior.epub", "print-interior.docx", "print-interior.pdf", "manifest.json", "source-notes.json", "metadata-draft.json", "cover-brief.json", "pricing-worksheet.json", "quality-review-checklist.json", "submission-checklist.json", "README.txt"]) assert.ok(zip.file(name), `${name} should exist`);
  const epub = await JSZip.loadAsync(await zip.file("ebook-interior.epub")!.async("uint8array"));
  assert.equal((await epub.file("mimetype")!.async("string")), "application/epub+zip");
  assert.ok(epub.file("OEBPS/chapter-1.xhtml"));
  assert.ok(epub.file("OEBPS/chapter-2.xhtml"));
  const docx = await JSZip.loadAsync(await zip.file("print-interior.docx")!.async("uint8array"));
  assert.ok(docx.file("word/document.xml"));
  const pdf = await PDFDocument.load(await zip.file("print-interior.pdf")!.async("uint8array"));
  assert.ok(pdf.getPageCount() >= 3);
  const manifest = JSON.parse(await zip.file("manifest.json")!.async("string")) as { authority: string; generatedInteriors: unknown[]; printSpecification: { trim: string; bleed: boolean } };
  assert.equal(manifest.authority, "owner_review_package_only");
  assert.equal(manifest.generatedInteriors.length, 3);
  assert.deepEqual(manifest.printSpecification, { trim: "6 x 9 in", bleed: false, pageWidthPoints: 432, pageHeightPoints: 648, minimumMarginInches: 0.625 });
  const pricing = JSON.parse(await zip.file("pricing-worksheet.json")!.async("string"));
  assert.equal(pricing.status, "current_kdp_rule_and_cost_check_required");
  assert.equal(pricing.recommendations[0].targetListPriceUsd, 0.99);
  assert.equal(pricing.recommendations[1].marketplaceMinimumUsd, null);
  const submission = JSON.parse(await zip.file("submission-checklist.json")!.async("string"));
  assert.equal(submission.authority, "owner_only");
  assert.equal(submission.status, "not_authorized");
});

test("KDP-005 creates bounded metadata and incomplete review worksheets without claiming evidence", () => {
  const prepared = buildKdpPreparationFiles(input, 42);
  assert.ok(prepared.metadata.keywordCandidates.length <= 7);
  assert.equal(prepared.metadata.categorySelection.status, "required_in_current_kdp_flow");
  assert.equal(prepared.cover.print?.interiorPageCount, 42);
  assert.ok(prepared.quality.checks.every((item) => item.complete === false));
});

test("KDP-004 refuses to package incomplete chapter content", async () => {
  await assert.rejects(() => buildKdpPackage({ ...input, chapters: [{ ...input.chapters[0], draftText: "" }] }), /Approved chapter content is required/);
});
