import type {
  AdaptiveLesson,
} from "./lessonEngine";
import type { PlacementQuestion } from "./coreLearningLoop";
import { createLearningContentMetadata } from "./contentVersioning";
import { generateDynamicLearningLesson } from "./dynamicLessonGenerator";
import type { LearningIntent } from "./types";

export type SampleScopePrerequisite = {
  id: string;
  title: string;
  requiredBeforeLessonId: string;
  evidenceSource: "placement" | "guided-review";
};

export type SampleScopeObjective = {
  id: string;
  title: string;
  lessonId: string;
  conceptId: string;
  prerequisiteIds: string[];
  masteryEvidence: string[];
};

export type SampleScopeLesson = {
  id: string;
  title: string;
  conceptIds: string[];
  objectiveIds: string[];
  prerequisiteIds: string[];
  status: "proving-ground" | "fixture";
  nextLessonId: string;
};

export type SampleCurriculumScope = {
  id: string;
  subject: string;
  courseId: string;
  courseTitle: string;
  status: "implemented-proving-ground" | "fixture";
  scopeBoundary: string;
  prerequisites: SampleScopePrerequisite[];
  objectives: SampleScopeObjective[];
  lessons: SampleScopeLesson[];
};

export type SampleLearningContentRecord = {
  id: string;
  subject: string;
  goalType: "subject" | "certification";
  intent: LearningIntent;
  courseId: string;
  courseTitle: string;
  matchPhrases: string[];
  activityTitle: string;
  emptyStateLabel: string;
  lesson: AdaptiveLesson;
  placementQuestions: PlacementQuestion[];
  curriculumScope?: SampleCurriculumScope;
};

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function sampleLessonMetadata(sourceId: string, sourceLabel: string) {
  return createLearningContentMetadata({
    sourceKind: "fixture",
    sourceId,
    sourceLabel,
    authoredBy: "fixture",
  });
}

function generatedLessonMetadata(sourceId: string, sourceLabel: string) {
  return createLearningContentMetadata({
    sourceKind: "generated",
    sourceId,
    sourceLabel,
    authoredBy: "ai-coach",
  });
}

