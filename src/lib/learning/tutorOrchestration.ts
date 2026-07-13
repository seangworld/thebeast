import type { LearningSpecialistRole } from "./types";

export type TutorSelectionInput = {
  activityType: string;
  activityTitle: string;
  courseTitle?: string;
  goalTitle?: string;
  weakArea?: string;
};

export type TutorSelection = {
  role: LearningSpecialistRole;
  reason: string;
  handoff: string;
  contextSummary: string;
  fallbackUsed: boolean;
};

function includesAny(value: string, keywords: string[]) {
  const text = value.toLowerCase();
  return keywords.some((keyword) => text.includes(keyword));
}

function getContextText(input: TutorSelectionInput) {
  return [
    input.activityType,
    input.activityTitle,
    input.courseTitle,
    input.goalTitle,
    input.weakArea,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function selectMentorTutor(input: TutorSelectionInput): TutorSelection {
  const context = getContextText(input);
  const lessonLabel = input.courseTitle || input.activityTitle || "this session";
  let role: LearningSpecialistRole = "General Academic Tutor";
  let reason =
    "A general academic Tutor is the best fit for this session.";
  let fallbackUsed = true;

  if (
    includesAny(context, [
      "security+",
      "certification",
      "exam",
      "comptia",
      "networking",
      "subnet",
      "cidr",
    ])
  ) {
    role = "Certification Tutor";
    reason = "The session is tied to certification or exam-prep learning context.";
    fallbackUsed = false;
  } else if (
    includesAny(context, [
      "math",
      "algebra",
      "equation",
      "geometry",
      "calculus",
      "fraction",
      "linear",
      "quadratic",
    ])
  ) {
    role = "Math Tutor";
    reason = "The session is centered on math concepts or procedural practice.";
    fallbackUsed = false;
  } else if (
    includesAny(context, ["science", "biology", "chemistry", "physics", "lab"])
  ) {
    role = "Science Tutor";
    reason = "The session is centered on science concepts or evidence-based reasoning.";
    fallbackUsed = false;
  } else if (
    includesAny(context, ["writing", "essay", "paragraph", "draft", "grammar"])
  ) {
    role = "Writing Coach";
    reason = "The session needs writing feedback or revision support.";
    fallbackUsed = false;
  } else if (
    includesAny(context, ["study", "habit", "schedule", "focus", "reflection"])
  ) {
    role = "Study Coach";
    reason = "The session is mostly about study approach, reflection, or learning rhythm.";
    fallbackUsed = false;
  }

  return {
    role,
    reason,
    handoff: `For ${lessonLabel}, I am bringing in your ${role}.`,
    contextSummary: `${input.activityType || "Learning"} session: ${
      input.activityTitle || "current activity"
    }. Goal: ${input.goalTitle || "current learning goal"}. Weak area: ${
      input.weakArea || "not identified yet"
    }.`,
    fallbackUsed,
  };
}
