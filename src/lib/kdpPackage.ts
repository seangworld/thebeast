import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { AlignmentType, Document, Footer, HeadingLevel, Packer, PageBreak, PageNumber, Paragraph, TextRun } from "docx";
import JSZip from "jszip";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";

export const KDP_PACKAGE_VERSION = "0.2.0";
const PRINT_WIDTH = 432;
const PRINT_HEIGHT = 648;
const PRINT_MARGIN = 45;

export type KdpPackageChapter = {
  chapterNumber: number;
  title: string;
  draftText: string;
  sources: Array<{ title: string; url: string; claim: string; retrievedAt?: string }>;
};

export type KdpPackageInput = {
  publicationId: string;
  title: string;
  audience?: string;
  topic?: string;
  brief?: { positioning?: string; readerOutcome?: string };
  formats: string[];
  chapters: KdpPackageChapter[];
};

const escapeXml = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "publication";
const paragraphs = (value: string) => value.split(/\n\s*\n/).map((item) => item.replace(/\s+/g, " ").trim()).filter(Boolean);
const sha256 = (value: Uint8Array) => createHash("sha256").update(value).digest("hex");
const words = (value: string) => value.toLowerCase().match(/[a-z0-9]+/g) || [];

export function buildKdpPreparationFiles(input: KdpPackageInput, printPageCount: number | null) {
  const excluded = new Set(["a", "an", "and", "for", "from", "in", "of", "on", "the", "to", "with"]);
  const keywords = Array.from(new Set(words(`${input.title} ${input.topic || ""} ${input.audience || ""}`).filter((word) => word.length > 2 && !excluded.has(word)))).slice(0, 7);
  const description = [input.brief?.positioning, input.brief?.readerOutcome].filter(Boolean).join("\n\n") || `${input.title} is a practical guide for ${input.audience || "the intended reader"}.`;
  const metadata = {
    status: "owner_review_required", title: input.title, subtitleCandidate: input.topic || null,
    descriptionDraft: description, keywordCandidates: keywords,
    categorySelection: { status: "required_in_current_kdp_flow", selected: [] },
    language: "English", publicationRights: "owner_must_confirm",
  };
  const cover = {
    status: "design_and_owner_review_required",
    creativeBrief: { title: input.title, audience: input.audience || null, promise: input.topic || null, direction: "Clear at thumbnail size; original, rights-cleared imagery and typography only." },
    ebook: input.formats.includes("ebook") ? { finalDimensions: "Confirm against current KDP cover guidance before export.", file: "Not generated in this package." } : null,
    print: input.formats.some((format) => format === "paperback" || format === "hardcover") ? { trim: "6 x 9 in", bleed: false, interiorPageCount: printPageCount, spineWidth: "Use the current KDP Cover Calculator with final page count, paper, ink and binding selections.", file: "Not generated in this package." } : null,
  };
  const pricing = {
    status: "current_kdp_rule_and_cost_check_required",
    marketplace: "Amazon.com / USD",
    recommendations: input.formats.map((format) => format === "ebook"
      ? { format, targetListPriceUsd: 0.99, strategy: "lowest eligible near-$0.99/$1 price", marketplaceMinimumUsd: null, royaltyPlan: null, ownerMustVerify: ["current eligibility", "royalty consequences", "delivery costs"] }
      : { format, targetListPriceUsd: null, strategy: "current printing-cost minimum plus owner margin", finalPageCount: printPageCount, printingCostUsd: null, marketplaceMinimumUsd: null, targetMarginUsd: 2, ownerMustVerify: ["paper and ink", "binding", "marketplace printing cost", "minimum list price"] }),
  };
  const quality = {
    status: "all_checks_require_recorded_review",
    checks: [
      "Read the complete manuscript for usefulness, coherence and formatting defects.",
      "Verify factual claims against source-notes.json and current primary sources.",
      "Run originality and copyright/trademark review; resolve every finding.",
      "Confirm rights for text, quotations, images, fonts, names and cover assets.",
      "Prepare accurate KDP AI-generated or AI-assisted content disclosure answers.",
      "Preview every selected format in the applicable KDP previewer before approval.",
    ].map((check) => ({ check, complete: false, notes: "" })),
  };
  const submission = {
    authority: "owner_only", status: "not_authorized",
    manualActions: ["KDP sign-in and identity checks", "tax, payment and profile confirmations", "ISBN decision", "metadata and category confirmation", "price and royalty confirmation", "final preview", "submission and publication"],
  };
  return { metadata, cover, pricing, quality, submission };
}

