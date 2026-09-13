import { readFile } from "node:fs/promises";
import { join } from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import type { AuditFinding, AuditSeverity, ClientCodeAudit } from "@/lib/clientCodeAudit";

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 46;
const HEADER_HEIGHT = 44;
const FOOTER_HEIGHT = 30;
const CONTENT_TOP = PAGE_HEIGHT - HEADER_HEIGHT - 24;
const CONTENT_BOTTOM = FOOTER_HEIGHT + 18;

const color = (hex: string) => {
  const value = hex.replace("#", "");
  return rgb(Number.parseInt(value.slice(0, 2), 16) / 255, Number.parseInt(value.slice(2, 4), 16) / 255, Number.parseInt(value.slice(4, 6), 16) / 255);
};

const COLORS = {
  navy: color("#081525"),
  panel: color("#13243A"),
  cyan: color("#38D8FF"),
  teal: color("#31D0AA"),
  red: color("#E45462"),
  amber: color("#D99320"),
  ink: color("#172033"),
  muted: color("#607086"),
  line: color("#D8E2EA"),
  pale: color("#EEF4F8"),
  white: rgb(1, 1, 1),
};

type Fonts = { regular: PDFFont; bold: PDFFont; italic: PDFFont };
type PageState = { page: PDFPage; y: number };

const cleanText = (value: string) => value
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
  .replace(/[–—]/g, "-")
  .replace(/\s+/g, " ")
  .trim();

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = cleanText(text).split(" ").filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    if (font.widthOfTextAtSize(word, size) <= maxWidth) {
      line = word;
      continue;
    }
    let fragment = "";
    for (const character of word) {
      if (fragment && font.widthOfTextAtSize(fragment + character, size) > maxWidth) {
        lines.push(fragment);
        fragment = character;
      } else fragment += character;
    }
    line = fragment;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function drawLines(page: PDFPage, lines: string[], options: { x: number; y: number; font: PDFFont; size: number; lineHeight: number; color?: RGB }) {
  lines.forEach((line, index) => page.drawText(line, { x: options.x, y: options.y - index * options.lineHeight, size: options.size, font: options.font, color: options.color || COLORS.ink }));
  return options.y - lines.length * options.lineHeight;
}

function limitedLines(text: string, font: PDFFont, size: number, maxWidth: number, maximum: number) {
  const lines = wrapText(text, font, size, maxWidth);
  if (lines.length <= maximum) return lines;
  const visible = lines.slice(0, maximum);
  let last = visible[maximum - 1];
  while (last && font.widthOfTextAtSize(`${last}...`, size) > maxWidth) last = last.slice(0, -1);
  visible[maximum - 1] = `${last}...`;
  return visible;
}

function severityColor(severity: AuditSeverity) {
  if (severity === "critical" || severity === "high") return COLORS.red;
  if (severity === "medium") return COLORS.amber;
  return COLORS.teal;
}

function findingLocation(finding: AuditFinding) {
  return finding.path ? `${finding.path}:${finding.line || 1}${finding.additionalLines?.length ? ` (+${finding.additionalLines.length} more)` : ""}` : "Project-wide";
}

async function loadFonts(pdf: PDFDocument): Promise<Fonts> {
  pdf.registerFontkit(fontkit);
  const directory = join(process.cwd(), "node_modules", "@fontsource", "source-serif-4", "files");
  const [regular, bold, italic] = await Promise.all([
    readFile(join(directory, "source-serif-4-latin-400-normal.woff")),
    readFile(join(directory, "source-serif-4-latin-700-normal.woff")),
    readFile(join(directory, "source-serif-4-latin-400-italic.woff")),
  ]);
  return {
    regular: await pdf.embedFont(regular, { subset: true }),
    bold: await pdf.embedFont(bold, { subset: true }),
    italic: await pdf.embedFont(italic, { subset: true }),
  };
}

function decoratePage(page: PDFPage, fonts: Fonts, pageNumber: number) {
  page.drawRectangle({ x: 0, y: PAGE_HEIGHT - HEADER_HEIGHT, width: PAGE_WIDTH, height: HEADER_HEIGHT, color: COLORS.navy });
  page.drawText("SEANGWORLD  |  CODE RISK SCAN", { x: MARGIN, y: PAGE_HEIGHT - 28, size: 9, font: fonts.bold, color: COLORS.cyan });
  const pageLabel = `PAGE ${pageNumber}`;
  page.drawText(pageLabel, { x: PAGE_WIDTH - MARGIN - fonts.bold.widthOfTextAtSize(pageLabel, 9), y: PAGE_HEIGHT - 28, size: 9, font: fonts.bold, color: COLORS.white });
  page.drawLine({ start: { x: MARGIN, y: FOOTER_HEIGHT + 9 }, end: { x: PAGE_WIDTH - MARGIN, y: FOOTER_HEIGHT + 9 }, thickness: 0.7, color: COLORS.line });
  page.drawText("Static source-code review - submitted code was not executed", { x: MARGIN, y: 18, size: 7.5, font: fonts.italic, color: COLORS.muted });
}

