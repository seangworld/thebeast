import type { MentorHomeMission } from "./mentorHome";

export type GuidanceCounselorMissionAssignment = {
  introduction: string;
  why: string;
  expectedOutcome: string;
  roadmapConnection: string;
  afterCompletion: string;
  actionLabel: string;
};

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "there";
}

function assignmentIntroduction(
  learnerName: string,
  state: MentorHomeMission["state"]
) {
  const name = firstName(learnerName);
  if (state === "resume") {
    return `${name}, I’d like us to continue here today.`;
  }
  if (state === "first_use") {
    return `${name}, I’d like us to begin by finding the right direction together.`;
  }
  if (state === "completed_queue") {
    return `${name}, I’d like us to choose what deserves your attention next.`;
  }
  if (state === "review") {
    return `${name}, I’d like us to pause and review this together today.`;
  }
  return `${name}, I’d like us to begin here today.`;
}

function expectedOutcome(mission: MentorHomeMission) {
  if (mission.state === "first_use") {
    return "Establish enough context for us to choose a credible first learning step.";
  }
  if (mission.state === "resume") {
    return `Complete or save ${mission.missionTitle} so unfinished work becomes useful progress evidence.`;
  }
  if (mission.state === "completed_queue") {
    return "Agree on the next useful goal, course, review, or certification step.";
  }
  if (mission.state === "review") {
    return "Clarify what is secure, what needs reinforcement, and which step should come next.";
  }
  return `Complete ${mission.missionTitle} and give us fresh evidence for the next planning decision.`;
}

function assignmentActionLabel(state: MentorHomeMission["state"]) {
  if (state === "resume") return "Continue with my guidance";
  if (state === "first_use") return "Tell me where to begin";
  if (state === "completed_queue") return "Plan our next step";
  if (state === "review") return "Review this with me";
  return "Begin here today";
}

export function buildGuidanceCounselorMissionAssignment(
  learnerName: string,
  mission: MentorHomeMission
): GuidanceCounselorMissionAssignment {
  return {
    introduction: assignmentIntroduction(learnerName, mission.state),
    why: mission.recommendationReason,
    expectedOutcome: expectedOutcome(mission),
    roadmapConnection: `This supports ${mission.currentGoalLabel}. ${mission.journeyProgressLabel} Next milestone: ${mission.journeyMilestoneLabel}.`,
    afterCompletion: mission.nextAfterLabel,
    actionLabel: assignmentActionLabel(mission.state),
  };
}