export function requestedKdpInteriorFormats(formats: string[]) {
  const selected = new Set(formats);
  const result: Array<"epub" | "docx" | "pdf"> = [];
  if (selected.has("ebook")) result.push("epub");
  if (selected.has("paperback") || selected.has("hardcover")) result.push("docx", "pdf");
  return result;
}

export async function buildKdpDocx(input: KdpPackageInput) {
  const children: Paragraph[] = [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 2400, after: 480 }, children: [new TextRun({ text: input.title, bold: true, size: 40, font: "Georgia", color: "000000" })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 }, children: [new TextRun({ text: "Contents", bold: true, size: 24, font: "Georgia", color: "000000" })] }),
    ...input.chapters.map((chapter) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [new TextRun({ text: `Chapter ${chapter.chapterNumber}  ${chapter.title}`, size: 20, font: "Georgia", color: "000000" })] })),
  ];
  for (const chapter of input.chapters) {
    children.push(
      new Paragraph({ children: [new PageBreak()] }),
      new Paragraph({ heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER, spacing: { before: 720, after: 360 }, keepNext: true, children: [new TextRun({ text: `Chapter ${chapter.chapterNumber}`, bold: true, size: 30, font: "Georgia", color: "000000" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 480 }, keepNext: true, children: [new TextRun({ text: chapter.title, italics: true, size: 24, font: "Georgia", color: "000000" })] }),
      ...paragraphs(chapter.draftText).map((text) => new Paragraph({ alignment: AlignmentType.JUSTIFIED, indent: { firstLine: 288 }, spacing: { line: 276, after: 80 }, children: [new TextRun({ text, size: 22, font: "Georgia", color: "000000" })] })),
    );
  }
  const document = new Document({
    creator: "SEANGWORLD KDP Factory", title: input.title, description: "KDP print interior",
    sections: [{
      properties: { page: { size: { width: 8640, height: 12960 }, margin: { top: 900, right: 900, bottom: 900, left: 900, header: 360, footer: 360 } } },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "333333" })] })] }) },
      children,
    }],
  });
  return new Uint8Array(await Packer.toBuffer(document));
}

function wrapPdfText(text: string, font: PDFFont, size: number, width: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= width || !line) line = candidate;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines;
}

export async function buildKdpPdf(input: KdpPackageInput) {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  pdf.setTitle(input.title); pdf.setAuthor("SEANGWORLD KDP Factory"); pdf.setCreator("SEANGWORLD KDP Factory"); pdf.setProducer("SEANGWORLD KDP Factory");
  const fontRoot = join(process.cwd(), "node_modules", "@fontsource", "source-serif-4", "files");
  const [bodyBytes, boldBytes, italicBytes] = await Promise.all([
    readFile(join(fontRoot, "source-serif-4-latin-400-normal.woff")),
    readFile(join(fontRoot, "source-serif-4-latin-700-normal.woff")),
    readFile(join(fontRoot, "source-serif-4-latin-400-italic.woff")),
  ]);
  const body = await pdf.embedFont(bodyBytes, { subset: true });
  const bold = await pdf.embedFont(boldBytes, { subset: true });
  const italic = await pdf.embedFont(italicBytes, { subset: true });
  const addPage = () => pdf.addPage([PRINT_WIDTH, PRINT_HEIGHT]);
  let page = addPage();
  const pages: PDFPage[] = [page];
  const titleLines = wrapPdfText(input.title, bold, 24, PRINT_WIDTH - PRINT_MARGIN * 2);
  let titleY = PRINT_HEIGHT - 190;
  for (const line of titleLines) { page.drawText(line, { x: (PRINT_WIDTH - bold.widthOfTextAtSize(line, 24)) / 2, y: titleY, size: 24, font: bold, color: rgb(0, 0, 0) }); titleY -= 32; }
  page.drawText("Contents", { x: (PRINT_WIDTH - bold.widthOfTextAtSize("Contents", 15)) / 2, y: titleY - 45, size: 15, font: bold });
  let contentsY = titleY - 78;
  for (const chapter of input.chapters) {
    const line = `Chapter ${chapter.chapterNumber}  ${chapter.title}`;
    for (const part of wrapPdfText(line, body, 11, PRINT_WIDTH - PRINT_MARGIN * 2)) {
      if (contentsY < 55) { page = addPage(); pages.push(page); contentsY = PRINT_HEIGHT - 55; }
      page.drawText(part, { x: PRINT_MARGIN, y: contentsY, size: 11, font: body }); contentsY -= 16;
    }
  }
  for (const chapter of input.chapters) {
    page = addPage(); pages.push(page);
    page.drawText(`Chapter ${chapter.chapterNumber}`, { x: (PRINT_WIDTH - bold.widthOfTextAtSize(`Chapter ${chapter.chapterNumber}`, 18)) / 2, y: PRINT_HEIGHT - 105, size: 18, font: bold });
    const chapterTitle = wrapPdfText(chapter.title, italic, 14, PRINT_WIDTH - PRINT_MARGIN * 2);
    let y = PRINT_HEIGHT - 137;
    for (const line of chapterTitle) { page.drawText(line, { x: (PRINT_WIDTH - italic.widthOfTextAtSize(line, 14)) / 2, y, size: 14, font: italic }); y -= 21; }
    y -= 18;
    for (const paragraph of paragraphs(chapter.draftText)) {
      const lines = wrapPdfText(paragraph, body, 11, PRINT_WIDTH - PRINT_MARGIN * 2 - 14);
      for (let index = 0; index < lines.length; index += 1) {
        if (y < 58) { page = addPage(); pages.push(page); y = PRINT_HEIGHT - 55; }
        page.drawText(lines[index], { x: PRINT_MARGIN + (index === 0 ? 14 : 0), y, size: 11, font: body, color: rgb(0, 0, 0) }); y -= 15;
      }
      y -= 6;
    }
  }
  pages.forEach((item, index) => { const number = String(index + 1); item.drawText(number, { x: (PRINT_WIDTH - body.widthOfTextAtSize(number, 9)) / 2, y: 25, size: 9, font: body, color: rgb(0.25, 0.25, 0.25) }); });
  return new Uint8Array(await pdf.save());
}

