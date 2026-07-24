import type {
  EducationGoalKind,
  EducationResourceProvider,
} from "./types";
import { externalResourceProviders } from "../platform/externalResources";

export const defaultEducationResourceProviders =
  externalResourceProviders.list().map((provider) =>
    provider.name === "Certification providers"
      ? "Certifications"
      : provider.name
  ) as EducationResourceProvider[];

export type EducationProfileDraft = {
  goalKind: EducationGoalKind;
  goal: string;
  currentSituation: string;
  background: string;
  strengths: string;
  growthAreas: string;
  constraints: string;
  weeklyHours: number;
  answers: Record<string, string>;
  selectedProviders: EducationResourceProvider[];
};

export const blankEducationProfileDraft: EducationProfileDraft = {
  goalKind: "career",
  goal: "",
  currentSituation: "",
  background: "",
  strengths: "",
  growthAreas: "",
  constraints: "",
  weeklyHours: 5,
  answers: {},
  selectedProviders: [],
};

export function normalizeEducationProfileDraft(
  value?: Partial<EducationProfileDraft> | null,
  defaultProviders: readonly EducationResourceProvider[] =
    defaultEducationResourceProviders
): EducationProfileDraft {
  return {
    goalKind: value?.goalKind || "career",
    goal: value?.goal ?? "",
    currentSituation: value?.currentSituation ?? "",
    background: value?.background ?? "",
    strengths: value?.strengths ?? "",
    growthAreas: value?.growthAreas ?? "",
    constraints: value?.constraints ?? "",
    weeklyHours:
      typeof value?.weeklyHours === "number" && Number.isFinite(value.weeklyHours)
        ? Math.max(0, Math.min(168, value.weeklyHours))
        : 5,
    answers:
      value?.answers && typeof value.answers === "object" ? value.answers : {},
    selectedProviders: Array.isArray(value?.selectedProviders)
      ? [...value.selectedProviders]
      : [...defaultProviders],
  };
}

export function educationProfileUpsert(
  ownerId: string,
  value: EducationProfileDraft
) {
  return {
    owner_id: ownerId,
    goal_kind: value.goalKind,
    goal: value.goal,
    current_situation: value.currentSituation,
    background: value.background,
    strengths: value.strengths,
    growth_areas: value.growthAreas,
    constraints: value.constraints,
    weekly_hours: value.weeklyHours,
    discovery_answers: value.answers,
    selected_providers: value.selectedProviders,
    updated_at: new Date().toISOString(),
  };
}

export function educationProfileDraftFromRow(
  row: Record<string, unknown> | null | undefined,
  defaultProviders: readonly EducationResourceProvider[] =
    defaultEducationResourceProviders
) {
  if (!row) return normalizeEducationProfileDraft(null, defaultProviders);
  return normalizeEducationProfileDraft(
    {
      goalKind: row.goal_kind as EducationGoalKind,
      goal: String(row.goal ?? ""),
      currentSituation: String(row.current_situation ?? ""),
      background: String(row.background ?? ""),
      strengths: String(row.strengths ?? ""),
      growthAreas: String(row.growth_areas ?? ""),
      constraints: String(row.constraints ?? ""),
      weeklyHours: Number(row.weekly_hours ?? 5),
      answers:
        row.discovery_answers && typeof row.discovery_answers === "object"
          ? (row.discovery_answers as Record<string, string>)
          : {},
      selectedProviders: Array.isArray(row.selected_providers)
        ? (row.selected_providers as EducationResourceProvider[])
        : [...defaultProviders],
    },
    defaultProviders
  );
}