function addContentPage(pdf: PDFDocument, fonts: Fonts, title: string) {
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  decoratePage(page, fonts, pdf.getPageCount());
  page.drawText(title, { x: MARGIN, y: CONTENT_TOP, size: 22, font: fonts.bold, color: COLORS.navy });
  page.drawRectangle({ x: MARGIN, y: CONTENT_TOP - 11, width: 42, height: 3, color: COLORS.cyan });
  return { page, y: CONTENT_TOP - 34 };
}

function ensureSpace(pdf: PDFDocument, fonts: Fonts, state: PageState, needed: number, continuationTitle: string) {
  if (state.y - needed >= CONTENT_BOTTOM) return state;
  return addContentPage(pdf, fonts, continuationTitle);
}

function drawSectionHeading(state: PageState, fonts: Fonts, title: string) {
  state.page.drawText(title, { x: MARGIN, y: state.y, size: 15, font: fonts.bold, color: COLORS.navy });
  state.y -= 24;
}

function drawBullet(state: PageState, fonts: Fonts, text: string, size = 9.5) {
  const lines = wrapText(text, fonts.regular, size, PAGE_WIDTH - MARGIN * 2 - 18);
  state.page.drawCircle({ x: MARGIN + 3, y: state.y + 3, size: 2.3, color: COLORS.teal });
  state.y = drawLines(state.page, lines, { x: MARGIN + 14, y: state.y + 6, font: fonts.regular, size, lineHeight: size + 3, color: COLORS.ink }) - 4;
}

function drawCover(pdf: PDFDocument, fonts: Fonts, audit: ClientCodeAudit) {
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  page.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: COLORS.pale });
  page.drawRectangle({ x: 0, y: 555, width: PAGE_WIDTH, height: 237, color: COLORS.navy });
  page.drawText("SEANGWORLD  |  CODE RISK SCAN", { x: MARGIN, y: 754, size: 9, font: fonts.bold, color: COLORS.cyan });
  page.drawText("STATIC CODE ASSESSMENT", { x: MARGIN, y: 699, size: 11, font: fonts.bold, color: COLORS.teal });
  const titleLines = limitedLines(audit.project.projectName, fonts.bold, 29, PAGE_WIDTH - MARGIN * 2, 2);
  drawLines(page, titleLines, { x: MARGIN, y: 660, font: fonts.bold, size: 29, lineHeight: 32, color: COLORS.white });
  const titleBottom = 660 - titleLines.length * 32;
  const meta = `Prepared for ${audit.project.clientName}  |  ${new Date(audit.generatedAt).toISOString().slice(0, 10)}`;
  drawLines(page, limitedLines(meta, fonts.regular, 10, PAGE_WIDTH - MARGIN * 2, 2), { x: MARGIN, y: titleBottom - 1, font: fonts.regular, size: 10, lineHeight: 13, color: COLORS.white });
  const focusLines = limitedLines(`Focus: ${audit.project.focus}`, fonts.italic, 9, PAGE_WIDTH - MARGIN * 2, 2);
  drawLines(page, focusLines, { x: MARGIN, y: titleBottom - 31, font: fonts.italic, size: 9, lineHeight: 12, color: color("#B8C9D9") });

  const stats = [
    [String(audit.inventory.filesReviewed), "FILES REVIEWED"],
    [String(audit.findings.length), "TOTAL FINDINGS"],
    [String(audit.summary.critical + audit.summary.high), "HIGH + CRITICAL"],
    [audit.attentionLevel.toUpperCase(), "ATTENTION"],
  ];
  const gap = 8;
  const width = (PAGE_WIDTH - MARGIN * 2 - gap * 3) / 4;
  stats.forEach(([value, label], index) => {
    const x = MARGIN + index * (width + gap);
    page.drawRectangle({ x, y: 477, width, height: 61, color: COLORS.white, borderColor: COLORS.line, borderWidth: 0.7 });
    page.drawText(value, { x: x + 10, y: 507, size: value.length > 8 ? 12 : 20, font: fonts.bold, color: index === 3 ? severityColor(audit.summary.critical ? "critical" : audit.summary.high ? "high" : audit.summary.medium ? "medium" : "low") : COLORS.navy });
    page.drawText(label, { x: x + 10, y: 488, size: 6.8, font: fonts.bold, color: COLORS.muted });
  });

  page.drawText("Executive direction", { x: MARGIN, y: 443, size: 16, font: fonts.bold, color: COLORS.navy });
  const direction = audit.findings.length
    ? `Confirm ${audit.findings[0].id} (${audit.findings[0].title}) first, then follow the prioritized remediation plan. Findings are static indicators that require review in project context.`
    : "No configured rule matched. Complete human architecture review and runtime verification before release.";
  drawLines(page, limitedLines(direction, fonts.regular, 10, PAGE_WIDTH - MARGIN * 2, 4), { x: MARGIN, y: 421, font: fonts.regular, size: 10, lineHeight: 14, color: COLORS.ink });

  page.drawText("Top five actions before launch", { x: MARGIN, y: 354, size: 16, font: fonts.bold, color: COLORS.navy });
  const actions = audit.topActions.length ? audit.topActions : [{ id: "CHECK", severity: "info" as const, title: "Complete runtime verification", recommendation: "Run the supplied verification checklist in an isolated environment." }];
  let y = 328;
  actions.slice(0, 5).forEach((action, index) => {
    const accent = severityColor(action.severity);
    page.drawCircle({ x: MARGIN + 10, y: y + 4, size: 10, color: accent });
    const number = String(index + 1);
    page.drawText(number, { x: MARGIN + 10 - fonts.bold.widthOfTextAtSize(number, 8) / 2, y: y + 1, size: 8, font: fonts.bold, color: COLORS.white });
    page.drawText(`${action.id}  ${cleanText(action.title)}`, { x: MARGIN + 30, y: y + 9, size: 9.5, font: fonts.bold, color: COLORS.navy });
    const recommendation = limitedLines(action.recommendation, fonts.regular, 8.5, PAGE_WIDTH - MARGIN * 2 - 30, 2);
    drawLines(page, recommendation, { x: MARGIN + 30, y: y - 4, font: fonts.regular, size: 8.5, lineHeight: 10.5, color: COLORS.muted });
    y -= 49;
  });

  page.drawRectangle({ x: MARGIN, y: 42, width: PAGE_WIDTH - MARGIN * 2, height: 34, color: COLORS.panel });
  page.drawText("One scan  |  Prioritized findings  |  Remediation roadmap  |  Client-ready package", { x: MARGIN + 14, y: 55, size: 8.4, font: fonts.bold, color: COLORS.white });
}

