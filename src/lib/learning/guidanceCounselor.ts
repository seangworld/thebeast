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
  },
};

function cleanGoal(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "Learning goal";
}

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
    previewLabel: "Planning Guide",
  };
}
