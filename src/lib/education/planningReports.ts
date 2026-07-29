import { guidanceDiscoveryProfileFromRow } from "./discoveryConversation";

export type EducationPlanningReportRow = {
  label: string;
  value: string;
};

export type EducationPlanningReport = {
  id: "education" | "career" | "roadmap" | "certifications";
  title: string;
  description: string;
  rows: EducationPlanningReportRow[];
};

export type EducationPlanningReportsBundle = {
  generatedAt: string;
  reports: EducationPlanningReport[];
  disclosure: string;
};

type PlanningRecord = Record<string, unknown>;

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function textList(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : [];
}

function available(value: string, fallback = "Not yet recorded") {
  return value || fallback;
}

export function buildEducationPlanningReports({
  profileRow,
  goals,
  plans,
  certificates,
  asOf = new Date().toISOString(),
}: {
  profileRow?: PlanningRecord | null;
  goals: PlanningRecord[];
  plans: PlanningRecord[];
  certificates: PlanningRecord[];
  asOf?: string;
}): EducationPlanningReportsBundle {
  const generatedAt = new Date(asOf);
  if (Number.isNaN(generatedAt.getTime())) {
    throw new Error("Education planning reports require a valid as-of time.");
  }

  const profile = guidanceDiscoveryProfileFromRow(profileRow);
  const activeGoal =
    goals.find((goal) => text(goal.status).toLowerCase() === "active") ||
    goals[0];
  const activePlan =
    plans.find((plan) => plan.goal_id === activeGoal?.id) || plans[0];
  const earnedCredentials = certificates
    .map((certificate) => text(certificate.path_name))
    .filter(Boolean);
  const recordedCredentials = Array.from(
    new Set([...profile.certifications, ...earnedCredentials])
  );

  return {
    generatedAt: generatedAt.toISOString(),
    disclosure:
      "These reports summarize authenticated BeastEducation planning records. They do not establish admissions, licensing, certification, employment, or financial-aid requirements.",
    reports: [
      {
        id: "education",
        title: "Education Planning Summary",
        description:
          "The saved outcome, current situation, study capacity, and education interests guiding the plan.",
        rows: [
          {
            label: "Current goal",
            value: available(text(activeGoal?.title) || profile.goal),
          },
          {
            label: "Current situation",
            value: available(profile.currentSituation),
          },
          {
            label: "Education interests",
            value: available(profile.educationalGoals.join(", ")),
          },
          {
            label: "Available study time",
            value: profile.availableStudyTimeKnown
              ? `${profile.weeklyHours} hours per week`
              : "Not yet confirmed",
          },
        ],
      },
      {
        id: "career",
        title: "Career Planning Summary",
        description:
          "Career directions and member context learned directly from saved conversations.",
        rows: [
          {
            label: "Career interests",
            value: available(profile.careerInterests.join(", ")),
          },
          {
            label: "Current employment",
            value: available(profile.currentEmployment),
          },
          { label: "Strengths", value: available(profile.strengths) },
          {
            label: "Planning constraints",
            value: available(profile.constraints),
          },
        ],
      },
      {
        id: "roadmap",
        title: "Roadmap Summary",
        description:
          "The saved long-term plan and its relationship to the current goal.",
        rows: [
          {
            label: "Roadmap",
            value: available(text(activePlan?.title), "No roadmap saved"),
          },
          {
            label: "Plan summary",
            value: available(text(activePlan?.summary), "No plan summary saved"),
          },
          {
            label: "Saved planning goals",
            value: goals.length
              ? `${goals.length} authenticated ${goals.length === 1 ? "goal" : "goals"}`
              : "No goals saved",
          },
          {
            label: "Saved roadmap records",
            value: plans.length
              ? `${plans.length} authenticated ${plans.length === 1 ? "roadmap" : "roadmaps"}`
              : "No roadmaps saved",
          },
        ],
      },
      {
        id: "certifications",
        title: "Certification Planning Summary",
        description:
          "Credential interests and earned records without inferring current requirements.",
        rows: [
          {
            label: "Credentials discussed",
            value: available(recordedCredentials.join(", ")),
          },
          {
            label: "Earned credential records",
            value: earnedCredentials.length
              ? earnedCredentials.join(", ")
              : "None recorded",
          },
          {
            label: "Requirements status",
            value:
              "Verify prerequisites, exams, costs, recognition, and renewal with authoritative sources.",
          },
        ],
      },
    ],
  };
}
