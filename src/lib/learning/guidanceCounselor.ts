import type {
  GuidanceCounselorInput,
  GuidanceCounselorRoadmap,
  GuidanceGoalType,
} from "./types";

const guidanceRules: Record<
  GuidanceGoalType,
  {
    startingPoint: string;
    requiredEducationOrTraining: string[];
    skillsToBuild: string[];
    suggestedMilestones: string[];
    estimatedTimeline: string;
    questionsToConsider: string[];
    nextRecommendedAction: string;
    assumptions: string[];
    learningReadinessSignals: string[];
  }
> = {
  Career: {
    startingPoint: "Clarify the target role, current experience, and biggest skill gaps.",
    requiredEducationOrTraining: [
      "Review common role requirements in job descriptions.",
      "Identify whether a degree, certificate, portfolio, or experience proof is expected.",
      "Map transferable experience from current work or projects.",
    ],
    skillsToBuild: ["Role fundamentals", "Portfolio evidence", "Interview storytelling"],
    suggestedMilestones: [
      "Choose one target role.",
      "Compare three role descriptions.",
      "Build one proof-of-skill project or example.",
    ],
    estimatedTimeline: "3-6 month plan",
    questionsToConsider: [
      "What work do you want to do every week?",
      "Which current strengths transfer into this role?",
      "What proof would make you credible?",
    ],
    nextRecommendedAction: "Pick one target role and list its top five repeated requirements.",
    assumptions: [
      "The learner is exploring a direction and still needs current role requirements verified.",
      "Job descriptions, mentors, and local requirements should be checked before committing to a plan.",
    ],
    learningReadinessSignals: [
      "Learning Readiness",
      "confidence",
      "portfolio evidence",
      "study consistency",
    ],
  },
  "College path": {
    startingPoint: "Clarify intended major, school options, deadlines, and support needs.",
    requiredEducationOrTraining: [
      "Review graduation and admissions requirements.",
      "Map prerequisite courses and testing needs.",
      "Identify financial aid, application, or advising deadlines.",
    ],
    skillsToBuild: ["Academic planning", "Application organization", "Study habits"],
    suggestedMilestones: [
      "Create a deadline checklist.",
      "Compare two possible programs.",
      "Schedule one advising or family planning conversation.",
    ],
    estimatedTimeline: "Semester-by-semester plan",
    questionsToConsider: [
      "What environment helps you succeed?",
      "What costs or logistics matter most?",
      "Which prerequisites need attention first?",
    ],
    nextRecommendedAction: "Write down the next deadline and the requirement attached to it.",
    assumptions: [
      "The learner is using BeastEducation for planning support, not official school counseling.",
      "Program, admissions, financial aid, and graduation requirements must be confirmed with the school or official source.",
    ],
    learningReadinessSignals: [
      "Learning Readiness",
      "prerequisite completion",
      "study consistency",
      "learning momentum",
    ],
  },
  Certification: {
    startingPoint: "Identify the certification, exam domains, current level, and exam window.",
    requiredEducationOrTraining: [
      "Review official exam objectives.",
      "Choose study materials and practice resources.",
      "Set a review cadence for weak domains.",
    ],
    skillsToBuild: ["Objective recall", "Scenario practice", "Exam readiness"],
    suggestedMilestones: [
      "Read all exam domains.",
      "Complete one baseline practice check.",
      "Build a weak-domain review list.",
    ],
    estimatedTimeline: "6-10 week prep plan",
    questionsToConsider: [
      "Why is this certification useful now?",
      "Which domain feels weakest?",
      "What score or readiness signal is enough to schedule the exam?",
    ],
    nextRecommendedAction: "Choose the exam domain with the lowest confidence.",
    assumptions: [
      "The learner is preparing with adult certification study support and must verify current exam objectives with the issuing body.",
      "Practice scores estimate readiness but do not guarantee a passing score or credential outcome.",
    ],
    learningReadinessSignals: [
      "Learning Readiness",
      "confidence",
      "knowledge retention",
      "mastery",
      "study consistency",
    ],
  },
  Trade: {
    startingPoint: "Identify the trade path, safety requirements, tools, and entry route.",
    requiredEducationOrTraining: [
      "Review apprenticeship, school, licensing, or hands-on training options.",
      "Learn safety basics before practice.",
      "Identify required tools, materials, and supervision needs.",
    ],
    skillsToBuild: ["Safety habits", "Tool literacy", "Hands-on practice"],
    suggestedMilestones: [
      "List safety requirements.",
      "Complete one beginner practice project.",
      "Document technique improvements and mistakes.",
    ],
    estimatedTimeline: "3-12 month foundation plan",
    questionsToConsider: [
      "Is supervision or certification required?",
      "What tools are safe to practice with now?",
      "What beginner project proves progress?",
    ],
    nextRecommendedAction: "Choose one safe beginner project and identify required tools.",
    assumptions: [
      "The learner needs local licensing, safety, supervision, and apprenticeship requirements verified.",
      "Hands-on activities should follow age-appropriate safety rules and qualified supervision when required.",
    ],
    learningReadinessSignals: [
      "Learning Readiness",
      "prerequisite completion",
      "safe practice consistency",
      "skill confidence",
    ],
  },
  Promotion: {
    startingPoint: "Clarify the target role, current performance evidence, and leadership gaps.",
    requiredEducationOrTraining: [
      "Review expectations for the next level.",
      "Identify internal training or mentorship options.",
      "Collect measurable examples of impact.",
    ],
    skillsToBuild: ["Leadership communication", "Strategic ownership", "Evidence tracking"],
    suggestedMilestones: [
      "Write the promotion target and why it fits.",
      "Collect three proof points of impact.",
      "Ask for feedback on the next-level gap.",
    ],
    estimatedTimeline: "1-2 review cycles",
    questionsToConsider: [
      "What does the next level require that you do not yet show?",
      "Who can give useful feedback?",
      "What outcome would prove readiness?",
    ],
    nextRecommendedAction: "Draft three examples that show next-level responsibility.",
    assumptions: [
      "The learner is planning a growth path and should confirm promotion criteria with their organization.",
      "BeastEducation can organize preparation but cannot guarantee advancement or compensation changes.",
    ],
    learningReadinessSignals: [
      "Learning Readiness",
      "confidence",
      "learning momentum",
      "evidence quality",
    ],
  },
  "Skill goal": {
    startingPoint: "Define the skill, current level, use case, and visible outcome.",
    requiredEducationOrTraining: [
      "Choose one beginner-friendly learning source.",
      "Set a recurring practice routine.",
      "Create a simple project or demonstration target.",
    ],
    skillsToBuild: ["Foundations", "Deliberate practice", "Self-review"],
    suggestedMilestones: [
      "Define the first usable outcome.",
      "Practice the core technique repeatedly.",
      "Review progress and choose the next constraint.",
    ],
    estimatedTimeline: "4-8 week starter plan",
    questionsToConsider: [
      "Where will you use this skill?",
      "What would prove you improved?",
      "What practice rhythm is realistic?",
    ],
    nextRecommendedAction: "Write one small outcome you can complete this week.",
    assumptions: [
      "The learner can start with a small observable outcome and adjust once practice evidence exists.",
      "Any specialized, regulated, or safety-sensitive skill needs qualified review before real-world use.",
    ],
    learningReadinessSignals: [
      "Learning Readiness",
      "confidence",
      "knowledge retention",
      "learning momentum",
    ],
  },
};

