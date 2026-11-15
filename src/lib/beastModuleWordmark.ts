export type BeastModuleWordmarkSegment =
  | { text: string }
  | { text: string; role: "brand" }
  | { text: string; role: "module"; module: string };

const WORDMARK_PATTERN =
  /Beast(?:Guide|OS|Money|Education|Health|Home|Fusion|Projects|Vehicles|Family|Goals|Documents|Admin)?\b/gi;

const suffixColors: Record<string, string> = {
  guide: "#fbbf24",
  os: "#ffffff",
  money: "#4ade80",
  education: "#67e8f9",
  health: "#f87171",
  home: "#fb923c",
  fusion: "#ffffff",
  projects: "#a5b4fc",
  vehicles: "#22d3ee",
  family: "#facc15",
  goals: "#facc15",
  documents: "#cbd5e1",
  admin: "#f59e0b",
};

export function getBeastModuleWordmarkSuffixColor(module: string): string {
  return suffixColors[module.toLowerCase()] ?? "#ffffff";
}

export function splitBeastModuleWordmarks(text: string): BeastModuleWordmarkSegment[] {
  const segments: BeastModuleWordmarkSegment[] = [];
  let cursor = 0;

  WORDMARK_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = WORDMARK_PATTERN.exec(text)) !== null) {
    const start = match.index;
    const wordmark = match[0];
    const suffix = wordmark.slice("Beast".length);
    if (start > cursor) segments.push({ text: text.slice(cursor, start) });
    segments.push({ text: wordmark.slice(0, "Beast".length), role: "brand" });
    if (suffix) {
      segments.push({ text: suffix, role: "module", module: suffix.toLowerCase() });
    }
    cursor = start + wordmark.length;
  }
  WORDMARK_PATTERN.lastIndex = 0;

  if (cursor < text.length) segments.push({ text: text.slice(cursor) });
  return segments.length > 0 ? segments : [{ text }];
}