export async function buildKdpEpub(input: KdpPackageInput) {
  const zip = new JSZip();
  zip.file("mimetype", "application/epub+zip", { compression: "STORE" });
  zip.file("META-INF/container.xml", '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>');
  const manifestChapters = input.chapters.map((chapter) => `<item id="chapter-${chapter.chapterNumber}" href="chapter-${chapter.chapterNumber}.xhtml" media-type="application/xhtml+xml"/>`).join("");
  const spineChapters = input.chapters.map((chapter) => `<itemref idref="chapter-${chapter.chapterNumber}"/>`).join("");
  zip.file("OEBPS/content.opf", `<?xml version="1.0" encoding="UTF-8"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="book-id">urn:uuid:${escapeXml(input.publicationId)}</dc:identifier><dc:title>${escapeXml(input.title)}</dc:title><dc:language>en-US</dc:language><meta property="dcterms:modified">2026-09-12T00:00:00Z</meta></metadata><manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="style" href="styles.css" media-type="text/css"/><item id="title" href="title.xhtml" media-type="application/xhtml+xml"/>${manifestChapters}</manifest><spine><itemref idref="title"/>${spineChapters}</spine></package>`);
  zip.file("OEBPS/styles.css", "body{font-family:serif;line-height:1.45;margin:5%;}h1,h2{text-align:center;color:#000;}p{text-indent:1.2em;margin:.25em 0;}nav ol{list-style:none;padding:0;}nav li{margin:.6em 0;}");
  zip.file("OEBPS/title.xhtml", `<?xml version="1.0" encoding="UTF-8"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>${escapeXml(input.title)}</title><link rel="stylesheet" type="text/css" href="styles.css"/></head><body><h1>${escapeXml(input.title)}</h1></body></html>`);
  const navItems = input.chapters.map((chapter) => `<li><a href="chapter-${chapter.chapterNumber}.xhtml">Chapter ${chapter.chapterNumber} ${escapeXml(chapter.title)}</a></li>`).join("");
  zip.file("OEBPS/nav.xhtml", `<?xml version="1.0" encoding="UTF-8"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>Contents</title><link rel="stylesheet" type="text/css" href="styles.css"/></head><body><nav epub:type="toc" xmlns:epub="http://www.idpf.org/2007/ops"><h1>Contents</h1><ol>${navItems}</ol></nav></body></html>`);
  for (const chapter of input.chapters) {
    const body = paragraphs(chapter.draftText).map((item) => `<p>${escapeXml(item)}</p>`).join("");
    zip.file(`OEBPS/chapter-${chapter.chapterNumber}.xhtml`, `<?xml version="1.0" encoding="UTF-8"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>${escapeXml(chapter.title)}</title><link rel="stylesheet" type="text/css" href="styles.css"/></head><body><h1>Chapter ${chapter.chapterNumber}</h1><h2>${escapeXml(chapter.title)}</h2>${body}</body></html>`);
  }
  return new Uint8Array(await zip.generateAsync({ type: "uint8array", compression: "DEFLATE", compressionOptions: { level: 9 }, platform: "UNIX" }));
}

