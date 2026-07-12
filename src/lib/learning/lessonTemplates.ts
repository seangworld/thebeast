import type { AdaptiveLesson } from "./lessonEngine";

export type LessonTemplateSectionKind =
  | "instruction"
  | "examples"
  | "practice"
  | "checks";

export type LessonTemplateSection = {
  kind: LessonTemplateSectionKind;
  label: string;
  purpose: string;
  required: true;
};

export type LessonTemplate = {
  id: string;
  title: string;
  description: string;
  contentMode: "conceptual" | "procedural" | "conversational" | "generated";
  sections: LessonTemplateSection[];
  masteryEvidence: Array<"guided-practice" | "quiz" | "confidence" | "reflection">;
};

const coreTemplateSections: LessonTemplateSection[] = [
  {
    kind: "instruction",
    label: "Instruction",
    purpose: "Explain the target idea in learner-facing language.",
    required: true,
  },
  {
    kind: "examples",
    label: "Examples",
    purpose: "Show worked examples before independent practice.",
    required: true,
  },
  {
    kind: "practice",
    label: "Practice",
    purpose: "Give supported attempts with hints and expected answers.",
    required: true,
  },
  {
    kind: "checks",
    label: "Checks",
    purpose: "Check understanding with quiz, confidence, and mastery evidence.",
    required: true,
  },
];

export const lessonTemplateLibrary: LessonTemplate[] = [
  {
    id: "guided-concept-lesson",
    title: "Guided Concept Lesson",
    description:
      "A general-purpose lesson shape for teaching a concept, showing examples, practicing, and checking understanding.",
    contentMode: "conceptual",
    sections: coreTemplateSections,
    masteryEvidence: ["guided-practice", "quiz", "confidence", "reflection"],
  },
  {
    id: "procedural-skill-lesson",
    title: "Procedural Skill Lesson",
    description:
      "A skill-building lesson shape for step-by-step procedures, worked examples, guided attempts, and checks.",
    contentMode: "procedural",
    sections: coreTemplateSections,
    masteryEvidence: ["guided-practice", "quiz", "confidence", "reflection"],
  },
  {
    id: "conversation-practice-lesson",
    title: "Conversation Practice Lesson",
    description:
      "A language or communication lesson shape for modeling, rehearsal, practice, and comprehension checks.",
    contentMode: "conversational",
    sections: coreTemplateSections,
    masteryEvidence: ["guided-practice", "quiz", "confidence", "reflection"],
  },
  {
    id: "generated-starter-lesson",
    title: "Generated Starter Lesson",
    description:
      "A generated-curriculum lesson shape for unknown or newly supplied subjects where the coach starts from learner goal evidence.",
    contentMode: "generated",
    sections: coreTemplateSections,
    masteryEvidence: ["guided-practice", "quiz", "confidence", "reflection"],
  },
];

export function getLessonTemplateById(templateId: string) {
  return lessonTemplateLibrary.find((template) => template.id === templateId);
}

export function getLessonTemplateForLesson(lesson: Pick<AdaptiveLesson, "templateId">) {
  return getLessonTemplateById(lesson.templateId || "guided-concept-lesson");
}

export function getLessonTemplateCoverage(lesson: AdaptiveLesson) {
  return {
    instruction: lesson.explanation.trim().length > 0,
    examples: lesson.examples.length > 0,
    practice: lesson.guidedPractice.length > 0,
    checks: lesson.quizQuestions.length > 0,
  };
}

export function lessonSatisfiesTemplate(lesson: AdaptiveLesson) {
  const template = getLessonTemplateForLesson(lesson);
  const coverage = getLessonTemplateCoverage(lesson);

  return Boolean(
    template &&
      template.sections.every((section) => coverage[section.kind])
  );
}
