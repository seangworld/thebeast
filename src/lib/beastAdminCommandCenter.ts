import {
  normalizeBeastAdminCanonicalReadModel,
  type BeastAdminCanonicalReadModel,
} from "./beastAdminCanonicalProjection";

export type BeastAdminCommandCenterResponse = {
  provider: BeastAdminCanonicalReadModel["provider"];
  canonical: BeastAdminCanonicalReadModel | null;
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function normalizeBeastAdminCommandCenterResponse(
  value: unknown
): BeastAdminCommandCenterResponse | null {
  const candidate = record(value);
  const provider = record(candidate.provider);
  if (typeof provider.status !== "string" || typeof provider.detail !== "string") {
    return null;
  }
  if (candidate.canonical === null) {
    return {
      provider: provider as BeastAdminCanonicalReadModel["provider"],
      canonical: null,
    };
  }
  const canonical = normalizeBeastAdminCanonicalReadModel(candidate.canonical);
  return canonical ? { provider: canonical.provider, canonical } : null;
}

export function canonicalEvidenceHref(
  reference: string | null | undefined,
  sourceCommit: string | null | undefined
) {
  const selected = reference?.trim() || "";
  const commit = sourceCommit?.trim() || "";
  if (!/^[0-9a-f]{40}$/.test(commit)) return null;
  const commitReference = selected.match(/^commit:([0-9a-f]{40})$/);
  if (commitReference) {
    return `https://github.com/seangworld/beastfusion/commit/${commitReference[1]}`;
  }
  if (
    /^(?:MANIFEST\.md|GOVERNANCE\.md|docs\/[A-Za-z0-9_./-]+|roadmaps\/[A-Za-z0-9_./-]+|state\/[A-Za-z0-9_.-]+\.json|versions\/[A-Za-z0-9_.-]+\.json)$/.test(
      selected
    ) &&
    !selected.includes("..")
  ) {
    return `https://github.com/seangworld/beastfusion/blob/${commit}/${selected}`;
  }
  return null;
}

export function canonicalStatusLabel(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function canonicalProjectionAgeHours(
  lastConfirmedAt: string | null | undefined,
  now = Date.now()
) {
  const confirmed = lastConfirmedAt ? Date.parse(lastConfirmedAt) : Number.NaN;
  return Number.isFinite(confirmed)
    ? Math.max(0, now - confirmed) / 3_600_000
    : null;
}
