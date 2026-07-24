import type { GuidanceDiscoveryProfile } from "./discoveryConversation";
import { buildGuidanceCounselorUnderstanding } from "./guidanceUnderstanding";

export type GuidanceWorkflowAction =
  | "goals"
  | "career-planning"
  | "schools"
  | "scholarships"
  | "certifications"
  | "roadmap"
  | "tutor";

export type GuidanceWorkflowRecommendation = {
  action: GuidanceWorkflowAction;
  eyebrow: string;
  title: string;
  introduction: string;
  why: string;
  outcome: string;
  actionLabel: string;
  href: string;
};

export type GuidanceWorkflowInput = {
  memberName: string;
  profile: GuidanceDiscoveryProfile;
  hasSavedGoal: boolean;
  hasSavedPlan: boolean;
  activeCourseCount: number;
  openSessionCount: number;
};

const fundingConstraint =
  /\b(cost|money|tuition|financial|afford|fund|scholarship|debt|aid)\b/i;
const certificationDirection =
  /\b(certification|certificate|credential|license|licensure|certified)\b/i;

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "there";
}

export function buildGuidanceWorkflowRecommendation({
  memberName,
  profile,
  hasSavedGoal,
  hasSavedPlan,
  activeCourseCount,
  openSessionCount,
}: GuidanceWorkflowInput): GuidanceWorkflowRecommendation {
  const understanding = buildGuidanceCounselorUnderstanding(profile);
  const name = firstName(memberName);
  const hasDirection =
    hasSavedGoal ||
    Boolean(profile.goal.trim()) ||
    profile.careerInterests.length > 0 ||
    profile.educationalGoals.length > 0;
  const direction = profile.goal.trim() || profile.careerInterests[0]?.trim();
  const certificationIsRelevant =
    profile.certifications.length > 0 ||
    certificationDirection.test(
      [profile.goal, ...profile.educationalGoals].join(" ")
    );

  if (!hasDirection) {
    return {
      action: "goals",
      eyebrow: "From your Guidance Counselor",
      title: "Let’s define what you want education to change",
      introduction: `${name}, I’d like us to choose a useful direction before we build the rest of your plan.`,
      why:
        "I do not know your intended outcome with enough confidence yet. A clear goal gives us a basis for comparing every path, school, credential, and learning step that follows.",
      outcome:
        "We will leave with a goal we can test and refine—not a permanent commitment.",
      actionLabel: "Define a goal with me",
      href: "/dashboard/education/goals",
    };
  }

  const careerUnderstanding = understanding.items.find(
    (item) => item.area === "career-goals"
  );
  if (
    careerUnderstanding?.confidence !== "high" &&
    profile.educationalGoals.length === 0
  ) {
    return {
      action: "career-planning",
      eyebrow: "From your Guidance Counselor",
      title: "Let’s test the career direction before choosing a program",
      introduction: `${name}, I see a possible direction. I don’t want us to treat it as settled before we examine the work and the fit.`,
      why: `${direction || "Your stated interest"} is a useful starting hypothesis, but we still need to compare role fit, progression, and real requirements before committing time or money to education.`,
      outcome:
        "We will identify credible roles to investigate and the evidence needed to narrow them.",
      actionLabel: "Explore career fit",
      href: "/dashboard/education/career-planning",
    };
  }

  if (certificationIsRelevant) {
    return {
      action: "certifications",
      eyebrow: "From your Guidance Counselor",
      title: "Let’s verify the credential path",
      introduction: `${name}, a certification is part of the direction you’ve described, so we should confirm what it actually requires.`,
      why:
        "Credential prerequisites, recognition, costs, exams, and renewal rules can change. Verifying them now keeps an unconfirmed requirement from shaping the rest of your roadmap.",
      outcome:
        "We will separate required credentials from optional ones and identify the authoritative source for each requirement.",
      actionLabel: "Review certification planning",
      href: "/dashboard/education/certifications",
    };
  }

  if (profile.collegeInterest === true && fundingConstraint.test(profile.constraints)) {
    return {
      action: "scholarships",
      eyebrow: "From your Guidance Counselor",
      title: "Let’s make funding part of the plan now",
      introduction: `${name}, you’ve told me college is in consideration and cost is part of the decision.`,
      why:
        "Affordability can change which paths are realistic. Building a verified funding strategy alongside school planning is more useful than searching for scholarships after decisions are already made.",
      outcome:
        "We will define the real costs to cover, eligibility evidence to verify, and a practical application pipeline.",
      actionLabel: "Plan how to fund it",
      href: "/dashboard/education/scholarships",
    };
  }

  if (profile.collegeInterest === true) {
    return {
      action: "schools",
      eyebrow: "From your Guidance Counselor",
      title: "Let’s decide what a school must do for you",
      introduction: `${name}, college is one of the paths you want us to consider. Now we can establish the right comparison criteria.`,
      why:
        "A school only becomes a useful option when its program, prerequisites, cost, support, delivery, and outcomes fit the goal we are building toward.",
      outcome:
        "We will create decision criteria before treating any institution as a recommendation.",
      actionLabel: "Build school criteria",
      href: "/dashboard/education/schools",
    };
  }

  if (!hasSavedPlan) {
    return {
      action: "roadmap",
      eyebrow: "From your Guidance Counselor",
      title: "Let’s turn the direction into a roadmap",
      introduction: `${name}, we have enough direction to sequence the decisions and learning ahead.`,
      why:
        "A roadmap will connect your goal to prerequisites, credible pathways, checkpoints, and the next decision without pretending every future requirement is already known.",
      outcome:
        "We will establish an ordered plan that can adapt as we verify requirements and learn more about you.",
      actionLabel: "Build the roadmap",
      href: "/dashboard/education/educational-roadmap",
    };
  }

  if (activeCourseCount > 0 || openSessionCount > 0) {
    return {
      action: "tutor",
      eyebrow: "From your Guidance Counselor",
      title: "Let’s bring in your Tutor for the next learning step",
      introduction: `${name}, the direction and roadmap are in place, and you have active learning ready to continue.`,
      why:
        "Tutor support adds value now because there is a specific course or session to work on. The Tutor can teach the next concept while I continue managing the larger plan.",
      outcome:
        "You will work on the immediate learning need, and the result will give me evidence for what should happen next.",
      actionLabel: "Continue with your Tutor",
      href: "/dashboard/education/tutor",
    };
  }

  return {
    action: "roadmap",
    eyebrow: "Your Guidance Counselor’s next recommendation",
    title: "Let’s review the roadmap before we add another step",
    introduction: `${name}, the next useful move is to make sure the plan still reflects where you are going.`,
    why:
      "There is no active course or session that needs your attention right now. Reviewing the roadmap helps us choose the next commitment for a reason instead of adding disconnected activity.",
    outcome:
      "We will confirm the next decision, course, credential, or planning task the roadmap actually calls for.",
    actionLabel: "Review the roadmap",
    href: "/dashboard/education/educational-roadmap",
  };
}