const epubChapterFiles = (zip: JSZip) => Object.keys(zip.files).filter((path) => /^OEBPS\/chapter-\d+\.xhtml$/.test(path));

export async function validateKdpInterior(format: "epub" | "docx" | "pdf", bytes: Uint8Array, chapterCount: number) {
  if (bytes.length < 500) throw new Error(`${format.toUpperCase()} output is unexpectedly small.`);
  if (format === "pdf") {
    if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") throw new Error("PDF signature is invalid.");
    const pdf = await PDFDocument.load(bytes);
    if (pdf.getPageCount() < chapterCount + 1) throw new Error("PDF does not contain the expected chapter pages.");
    return;
  }
  const zip = await JSZip.loadAsync(bytes);
  const required = format === "docx" ? ["[Content_Types].xml", "word/document.xml"] : ["mimetype", "META-INF/container.xml", "OEBPS/content.opf", "OEBPS/nav.xhtml"];
  if (required.some((path) => !zip.file(path))) throw new Error(`${format.toUpperCase()} package structure is incomplete.`);
  if (format === "epub" && epubChapterFiles(zip).length !== chapterCount) throw new Error("EPUB does not contain the expected chapters.");
}

export async function buildKdpPackage(input: KdpPackageInput) {
  if (!input.chapters.length || input.chapters.some((chapter) => !chapter.draftText.trim())) throw new Error("Approved chapter content is required.");
  const formats = requestedKdpInteriorFormats(input.formats);
  if (!formats.length) throw new Error("At least one supported KDP format is required.");
  const files: Record<string, Uint8Array> = {};
  for (const format of formats) {
    const bytes = format === "epub" ? await buildKdpEpub(input) : format === "docx" ? await buildKdpDocx(input) : await buildKdpPdf(input);
    await validateKdpInterior(format, bytes, input.chapters.length);
    files[format === "epub" ? "ebook-interior.epub" : `print-interior.${format}`] = bytes;
  }
  const printPageCount = files["print-interior.pdf"] ? (await PDFDocument.load(files["print-interior.pdf"])).getPageCount() : null;
  const preparation = buildKdpPreparationFiles(input, printPageCount);
  const manifest = {
    version: KDP_PACKAGE_VERSION, publicationId: input.publicationId, title: input.title, selectedFormats: input.formats,
    generatedInteriors: Object.entries(files).map(([name, bytes]) => ({ name, bytes: bytes.length, sha256: sha256(bytes) })),
    printSpecification: formats.includes("pdf") ? { trim: "6 x 9 in", bleed: false, pageWidthPoints: PRINT_WIDTH, pageHeightPoints: PRINT_HEIGHT, minimumMarginInches: 0.625 } : null,
    authority: "owner_review_package_only",
  };
  const sourceNotes = input.chapters.map((chapter) => ({ chapterNumber: chapter.chapterNumber, chapterTitle: chapter.title, sources: chapter.sources }));
  const bundle = new JSZip();
  for (const [name, bytes] of Object.entries(files)) bundle.file(name, bytes);
  bundle.file("manifest.json", JSON.stringify(manifest, null, 2));
  bundle.file("source-notes.json", JSON.stringify(sourceNotes, null, 2));
  bundle.file("metadata-draft.json", JSON.stringify(preparation.metadata, null, 2));
  bundle.file("cover-brief.json", JSON.stringify(preparation.cover, null, 2));
  bundle.file("pricing-worksheet.json", JSON.stringify(preparation.pricing, null, 2));
  bundle.file("quality-review-checklist.json", JSON.stringify(preparation.quality, null, 2));
  bundle.file("submission-checklist.json", JSON.stringify(preparation.submission, null, 2));
  bundle.file("README.txt", "SEANGWORLD KDP owner review package\n\nUse ebook-interior.epub for Kindle. Use print-interior.pdf for the 6 x 9 inch no-bleed print interior; print-interior.docx is the editable master. The metadata, cover, pricing, quality and submission files are preparation worksheets—not completed evidence or publication authority. Current KDP rules, costs, rights, disclosures, ISBN decisions and every Amazon account action still require review.\n");
  const bytes = new Uint8Array(await bundle.generateAsync({ type: "uint8array", compression: "DEFLATE", compressionOptions: { level: 9 } }));
  return { bytes, fileName: `${slug(input.title)}-kdp-package.zip`, manifest };
}
