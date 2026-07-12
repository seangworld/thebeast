import type {
  AdaptiveLesson,
} from "./lessonEngine";
import type { PlacementQuestion } from "./coreLearningLoop";
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

const preAlgebraScope: SampleCurriculumScope = {
  id: "pre-algebra-proving-ground-scope",
  subject: "Pre-Algebra",
  courseId: "pre-algebra-foundations-course",
  courseTitle: "Pre-Algebra Foundations",
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

export const combiningLikeTermsLesson: AdaptiveLesson = {
  id: "pre-algebra-combining-like-terms",
  title: "Combining Like Terms",
  subject: preAlgebraScope.subject,
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
    "Like terms have the same variable part. The term 3x can combine with 5x because both are x terms. The term 3x cannot combine with 5 because one has x and one is just a number. When terms are alike, keep the variable part and add or subtract the coefficients.",
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
        "Both terms are x terms.",
        "Add the coefficients: 3 + 5 = 8.",
        "Keep the x because the variable part did not change.",
      ],
      takeaway: "3x + 5x = 8x",
    },
    {
      title: "Separate groups",
      setup: "4x + 7 + 2x + 3",
      steps: [
        "Group x terms: 4x + 2x.",
        "Group number terms: 7 + 3.",
        "Combine each group separately.",
      ],
      takeaway: "4x + 7 + 2x + 3 = 6x + 10",
    },
  ],
  guidedPractice: [
    {
      id: "practice-combine-x",
      prompt: "Combine: 6x + 2x",
      hint: "Both terms have x, so add the coefficients and keep x.",
      expectedAnswer: "8x",
      acceptedAnswers: ["8x"],
    },
    {
      id: "practice-combine-groups",
      prompt: "Combine: 5x + 4 + x + 6",
      hint: "Group the x terms together, then group the plain numbers.",
      expectedAnswer: "6x + 10",
      acceptedAnswers: ["6x+10", "6x + 10", "10 + 6x"],
    },
  ],
  quizQuestions: [
    {
      id: "quiz-like-terms-1",
      prompt: "Which terms can be combined with 7x?",
      options: ["3", "2x", "4y"],
      answer: "2x",
      explanation: "2x can combine with 7x because both terms have the same variable part: x.",
    },
    {
      id: "quiz-like-terms-2",
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
      prompt: "If I combined unlike terms, explain why that does not work and show the correct grouping.",
    },
    {
      kind: "alternate",
      title: "Try a different explanation",
      prompt: "Explain combining like terms using colored groups or matching labels.",
    },
    {
      kind: "encouragement",
      title: "Encourage the next attempt",
      prompt: "Remind me that mistakes are information and give me one small next step.",
    },
    {
      kind: "review",
      title: "Recommend review",
      prompt: "If my mastery is low, recommend the one concept I should review before moving on.",
    },
    {
      kind: "mastery",
      title: "Celebrate mastery",
      prompt: "If I mastered this, celebrate clearly and tell me what lesson should come next.",
    },
  ],
  reflectionPrompts: [
    "What makes two terms like terms?",
    "Which part felt easiest: grouping terms, adding coefficients, or checking the final expression?",
    "What should Beast review with you before the next lesson?",
  ],
  masteryThreshold: 80,
  recommendedNextLesson: "Solving one-step equations",
  reviewRecommendation: "Review coefficients and variable parts before moving on.",
};

const certificationFoundationLesson: AdaptiveLesson = {
  id: "sample-certification-foundation",
  title: "Certification Foundation Scan",
  subject: "Cybersecurity Certification Preparation",
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
      prompt: "Name one known topic and one topic to verify.",
      hint: "Use plain language. The first answer can be small.",
      expectedAnswer: "Known topic and review topic",
      acceptedAnswers: ["known topic and review topic", "topic and gap", "baseline"],
    },
  ],
  quizQuestions: [
    {
      id: "quiz-cert-plan-1",
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
      prompt: "Help the learner separate known topics from uncertain topics.",
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
  title: "Spanish Greeting Practice",
  subject: "Spanish",
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
      prompt: "Write a greeting with your name.",
      hint: "Start with Hola, then add me llamo.",
      expectedAnswer: "Hola, me llamo Alex",
      acceptedAnswers: ["hola me llamo alex", "hola, me llamo alex"],
    },
  ],
  quizQuestions: [
    {
      id: "quiz-spanish-1",
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
      prompt: "Correct the phrase without overloading the learner.",
    },
    {
      kind: "alternate",
      title: "Explain another way",
      prompt: "Explain the exchange with a simple role-play.",
    },
    {
      kind: "encouragement",
      title: "Encourage repetition",
      prompt: "Encourage the learner to repeat the phrase out loud.",
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
    matchPhrases: ["pre-algebra", "pre algebra", "algebra", "combining like terms"],
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

export function getSampleLearningContentRecordForGoal(goal: string) {
  const normalizedGoal = normalize(goal);

  return sampleLearningContentRecords.find((record) =>
    record.matchPhrases.some((phrase) => normalizedGoal.includes(phrase))
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

export function getSampleLearningContentRecordForActivityTitle(title: string) {
  const normalizedTitle = normalize(title);

  return sampleLearningContentRecords.find(
    (record) =>
      normalize(record.activityTitle) === normalizedTitle ||
      normalize(record.lesson.title) === normalizedTitle ||
      record.matchPhrases.some((phrase) => normalizedTitle.includes(phrase))
  );
}

export function getSampleActivityTitleForGoal(goal: string) {
  return getSampleLearningContentRecordForGoal(goal)?.activityTitle;
}

export function getSampleActivityTitleForCourse(courseTitle: string) {
  return getSampleLearningContentRecordForSubject(courseTitle)?.activityTitle;
}

export function getSampleCurriculumScope(scopeId: string) {
  return sampleLearningContentRecords.find(
    (record) => record.curriculumScope?.id === scopeId
  )?.curriculumScope;
}
