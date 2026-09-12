import assert from "node:assert/strict";
import test from "node:test";
import JSZip from "jszip";
import { PDFDocument } from "pdf-lib";
import { buildKdpPackage, KDP_PACKAGE_VERSION, requestedKdpInteriorFormats } from "../src/lib/kdpPackage";

const draft = Array.from({ length: 180 }, (_, index) => `word${index}`).join(" ");
const input = {
  publicationId: "8f7454d2-0262-446d-b9df-7a512c54ab71",
  title: "Practical Test Book",
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
  assert.equal(KDP_PACKAGE_VERSION, "0.1.0");
  assert.equal(built.fileName, "practical-test-book-kdp-package.zip");
  const zip = await JSZip.loadAsync(built.bytes);
  for (const name of ["ebook-interior.epub", "print-interior.docx", "print-interior.pdf", "manifest.json", "source-notes.json", "README.txt"]) assert.ok(zip.file(name), `${name} should exist`);
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
});

test("KDP-004 refuses to package incomplete chapter content", async () => {
  await assert.rejects(() => buildKdpPackage({ ...input, chapters: [{ ...input.chapters[0], draftText: "" }] }), /Approved chapter content is required/);
});