function drawFindings(pdf: PDFDocument, fonts: Fonts, audit: ClientCodeAudit) {
  let state = addContentPage(pdf, fonts, "Prioritized findings");
  if (!audit.findings.length) {
    state.page.drawRectangle({ x: MARGIN, y: state.y - 82, width: PAGE_WIDTH - MARGIN * 2, height: 82, color: COLORS.pale, borderColor: COLORS.line, borderWidth: 0.7 });
    state.page.drawText("No configured static rule matched", { x: MARGIN + 16, y: state.y - 27, size: 13, font: fonts.bold, color: COLORS.navy });
    drawLines(state.page, wrapText("This does not certify that the application is defect-free. Complete manual architecture review and the supplied runtime checklist.", fonts.regular, 9.5, PAGE_WIDTH - MARGIN * 2 - 32), { x: MARGIN + 16, y: state.y - 47, font: fonts.regular, size: 9.5, lineHeight: 12, color: COLORS.ink });
    return;
  }

  for (const finding of audit.findings) {
    const bodyWidth = PAGE_WIDTH - MARGIN * 2 - 32;
    const titleLines = wrapText(`${finding.id}  ${finding.title}`, fonts.bold, 11, bodyWidth - 78);
    const locationLines = wrapText(`${finding.category.toUpperCase()}  |  ${findingLocation(finding)}  |  ${finding.occurrences} occurrence(s)`, fonts.regular, 7.8, bodyWidth);
    const explanationLines = wrapText(finding.explanation, fonts.regular, 9, bodyWidth);
    const recommendationLines = wrapText(`Recommendation: ${finding.recommendation}`, fonts.regular, 9, bodyWidth);
    const cardHeight = 25 + titleLines.length * 13 + locationLines.length * 10 + explanationLines.length * 11.5 + recommendationLines.length * 11.5 + 22;
    state = ensureSpace(pdf, fonts, state, cardHeight + 12, "Prioritized findings - continued");
    const top = state.y;
    state.page.drawRectangle({ x: MARGIN, y: top - cardHeight, width: PAGE_WIDTH - MARGIN * 2, height: cardHeight, color: COLORS.white, borderColor: COLORS.line, borderWidth: 0.8 });
    state.page.drawRectangle({ x: MARGIN, y: top - cardHeight, width: 5, height: cardHeight, color: severityColor(finding.severity) });
    const badge = finding.severity.toUpperCase();
    const badgeWidth = Math.max(50, fonts.bold.widthOfTextAtSize(badge, 7.5) + 16);
    state.page.drawRectangle({ x: PAGE_WIDTH - MARGIN - badgeWidth - 14, y: top - 24, width: badgeWidth, height: 16, color: severityColor(finding.severity) });
    state.page.drawText(badge, { x: PAGE_WIDTH - MARGIN - badgeWidth - 6, y: top - 19, size: 7.5, font: fonts.bold, color: COLORS.white });
    let y = drawLines(state.page, titleLines, { x: MARGIN + 16, y: top - 19, font: fonts.bold, size: 11, lineHeight: 13, color: COLORS.navy });
    y = drawLines(state.page, locationLines, { x: MARGIN + 16, y: y - 2, font: fonts.regular, size: 7.8, lineHeight: 10, color: COLORS.muted });
    y = drawLines(state.page, explanationLines, { x: MARGIN + 16, y: y - 5, font: fonts.regular, size: 9, lineHeight: 11.5, color: COLORS.ink });
    drawLines(state.page, recommendationLines, { x: MARGIN + 16, y: y - 4, font: fonts.italic, size: 9, lineHeight: 11.5, color: COLORS.ink });
    state.y = top - cardHeight - 12;
  }
}

