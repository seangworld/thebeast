import type { RuntimeContext } from "../digitalStaffRuntime/types";

type Range = [number, number, number, number];
type SavedRange = { recordIndex: number; title: string; period: string; date: string; range: Range };
const months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

// Deliberately accepts only an explicit month/year or ISO calendar date.
// A record's update time does not tell us when its readings were taken.
function periodDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  const month = /^([a-z]+) (\d{4})$/i.exec(text);
  if (month && months.includes(month[1].toLowerCase())) {
    return `${month[2]}-${String(months.indexOf(month[1].toLowerCase()) + 1).padStart(2, "0")}-01`;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const date = new Date(`${text}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === text ? text : null;
}

function parseRange(value: unknown): Range | null {
  if (typeof value !== "string") return null;
  const match = /^\s*(\d{1,3})\s*[-–—]\s*(\d{1,3})\s*\/\s*(\d{1,3})\s*[-–—]\s*(\d{1,3})\s*(?:mm\s*Hg)?\s*$/i.exec(value);
  if (!match) return null;
  const values = match.slice(1).map(Number) as Range;
  return values.every(n => n > 0) && values[0] <= values[1] && values[2] <= values[3] ? values : null;
}

/** Pure arithmetic over supplied records. No clinical thresholds, interpolation or unit conversion. */
export function buildBloodPressureRangeComparisons(records: RuntimeContext["structuredRecords"]) {
  const groups = new Map<string, SavedRange[]>();
  records.forEach((entry, recordIndex) => {
    const record = object(entry.record);
    const details = object(record.details);
    const kind = record.record_type ?? record.type ?? record.kind ?? entry.domain.split(":").at(-1);
    if (!(entry.domain === "health" || entry.domain.startsWith("health:") || entry.domain.startsWith("beasthealth.health-advisor:"))
      || entry.domain.endsWith(":goals") || record.contextType === "member_reported_veteran_claim"
      || !["measurement", "vital"].includes(String(kind))) return;
    const title = typeof record.title === "string" ? record.title.trim() : "";
    if (!/\bblood[ -]pressure\b/i.test(title)) return;
    const unit = record.unit ?? record.units ?? details.unit ?? details.units;
    if (unit != null && (typeof unit !== "string" || !/^mm\s*hg$/i.test(unit.trim()))) return;
    const rangeValues = [record.range, details.range, details.recent_range, details.value, record.value].filter(value => value != null);
    const ranges = rangeValues.map(parseRange);
    if (!ranges.length || ranges.some(value => !value) || new Set(ranges.map(value => JSON.stringify(value))).size !== 1) return;
    const range = ranges[0];
    const periods = [record.period, details.period, record.occurred_on, record.occurredOn].filter(value => value != null);
    if (new Set(periods.map(periodDate)).size !== 1) return;
    const period = periods[0];
    const date = periodDate(period);
    if (!range || !date || typeof period !== "string") return;
    const key = title.toLowerCase().replace(/\s+/g, " ");
    groups.set(key, [...(groups.get(key) || []), { recordIndex, title, period, date, range }]);
  });
  return Array.from(groups.values()).flatMap(group => {
    // Do not choose between competing observations for the same period.
    if (new Set(group.map(row => row.date)).size !== group.length) return [];
    // A monthly range and a daily range in that month overlap; do not order
    // them as if they were two distinct measurement periods.
    if (group.some(row => /^[a-z]+ \d{4}$/i.test(row.period.trim())
      && group.some(other => other !== row && other.date.slice(0, 7) === row.date.slice(0, 7)))) return [];
    group.sort((a, b) => a.date.localeCompare(b.date));
    return group.slice(1).map((after, index) => {
      const before = group[index];
      return {
        before, after, unit: "mmHg",
        systolicEndpointShift: { lower: after.range[0] - before.range[0], upper: after.range[1] - before.range[1] },
        diastolicEndpointShift: { lower: after.range[2] - before.range[2], upper: after.range[3] - before.range[3] },
        pairedReadingChange: null,
        interpretation: "Endpoint shifts only; paired reading changes, average changes, cause and clinical significance are unknown.",
      };
    });
  }).slice(0, 20);
}