const preAlgebraScope: SampleCurriculumScope = {
  id: "pre-algebra-proving-ground-scope",
  subject: "Pre-Algebra",
  courseId: "pre-algebra-foundations-course",
  courseTitle: "Pre-Algebra Foundations",
  status: "implemented-proving-ground",
  scopeBoundary:
    "Initial implemented content is limited to the Combining Like Terms lesson and its readiness questions.",
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

const algebraExpansionScope: SampleCurriculumScope = {
  id: "algebra-expansion-scope",
  subject: "Algebra",
  courseId: "algebra-expansion-course",
  courseTitle: "Algebra Expansion",
  status: "fixture",
  scopeBoundary:
    "Algebra expansion is limited to a first linear equations fixture that depends on the Pre-Algebra proving-ground pattern.",
  prerequisites: [
    {
      id: "combine-like-terms",
      title: "Combine like terms",
      requiredBeforeLessonId: "algebra-linear-equations",
      evidenceSource: "placement",
    },
    {
      id: "inverse-operations",
      title: "Use inverse operations",
      requiredBeforeLessonId: "algebra-linear-equations",
      evidenceSource: "placement",
    },
    {
      id: "equation-balance",
      title: "Preserve equation balance",
      requiredBeforeLessonId: "algebra-linear-equations",
      evidenceSource: "guided-review",
    },
  ],
  objectives: [
    {
      id: "objective-isolate-variable",
      title: "Isolate a variable using one inverse operation.",
      lessonId: "algebra-linear-equations",
      conceptId: "linear-equations",
      prerequisiteIds: ["inverse-operations", "equation-balance"],
      masteryEvidence: ["guided-practice", "quiz"],
    },
    {
      id: "objective-check-equation-solution",
      title: "Check a one-step equation solution by substitution.",
      lessonId: "algebra-linear-equations",
      conceptId: "solution-checking",
      prerequisiteIds: ["combine-like-terms", "equation-balance"],
      masteryEvidence: ["guided-practice", "quiz", "confidence"],
    },
  ],
  lessons: [
    {
      id: "algebra-linear-equations",
      title: "Linear Equations",
      conceptIds: ["inverse-operations", "linear-equations", "solution-checking"],
      objectiveIds: [
        "objective-isolate-variable",
        "objective-check-equation-solution",
      ],
      prerequisiteIds: [
        "combine-like-terms",
        "inverse-operations",
        "equation-balance",
      ],
      status: "fixture",
      nextLessonId: "two-step-equations",
    },
  ],
};

export const combiningLikeTermsLesson: AdaptiveLesson = {
  id: "pre-algebra-combining-like-terms",
  templateId: "procedural-skill-lesson",
  title: "Combining Like Terms",
  subject: preAlgebraScope.subject,
  contentMetadata: sampleLessonMetadata(
    "pre-algebra-proving-ground-scope",
    "Pre-Algebra proving-ground fixture"
  ),
  scopeId: preAlgebraScope.id,
  objectiveIds: preAlgebraScope.lessons[0].objectiveIds,
  prerequisiteIds: preAlgebraScope.lessons[0].prerequisiteIds,
  learningObjective:
    "Combine terms that have the same variable part so an expression is easier to read and solve.",
  prerequisiteConcepts: [
    "Know that a coefficient is the number in front of a variable.",
    "Recognize that x, y, and plain numbers are different kinds of terms.",
    "Add and subtract integers with confidence.",
  ],
  explanation:
    "Imagine a pizza order: slices go with slices, drinks go with drinks. In algebra, x terms go with x terms, and plain numbers go with plain numbers. The term 3x can combine with 5x because both are x terms. The term 3x cannot combine with 5 because one has x and one is just a number. When terms match, keep the variable part and add or subtract the numbers in front.",
  interactiveVisual: {
    title: "Sort the terms before combining",
    prompt:
      "Tap terms that belong together. Terms can combine only when their variable part matches.",
    expression: "4x + 7 + 2x + 3",
    terms: [
      { id: "term-4x", label: "4x", coefficient: 4, variable: "x", group: "x", color: "blue" },
      { id: "term-7", label: "7", coefficient: 7, variable: "", group: "constant", color: "green" },
      { id: "term-2x", label: "2x", coefficient: 2, variable: "x", group: "x", color: "blue" },
      { id: "term-3", label: "3", coefficient: 3, variable: "", group: "constant", color: "green" },
    ],
    targetGroups: [
      {
        group: "x",
        label: "x terms",
        combinedLabel: "4x + 2x = 6x",
        explanation: "Both terms have x, so add 4 + 2 and keep x.",
      },
      {
        group: "constant",
        label: "plain numbers",
        combinedLabel: "7 + 3 = 10",
        explanation: "Constants have no variable, so they combine with other constants.",
      },
    ],
  },
  examples: [
    {
      title: "Simple combine",
      setup: "3x + 5x",
      steps: [
        "Think of 3x and 5x like two stacks of the same trading card.",
        "Count the stacks together: 3 + 5 = 8.",
        "Keep the x because the card type did not change.",
      ],
      takeaway: "3x + 5x = 8x",
    },
    {
      title: "Separate groups",
      setup: "4x + 7 + 2x + 3",
      steps: [
        "Sort it like a phone screen: matching apps in one folder, plain numbers in another.",
        "Group x terms: 4x + 2x.",
        "Group number terms: 7 + 3, then combine each group separately.",
      ],
      takeaway: "4x + 7 + 2x + 3 = 6x + 10",
    },
  ],
  guidedPractice: [
    {
      id: "practice-combine-x",
      practiceTemplateId: "worked-step",
      difficulty: "introductory",
      format: "worked-step",
      prompt: "Combine: 6x + 2x",
      hint: "Both terms have x, so add the coefficients and keep x.",
      expectedAnswer: "8x",
      acceptedAnswers: ["8x"],
    },
    {
      id: "practice-combine-groups",
      practiceTemplateId: "worked-step",
      difficulty: "developing",
      format: "worked-step",
      prompt: "Combine: 5x + 4 + x + 6",
      hint: "Group the x terms together, then group the plain numbers.",
      expectedAnswer: "6x + 10",
      acceptedAnswers: ["6x+10", "6x + 10", "10 + 6x"],
    },
  ],
  quizQuestions: [
    {
      id: "quiz-like-terms-1",
      questionTypeId: "multiple-choice",
      contentMetadata: sampleLessonMetadata(
        "quiz-like-terms-1",
        "Pre-Algebra proving-ground assessment fixture"
      ),
      prompt: "Which terms can be combined with 7x?",
      options: ["3", "2x", "4y"],
      answer: "2x",
      explanation: "2x can combine with 7x because both terms have the same variable part: x.",
    },
    {
      id: "quiz-like-terms-2",
      questionTypeId: "multiple-choice",
      contentMetadata: sampleLessonMetadata(
        "quiz-like-terms-2",
        "Pre-Algebra proving-ground assessment fixture"
      ),
      prompt: "Simplify: 9x + 5 - 4x + 2",
      options: ["5x + 7", "13x + 7", "5x + 3"],
      answer: "5x + 7",
      explanation: "Combine 9x - 4x to get 5x, then combine 5 + 2 to get 7.",
    },
  ],
  aiCoachingPrompts: [
    {
      kind: "mistake",
      title: "Explain a mistake",
      prompt: "Those pieces do not belong together yet. Sort the matching parts first, then show the correct grouping.",
    },
    {
      kind: "alternate",
      title: "Try a different explanation",
      prompt: "Explain combining like terms like sorting snacks, sports teams, or phone apps into matching groups.",
    },
    {
      kind: "encouragement",
      title: "Encourage the next attempt",
      prompt: "Remind me that mistakes are information and give me one small next step.",
    },
    {
      kind: "review",
      title: "Recommend review",
      prompt: "Let's review the one idea that would make the next step easier.",
    },
    {
      kind: "mastery",
      title: "Celebrate mastery",
      prompt: "Nice work. You can explain this clearly, so the next lesson can build on it.",
    },
  ],
  reflectionPrompts: [
    "What makes two terms like terms?",
    "Which part felt easiest: grouping terms, adding coefficients, or checking the final expression?",
    "What should your Guidance Counselor review with you before the next lesson?",
  ],
  masteryThreshold: 80,
  recommendedNextLesson: "Solving one-step equations",
  reviewRecommendation: "Review coefficients and variable parts before moving on.",
};

const linearEquationsLesson: AdaptiveLesson = {
  id: "algebra-linear-equations",
  templateId: "procedural-skill-lesson",
  title: "Linear Equations",
  subject: algebraExpansionScope.subject,
  contentMetadata: sampleLessonMetadata(
    "algebra-expansion-scope",
    "Algebra expansion fixture"
  ),
  scopeId: algebraExpansionScope.id,
  objectiveIds: algebraExpansionScope.lessons[0].objectiveIds,
  prerequisiteIds: algebraExpansionScope.lessons[0].prerequisiteIds,
  learningObjective:
    "Solve a one-step equation by keeping both sides balanced while isolating the variable.",
  prerequisiteConcepts: [
    "Combine like terms before solving.",
    "Use inverse operations to undo addition, subtraction, multiplication, or division.",
    "Check that the final value makes the original equation true.",
  ],
  explanation:
    "An equation is balanced when both sides have the same value. To solve x + 4 = 11, undo the + 4 by subtracting 4 from both sides. That leaves x = 7. A quick check replaces x with 7: 7 + 4 = 11.",
  interactiveVisual: {
    title: "Keep the equation balanced",
    prompt:
      "Match each operation with the balancing move that keeps both sides equal.",
    expression: "x + 4 = 11",
    terms: [
      { id: "equation-variable", label: "x", coefficient: 1, variable: "x", group: "x", color: "blue" },
      { id: "equation-plus-four", label: "+ 4", coefficient: 4, variable: "", group: "constant", color: "green" },
      { id: "equation-eleven", label: "11", coefficient: 11, variable: "", group: "constant", color: "yellow" },
    ],
    targetGroups: [
      {
        group: "constant",
        label: "constant move",
        combinedLabel: "Subtract 4 from both sides",
        explanation: "Undoing + 4 on both sides keeps the equation balanced.",
      },
      {
        group: "x",
        label: "variable result",
        combinedLabel: "x = 7",
        explanation: "After the constant move, the variable is isolated.",
      },
    ],
  },
  examples: [
    {
      title: "Undo addition",
      setup: "x + 4 = 11",
      steps: [
        "The variable has + 4 attached.",
        "Subtract 4 from both sides.",
        "Check the result in the original equation.",
      ],
      takeaway: "x + 4 = 11 becomes x = 7",
    },
    {
      title: "Undo subtraction",
      setup: "y - 3 = 8",
      steps: [
        "The variable has - 3 attached.",
        "Add 3 to both sides.",
        "Check 11 - 3 = 8.",
      ],
      takeaway: "y - 3 = 8 becomes y = 11",
    },
  ],
  guidedPractice: [
    {
      id: "practice-solve-addition",
      practiceTemplateId: "worked-step",
      difficulty: "introductory",
      format: "worked-step",
      prompt: "Solve: x + 5 = 12",
      hint: "Undo + 5 by subtracting 5 from both sides.",
      expectedAnswer: "x = 7",
      acceptedAnswers: ["x=7", "x = 7", "7"],
    },
    {
      id: "practice-check-solution",
      practiceTemplateId: "worked-step",
      difficulty: "developing",
      format: "worked-step",
      prompt: "Check whether x = 7 solves x + 5 = 12.",
      hint: "Replace x with 7 and simplify the left side.",
      expectedAnswer: "7 + 5 = 12",
      acceptedAnswers: ["7+5=12", "7 + 5 = 12", "yes"],
    },
  ],
  quizQuestions: [
    {
      id: "quiz-linear-equations-1",
      questionTypeId: "multiple-choice",
      contentMetadata: sampleLessonMetadata(
        "quiz-linear-equations-1",
        "Algebra expansion assessment fixture"
      ),
      prompt: "What operation solves x + 6 = 14?",
      options: ["Subtract 6 from both sides", "Add 6 to both sides", "Multiply both sides by 6"],
      answer: "Subtract 6 from both sides",
      explanation: "Subtracting 6 undoes the + 6 and keeps the equation balanced.",
    },
    {
      id: "quiz-linear-equations-2",
      questionTypeId: "multiple-choice",
      contentMetadata: sampleLessonMetadata(
        "quiz-linear-equations-2",
        "Algebra expansion assessment fixture"
      ),
      prompt: "Which value solves y - 2 = 9?",
      options: ["7", "9", "11"],
      answer: "11",
      explanation: "Add 2 to both sides, so y = 11.",
    },
  ],
  aiCoachingPrompts: [
    {
      kind: "mistake",
      title: "Explain a balancing mistake",
      prompt: "Explain why changing only one side breaks the equation and show the balanced move.",
    },
    {
      kind: "alternate",
      title: "Try a scale explanation",
      prompt: "Explain the equation as a balance scale where both sides must receive the same move.",
    },
    {
      kind: "encouragement",
      title: "Encourage a check",
      prompt: "Good. Now prove it by putting your answer back into the original equation.",
    },
    {
      kind: "review",
      title: "Recommend review",
      prompt: "Recommend the prerequisite to review when balancing or inverse operations are shaky.",
    },
    {
      kind: "mastery",
      title: "Celebrate mastery",
      prompt: "Celebrate solving and checking a one-step equation, then name the next lesson.",
    },
  ],
  reflectionPrompts: [
    "Which inverse operation did you use?",
    "How did checking the answer prove the equation still balanced?",
    "What should Beast review before two-step equations?",
  ],
  masteryThreshold: 82,
  recommendedNextLesson: "Two-step equations",
  reviewRecommendation: "Review inverse operations and equation balance before moving on.",
};

const certificationFoundationLesson: AdaptiveLesson = {
  id: "sample-certification-foundation",
  templateId: "guided-concept-lesson",
  title: "Certification Foundation Scan",
  subject: "Cybersecurity Certification Preparation",
  contentMetadata: sampleLessonMetadata(
    "sample-certification-foundation",
    "Certification preparation fixture"
  ),
  learningObjective:
    "Identify the current exam goal, baseline vocabulary, and first readiness gap before building a study loop.",
  prerequisiteConcepts: [
    "Name the certification or skill outcome.",
    "Know the target timeline.",
    "Identify one current strength and one unknown area.",
  ],
  explanation:
    "A certification preparation session starts by naming the target, checking the learner's current vocabulary, and choosing one safe first practice task. Official exam objectives should be verified with the issuing body outside this sample fixture.",
  interactiveVisual: {
    title: "Map the study loop",
    prompt: "Group the parts of the first study loop.",
    expression: "Goal + Baseline + Practice + Review",
    terms: [
      { id: "cert-goal", label: "Goal", coefficient: 1, variable: "", group: "other", color: "blue" },
      { id: "cert-baseline", label: "Baseline", coefficient: 1, variable: "", group: "other", color: "green" },
      { id: "cert-practice", label: "Practice", coefficient: 1, variable: "", group: "other", color: "yellow" },
    ],
    targetGroups: [
      {
        group: "other",
        label: "Study loop",
        combinedLabel: "Goal + Baseline + Practice",
        explanation: "The first loop connects the target, current level, and one practice step.",
      },
    ],
  },
  examples: [
    {
      title: "Baseline scan",
      setup: "Learner wants certification readiness.",
      steps: [
        "Name the target credential or domain.",
        "List known topics and uncertain topics.",
        "Choose one practice task and one review signal.",
      ],
      takeaway: "The plan starts from evidence, not from the certificate name alone.",
    },
  ],
  guidedPractice: [
    {
      id: "practice-cert-baseline",
      practiceTemplateId: "applied-scenario",
      difficulty: "introductory",
      format: "scenario",
      prompt: "Name one known topic and one topic to verify.",
      hint: "Use plain language. The first answer can be small.",
      expectedAnswer: "Known topic and review topic",
      acceptedAnswers: ["known topic and review topic", "topic and gap", "baseline"],
    },
  ],
  quizQuestions: [
    {
      id: "quiz-cert-plan-1",
      questionTypeId: "multiple-choice",
      contentMetadata: sampleLessonMetadata(
        "quiz-cert-plan-1",
        "Certification preparation assessment fixture"
      ),
      prompt: "What should a starter certification plan verify first?",
      options: ["The current baseline", "A guaranteed passing score", "A final certificate"],
      answer: "The current baseline",
      explanation: "A starter plan needs a baseline before it can recommend practice.",
    },
  ],
  aiCoachingPrompts: [
    {
      kind: "mistake",
      title: "Clarify the gap",
      prompt: "Close. Let's separate what already feels familiar from the part that still feels uncertain.",
    },
    {
      kind: "alternate",
      title: "Try another explanation",
      prompt: "Explain the first study loop without naming a specific certification.",
    },
    {
      kind: "encouragement",
      title: "Keep it small",
      prompt: "Encourage one focused review task.",
    },
    {
      kind: "review",
      title: "Review signal",
      prompt: "Recommend what to verify before booking any exam.",
    },
    {
      kind: "mastery",
      title: "Ready for next loop",
      prompt: "Celebrate a complete baseline and recommend the next practice loop.",
    },
  ],
  reflectionPrompts: [
    "What goal did you clarify?",
    "What topic should be checked before the next study block?",
  ],
  masteryThreshold: 80,
  recommendedNextLesson: "Build the first practice loop",
  reviewRecommendation: "Review the target objective and baseline notes before moving on.",
};

const spanishConversationLesson: AdaptiveLesson = {
  id: "sample-spanish-greetings",
  templateId: "conversation-practice-lesson",
  title: "Spanish Greeting Practice",
  subject: "Spanish",
  contentMetadata: sampleLessonMetadata(
    "sample-spanish-greetings",
    "Spanish conversation fixture"
  ),
  learningObjective:
    "Practice a simple greeting exchange with pronunciation and meaning checks.",
  prerequisiteConcepts: [
    "Know that greetings can be formal or informal.",
    "Be ready to repeat a short phrase aloud.",
  ],
  explanation:
    "A first language lesson can focus on one useful exchange. The learner hears the phrase, repeats it, checks meaning, and reflects on confidence.",
  interactiveVisual: {
    title: "Build the exchange",
    prompt: "Match the greeting pieces into a short conversation.",
    expression: "Hola + Me llamo + Mucho gusto",
    terms: [
      { id: "spanish-hello", label: "Hola", coefficient: 1, variable: "", group: "other", color: "blue" },
      { id: "spanish-name", label: "Me llamo", coefficient: 1, variable: "", group: "other", color: "green" },
      { id: "spanish-meet", label: "Mucho gusto", coefficient: 1, variable: "", group: "other", color: "yellow" },
    ],
    targetGroups: [
      {
        group: "other",
        label: "Greeting exchange",
        combinedLabel: "Hola + Me llamo + Mucho gusto",
        explanation: "The pieces form a first short conversation.",
      },
    ],
  },
  examples: [
    {
      title: "First exchange",
      setup: "Hola, me llamo Alex.",
      steps: [
        "Start with hello.",
        "Add your name.",
        "Close with nice to meet you.",
      ],
      takeaway: "A useful exchange can be short and repeatable.",
    },
  ],
  guidedPractice: [
    {
      id: "practice-spanish-greeting",
      practiceTemplateId: "conversation-turn",
      difficulty: "introductory",
      format: "conversation",
      prompt: "Write a greeting with your name.",
      hint: "Start with Hola, then add me llamo.",
      expectedAnswer: "Hola, me llamo Alex",
      acceptedAnswers: ["hola me llamo alex", "hola, me llamo alex"],
    },
  ],
  quizQuestions: [
    {
      id: "quiz-spanish-1",
      questionTypeId: "multiple-choice",
      contentMetadata: sampleLessonMetadata(
        "quiz-spanish-1",
        "Spanish conversation assessment fixture"
      ),
      prompt: "What does Hola usually mean?",
      options: ["Hello", "Goodbye", "Thank you"],
      answer: "Hello",
      explanation: "Hola is a common greeting.",
    },
  ],
  aiCoachingPrompts: [
    {
      kind: "mistake",
      title: "Correct gently",
      prompt: "Close. Say the greeting first, then add your name. Keep it short.",
    },
    {
      kind: "alternate",
      title: "Explain another way",
      prompt: "Explain the exchange with a simple role-play.",
    },
    {
      kind: "encouragement",
      title: "Encourage repetition",
      prompt: "Nice. Say it out loud once, like you are greeting someone for real.",
    },
    {
      kind: "review",
      title: "Review phrase",
      prompt: "Recommend the greeting piece to repeat.",
    },
    {
      kind: "mastery",
      title: "Ready for next phrase",
      prompt: "Celebrate the first exchange and recommend the next phrase.",
    },
  ],
  reflectionPrompts: [
    "Which phrase felt easiest to say?",
    "What should you repeat before the next phrase?",
  ],
  masteryThreshold: 80,
  recommendedNextLesson: "Ask how someone is doing",
  reviewRecommendation: "Repeat the greeting exchange once more before moving on.",
};

export const sampleLearningContentRecords: SampleLearningContentRecord[] = [
  {
    id: "pre-algebra-proving-ground",
    subject: preAlgebraScope.subject,
    goalType: "subject",
    intent: "Teach me",
    courseId: preAlgebraScope.courseId,
    courseTitle: preAlgebraScope.courseTitle,
    matchPhrases: ["pre-algebra", "pre algebra", "combining like terms"],
    activityTitle: "Pre-Algebra: Combining Like Terms",
    emptyStateLabel: "a learning mission",
    lesson: combiningLikeTermsLesson,
    placementQuestions: [
      {
        id: "placement-coefficient",
        conceptId: "coefficients",
        prompt: "In 6x, what is the coefficient?",
        expectedAnswer: "6",
        acceptedAnswers: ["6", "six"],
      },
      {
        id: "placement-like-terms",
        conceptId: "like-terms",
        prompt: "Which term can combine with 4x: 2x or 2?",
        expectedAnswer: "2x",
        acceptedAnswers: ["2x", "2 x"],
      },
      {
        id: "placement-combine",
        conceptId: "combine-like-terms",
        prompt: "Simplify 3x + 5x.",
        expectedAnswer: "8x",
        acceptedAnswers: ["8x", "8 x"],
      },
    ],
    curriculumScope: preAlgebraScope,
  },
  {
    id: "algebra-expansion",
    subject: algebraExpansionScope.subject,
    goalType: "subject",
    intent: "Teach me",
    courseId: algebraExpansionScope.courseId,
    courseTitle: algebraExpansionScope.courseTitle,
    matchPhrases: ["algebra", "linear equations", "one-step equations"],
    activityTitle: "Algebra: Linear Equations",
    emptyStateLabel: "an algebra mission",
    lesson: linearEquationsLesson,
    placementQuestions: [
      {
        id: "placement-inverse-operation",
        conceptId: "inverse-operations",
        prompt: "What operation undoes + 5?",
        expectedAnswer: "Subtract 5",
        acceptedAnswers: ["subtract 5", "-5", "subtraction"],
      },
      {
        id: "placement-equation-balance",
        conceptId: "equation-balance",
        prompt: "If you subtract 3 from one side of an equation, what must you do to the other side?",
        expectedAnswer: "Subtract 3",
        acceptedAnswers: ["subtract 3", "do the same thing", "same operation"],
      },
      {
        id: "placement-solve-linear",
        conceptId: "linear-equations",
        prompt: "Solve x + 4 = 11.",
        expectedAnswer: "x = 7",
        acceptedAnswers: ["x=7", "x = 7", "7"],
      },
    ],
    curriculumScope: algebraExpansionScope,
  },
  {
    id: "cybersecurity-certification-prep",
    subject: "Cybersecurity Certification Preparation",
    goalType: "certification",
    intent: "Certification",
    courseId: "cybersecurity-certification-prep-course",
    courseTitle: "Cybersecurity Certification Preparation",
    matchPhrases: ["certification", "cert", "security+", "comptia", "a+"],
    activityTitle: "Cybersecurity Certification Preparation: Foundation Scan",
    emptyStateLabel: "a certification preparation mission",
    lesson: certificationFoundationLesson,
    placementQuestions: [
      {
        id: "placement-cert-goal",
        conceptId: "certification-goal",
        prompt: "What credential or domain are you preparing for?",
        expectedAnswer: "Certification goal",
        acceptedAnswers: ["certification goal", "security+", "a+", "comptia"],
      },
      {
        id: "placement-cert-baseline",
        conceptId: "baseline-vocabulary",
        prompt: "Name one concept you already recognize.",
        expectedAnswer: "Known concept",
        acceptedAnswers: ["known concept", "baseline", "topic"],
      },
      {
        id: "placement-cert-review",
        conceptId: "review-target",
        prompt: "Name one concept to review before practice.",
        expectedAnswer: "Review target",
        acceptedAnswers: ["review target", "gap", "unknown topic"],
      },
    ],
  },
  {
    id: "spanish-greeting-practice",
    subject: "Spanish",
    goalType: "subject",
    intent: "Teach me",
    courseId: "spanish-greeting-course",
    courseTitle: "Spanish Greeting Practice",
    matchPhrases: ["spanish", "language", "greeting"],
    activityTitle: "Spanish: Greeting Practice",
    emptyStateLabel: "a language practice mission",
    lesson: spanishConversationLesson,
    placementQuestions: [
      {
        id: "placement-spanish-hello",
        conceptId: "spanish-greeting",
        prompt: "What greeting would you use to say hello?",
        expectedAnswer: "Hola",
        acceptedAnswers: ["hola"],
      },
      {
        id: "placement-spanish-name",
        conceptId: "spanish-introduction",
        prompt: "What phrase can introduce your name?",
        expectedAnswer: "Me llamo",
        acceptedAnswers: ["me llamo"],
      },
      {
        id: "placement-spanish-meet",
        conceptId: "spanish-courtesy",
        prompt: "What phrase means nice to meet you?",
        expectedAnswer: "Mucho gusto",
        acceptedAnswers: ["mucho gusto"],
      },
    ],
  },
];

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export function getDefaultSampleLearningContentRecord() {
  return sampleLearningContentRecords[0];
}

function firstUsePlacementQuestions(subject: string): PlacementQuestion[] {
  const lowerSubject = subject.toLowerCase();

  if (
    /math|algebra|geometry|fraction|equation|grade/.test(lowerSubject)
  ) {
    return [
      {
        id: "first-math-arithmetic",
        conceptId: "arithmetic",
        prompt: "Solve: 8 + 7.",
        expectedAnswer: "15",
        acceptedAnswers: ["15", "fifteen"],
      },
      {
        id: "first-math-fractions",
        conceptId: "fractions",
        prompt: "Which is larger: 1/2 or 1/4?",
        expectedAnswer: "1/2",
        acceptedAnswers: ["1/2", "one half", "half"],
      },
      {
        id: "first-math-variables",
        conceptId: "variables",
        prompt: "Solve: x + 3 = 10.",
        expectedAnswer: "x = 7",
        acceptedAnswers: ["x=7", "x = 7", "7"],
      },
    ];
  }

  if (
    /technology|computer|network|security|cyber|python|programming/.test(lowerSubject)
  ) {
    return [
      {
        id: "first-tech-concepts",
        conceptId: "basic-concepts",
        prompt: "In one sentence, what does a computer network connect?",
        expectedAnswer: "Devices",
        acceptedAnswers: ["devices", "computers", "people and devices"],
      },
      {
        id: "first-tech-security",
        conceptId: "security-basics",
        prompt: "Which is safer: using one password everywhere or using different passwords?",
        expectedAnswer: "Different passwords",
        acceptedAnswers: ["different passwords", "different", "unique passwords"],
      },
      {
        id: "first-tech-practice",
        conceptId: "applied-technology",
        prompt: "Name one technology topic you want to practice first.",
        expectedAnswer: "A technology topic",
        acceptedAnswers: ["networking", "security", "python", "coding", "computers"],
      },
    ];
  }

  return [
    {
      id: "first-reading-vocabulary",
      conceptId: "vocabulary",
      prompt: `Write one word or idea you already know about ${subject}.`,
      expectedAnswer: "Known idea",
      acceptedAnswers: ["idea", "word", "known idea"],
    },
    {
      id: "first-reading-comprehension",
      conceptId: "comprehension",
      prompt: `In one sentence, explain what you want to understand about ${subject}.`,
      expectedAnswer: "Learning target",
      acceptedAnswers: ["understand", "learn", "practice"],
    },
    {
      id: "first-reading-grammar",
      conceptId: "explanation",
      prompt: "Write one complete sentence about the topic.",
      expectedAnswer: "A complete sentence",
      acceptedAnswers: ["sentence", "complete sentence"],
    },
  ];
}

export function createGeneratedLearningContentRecord(
  subject: string
): SampleLearningContentRecord {
  const resolvedSubject = subject.trim() || "Learning Path";
  const subjectSlug = slugify(resolvedSubject || "learning-path");
  const lessonId = `generated-${subjectSlug}-starter`;
  const generatedLesson = generateDynamicLearningLesson({
    goal: resolvedSubject,
    courseId: `generated-${subjectSlug}-course`,
    courseTitle: `${resolvedSubject} Learning Path`,
    learnerLevel: "Brand new",
    mode: "lesson",
  }).lesson;

  return {
    id: `generated-${subjectSlug}`,
    subject: resolvedSubject,
    goalType: "subject",
    intent: "Teach me",
    courseId: `generated-${subjectSlug}-course`,
    courseTitle: `${resolvedSubject} Learning Path`,
    matchPhrases: [normalize(resolvedSubject)],
    activityTitle: `${resolvedSubject}: First Practice`,
    emptyStateLabel: "a learning mission",
    lesson: {
      ...generatedLesson,
      id: lessonId,
      templateId: "generated-starter-lesson",
      title: "First Practice",
      subject: resolvedSubject,
      contentMetadata: generatedLessonMetadata(
        lessonId,
        "First practice"
      ),
      learningObjective: `Start ${resolvedSubject} with an introduction, a worked example, guided practice, independent practice, a checkpoint, a wrap-up, and a next step.`,
      explanation:
        `Introduction: let's begin ${resolvedSubject} with one clear example. After that, you will try a guided practice question, an independent practice question, a checkpoint, a short wrap-up, and a next step.`,
      reflectionPrompts: [
        `Wrap-up: what felt clear about ${resolvedSubject}?`,
        `Next step: what should we practice next in ${resolvedSubject}?`,
      ],
      masteryThreshold: 80,
      recommendedNextLesson: `Next ${resolvedSubject} lesson`,
      reviewRecommendation: `Review the first ${resolvedSubject} question before moving on.`,
    },
    placementQuestions: firstUsePlacementQuestions(resolvedSubject),
  };
}

export function getSampleLearningContentRecordForGoal(goal: string) {
  const normalizedGoal = normalize(goal);

  return sampleLearningContentRecords.find((record) =>
    record.matchPhrases.some((phrase) => normalizedGoal.includes(phrase))
  );
}

export function resolveLearningContentRecordForGoal(goal: string) {
  return (
    getSampleLearningContentRecordForGoal(goal) ||
    createGeneratedLearningContentRecord(goal)
  );
}

export function getSampleLearningContentRecordForSubject(subject: string) {
  const normalizedSubject = normalize(subject);

  return sampleLearningContentRecords.find(
    (record) =>
      normalize(record.subject) === normalizedSubject ||
      normalize(record.courseTitle) === normalizedSubject ||
      record.matchPhrases.some((phrase) => normalizedSubject.includes(phrase))
  );
}

export function resolveLearningContentRecordForSubject(subject: string) {
  return (
    getSampleLearningContentRecordForSubject(subject) ||
    createGeneratedLearningContentRecord(subject)
  );
}

export function getSampleLearningContentRecordForActivityTitle(title: string) {
  const normalizedTitle = normalize(title);

  return sampleLearningContentRecords.find(
    (record) =>
      normalize(record.activityTitle) === normalizedTitle ||
      normalize(record.lesson.title) === normalizedTitle ||
      record.matchPhrases.some((phrase) => normalizedTitle.includes(phrase))
  );
}

export function resolveLearningContentRecordForActivityTitle(title: string) {
  const sampleRecord = getSampleLearningContentRecordForActivityTitle(title);
  if (sampleRecord) return sampleRecord;

  const starterTitleMatch = title.match(/^(.+): (?:Starter Lesson|First Practice)$/);
  if (starterTitleMatch?.[1]) {
    return createGeneratedLearningContentRecord(starterTitleMatch[1]);
  }

  return undefined;
}

export function getSampleActivityTitleForGoal(goal: string) {
  return getSampleLearningContentRecordForGoal(goal)?.activityTitle;
}

export function getLearningActivityTitleForGoal(goal: string) {
  return resolveLearningContentRecordForGoal(goal).activityTitle;
}

export function getSampleActivityTitleForCourse(courseTitle: string) {
  return getSampleLearningContentRecordForSubject(courseTitle)?.activityTitle;
}

export function getLearningActivityTitleForCourse(courseTitle: string) {
  return resolveLearningContentRecordForSubject(courseTitle).activityTitle;
}

export function getSampleCurriculumScope(scopeId: string) {
  return sampleLearningContentRecords.find(
    (record) => record.curriculumScope?.id === scopeId
  )?.curriculumScope;
}