function drawRoadmap(pdf: PDFDocument, fonts: Fonts, audit: ClientCodeAudit) {
  let state = addContentPage(pdf, fonts, "Remediation roadmap");
  const phases: Array<{ title: string; severities: AuditSeverity[]; fallback: string }> = [
    { title: "1. Immediate - confirm before release", severities: ["critical", "high"], fallback: "No critical or high findings were assigned to this phase." },
    { title: "2. Next - address before the next milestone", severities: ["medium"], fallback: "No medium findings were assigned to this phase." },
    { title: "3. Planned cleanup", severities: ["low", "info"], fallback: "No low-priority findings were assigned to this phase." },
  ];
  for (const phase of phases) {
    state = ensureSpace(pdf, fonts, state, 60, "Remediation roadmap - continued");
    drawSectionHeading(state, fonts, phase.title);
    const items = audit.findings.filter((finding) => phase.severities.includes(finding.severity));
    if (!items.length) drawBullet(state, fonts, phase.fallback);
    for (const finding of items) {
      const text = `${finding.id} - ${finding.title}: ${finding.recommendation}`;
      const height = wrapText(text, fonts.regular, 9, PAGE_WIDTH - MARGIN * 2 - 18).length * 12 + 8;
      state = ensureSpace(pdf, fonts, state, height, "Remediation roadmap - continued");
      drawBullet(state, fonts, text, 9);
    }
    state.y -= 8;
  }

  state = ensureSpace(pdf, fonts, state, 120, "Coverage and limitations");
  drawSectionHeading(state, fonts, "Scan coverage");
  for (const check of audit.scanCoverage) {
    const text = `${check.name} [${check.status}]: ${check.detail}`;
    const height = wrapText(text, fonts.regular, 8.7, PAGE_WIDTH - MARGIN * 2 - 18).length * 11.7 + 7;
    state = ensureSpace(pdf, fonts, state, height, "Coverage and limitations - continued");
    drawBullet(state, fonts, text, 8.7);
  }

  state = ensureSpace(pdf, fonts, state, 100, "Coverage and limitations - continued");
  state.y -= 8;
  drawSectionHeading(state, fonts, "Scope limitations");
  for (const limitation of audit.limitations) {
    const height = wrapText(limitation, fonts.regular, 8.7, PAGE_WIDTH - MARGIN * 2 - 18).length * 11.7 + 7;
    state = ensureSpace(pdf, fonts, state, height, "Coverage and limitations - continued");
    drawBullet(state, fonts, limitation, 8.7);
  }
}

export async function renderClientCodeAuditPdf(audit: ClientCodeAudit) {
  const pdf = await PDFDocument.create();
  const fonts = await loadFonts(pdf);
  pdf.setTitle(`${cleanText(audit.project.projectName)} Code Risk Scan`);
  pdf.setAuthor("SEANGWORLD");
  pdf.setSubject("Deterministic static source-code risk assessment");
  pdf.setCreator("SEANGWORLD Production");
  pdf.setProducer("SEANGWORLD Production");
  pdf.setCreationDate(new Date(audit.generatedAt));
  pdf.setModificationDate(new Date(audit.generatedAt));
  drawCover(pdf, fonts, audit);
  drawFindings(pdf, fonts, audit);
  drawRoadmap(pdf, fonts, audit);
  return pdf.save({ useObjectStreams: false });
}