function cleanGoal(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "Learning goal";
}

const curriculumFramework = {
  model: "subject-agnostic" as const,
  hierarchy: [
    "Subject",
    "Course",
    "Unit",
    "Lesson",
    "Concept",
    "Skill",
    "Objective",
    "Practice check",
  ],
  objectivePattern: [
    "Name the learner outcome.",
    "Identify prerequisites.",
    "Teach one focused concept.",
    "Practice with feedback.",
    "Check mastery evidence.",
    "Recommend the next step.",
  ],
  exampleSubjects: [
    "Algebra",
    "CompTIA",
    "Security+",
    "A+",
    "Python",
    "History",
    "Science",
  ],
  newSubjectRequiresCodeChange: false,
};

const planningBoundaries = [
  "BeastEducation provides planning support, not official school counseling.",
  "Guidance is educational and does not guarantee admission, employment, promotion, licensing, certification, or credential outcomes.",
  "Recommendations should be checked against current school, employer, licensing, exam, and safety requirements.",
  "Student and minor safety requirements remain in force for every goal type, including adult certification examples.",
];

export function buildGuidanceCounselorRoadmap(
  input: GuidanceCounselorInput
): GuidanceCounselorRoadmap {
  const goal = cleanGoal(input.futureGoal);
  const rule = guidanceRules[input.goalType];

  return {
    title: `${input.goalType}: ${goal}`,
    startingPoint: rule.startingPoint,
    requiredEducationOrTraining: rule.requiredEducationOrTraining,
    skillsToBuild: rule.skillsToBuild,
    suggestedMilestones: rule.suggestedMilestones,
    estimatedTimeline: rule.estimatedTimeline,
    questionsToConsider: rule.questionsToConsider,
    nextRecommendedAction: rule.nextRecommendedAction,
    previewLabel: "Planning Guidance Counselor",
    assumptions: rule.assumptions,
    planningBoundaries,
    learningReadinessSignals: rule.learningReadinessSignals,
    curriculumFramework,
    tutorFlowPrinciple:
      "Walk the learner through one tutor-like next step at a time before adding more planning detail.",
  };
}
