export type PreAlgebraScopePrerequisite = {
  id: string;
  title: string;
  requiredBeforeLessonId: string;
  evidenceSource: "placement" | "guided-review";
};

export type PreAlgebraScopeObjective = {
  id: string;
  title: string;
  lessonId: string;
  conceptId: string;
  prerequisiteIds: string[];
  masteryEvidence: string[];
};

export type PreAlgebraScopeLesson = {
  id: string;
  title: string;
  conceptIds: string[];
  objectiveIds: string[];
  prerequisiteIds: string[];
  status: "proving-ground";
  nextLessonId: string;
};

export type PreAlgebraProvingGroundScope = {
  id: string;
  subject: "Pre-Algebra";
  courseId: string;
  status: "implemented-proving-ground";
  scopeBoundary: string;
  prerequisites: PreAlgebraScopePrerequisite[];
  objectives: PreAlgebraScopeObjective[];
  lessons: PreAlgebraScopeLesson[];
};

export const preAlgebraProvingGroundScope: PreAlgebraProvingGroundScope = {
  id: "pre-algebra-proving-ground-scope",
  subject: "Pre-Algebra",
  courseId: "pre-algebra-foundations-course",
  status: "implemented-proving-ground",
  scopeBoundary:
    "Initial implemented content is limited to the Combining Like Terms proving-ground lesson and its prerequisite checks.",
  prerequisites: [
    {
      id: "coefficients",
      title: "Identify coefficients",
      requiredBeforeLessonId: "pre-algebra-combining-like-terms",
      evidenceSource: "placement",
    },
    {
      id: "like-terms",
      title: "Recognize like terms",
      requiredBeforeLessonId: "pre-algebra-combining-like-terms",
      evidenceSource: "placement",
    },
    {
      id: "integer-addition",
      title: "Add and subtract integers",
      requiredBeforeLessonId: "pre-algebra-combining-like-terms",
      evidenceSource: "guided-review",
    },
  ],
  objectives: [
    {
      id: "objective-identify-like-terms",
      title: "Identify terms with the same variable part.",
      lessonId: "pre-algebra-combining-like-terms",
      conceptId: "like-terms",
      prerequisiteIds: ["coefficients"],
      masteryEvidence: ["guided-practice", "quiz"],
    },
    {
      id: "objective-combine-like-terms",
      title: "Combine coefficients while preserving the matching variable part.",
      lessonId: "pre-algebra-combining-like-terms",
      conceptId: "combine-like-terms",
      prerequisiteIds: ["coefficients", "like-terms", "integer-addition"],
      masteryEvidence: ["guided-practice", "quiz", "confidence"],
    },
  ],
  lessons: [
    {
      id: "pre-algebra-combining-like-terms",
      title: "Combining Like Terms",
      conceptIds: ["coefficients", "like-terms", "combine-like-terms"],
      objectiveIds: [
        "objective-identify-like-terms",
        "objective-combine-like-terms",
      ],
      prerequisiteIds: ["coefficients", "like-terms", "integer-addition"],
      status: "proving-ground",
      nextLessonId: "one-step-equations",
    },
  ],
};

export function getPreAlgebraProvingGroundScope() {
  return preAlgebraProvingGroundScope;
}
