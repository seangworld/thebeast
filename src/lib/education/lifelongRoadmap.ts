export type LifelongRoadmapSectionId =
  | "current-grade"
  | "academic-progress"
  | "career-interests"
  | "possible-careers"
  | "required-education"
  | "recommended-certifications"
  | "high-school-planning"
  | "college-planning"
  | "alternative-pathways";

export type LifelongRoadmapSection = {
  id: LifelongRoadmapSectionId;
  title: string;
  status: "known" | "exploring" | "needs-context";
  summary: string;
  items: readonly string[];
};

export type LifelongEducationRoadmap = {
  title: string;
  description: string;
  owner: "Guidance Counselor";
  updatePolicy: string;
  sections: readonly LifelongRoadmapSection[];
};

export type LifelongRoadmapInput = {
  currentGrade?: string;
  academicProgressPercent?: number;
  completedSessions?: number;
  careerInterests?: readonly string[];
  activeGoal?: string;
  goalCategory?: string;
  planSummary?: string;
  currentCourses?: readonly string[];
  earnedCertifications?: readonly string[];
};

function cleanList(values: readonly string[] | undefined) {
  return (values || []).map((value) => value.trim()).filter(Boolean);
}

export function buildLifelongEducationRoadmap(
  input: LifelongRoadmapInput
): LifelongEducationRoadmap {
  const careerInterests = cleanList(input.careerInterests);
  const courses = cleanList(input.currentCourses);
  const certifications = cleanList(input.earnedCertifications);
  const hasProgress = typeof input.academicProgressPercent === "number";
  const progress = hasProgress
    ? Math.min(100, Math.max(0, Math.round(input.academicProgressPercent || 0)))
    : undefined;
  const goal = input.activeGoal?.trim();
  const category = input.goalCategory?.trim();

  return {
    title: "Your lifelong educational & career roadmap",
    description:
      "One evolving view of where you are, where you may want to go, and the education pathways worth verifying.",
    owner: "Guidance Counselor",
    updatePolicy:
      "Your Guidance Counselor continuously updates this roadmap as your interests, goals, progress, requirements, and circumstances change.",
    sections: [
      {
        id: "current-grade",
        title: "Current grade",
        status: input.currentGrade?.trim() ? "known" : "needs-context",
        summary: input.currentGrade?.trim() || "Current grade or education stage has not been shared yet.",
        items: input.currentGrade?.trim()
          ? ["Use this stage to sequence age- and program-appropriate planning."]
          : ["Tell your Guidance Counselor your current grade, school year, or education stage."],
      },
      {
        id: "academic-progress",
        title: "Academic progress",
        status: hasProgress || courses.length > 0 ? "known" : "needs-context",
        summary: hasProgress
          ? `${progress}% progress across the current learning focus.`
          : "Academic progress evidence will appear as goals, courses, and sessions are recorded.",
        items: [
          `${input.completedSessions || 0} completed learning session${input.completedSessions === 1 ? "" : "s"}.`,
          courses.length > 0
            ? `Current learning: ${courses.join(", ")}.`
            : "No current course has been recorded.",
        ],
      },
      {
        id: "career-interests",
        title: "Career interests",
        status: careerInterests.length > 0 ? "known" : "needs-context",
        summary: careerInterests.length > 0
          ? careerInterests.join(", ")
          : "Career interests are ready to explore with your Guidance Counselor.",
        items: [
          "Track interests as hypotheses that can change with experience.",
          "Connect interests to real work, values, strengths, and constraints.",
        ],
      },
      {
        id: "possible-careers",
        title: "Possible careers",
        status: careerInterests.length > 0 || category ? "exploring" : "needs-context",
        summary: category
          ? `Explore credible roles connected to ${category}; no career has been selected for you.`
          : "Possible careers will be added after interests and priorities are understood.",
        items: [
          "Compare daily work, requirements, outlook, accessibility, and fit.",
          "Verify changing role information with authoritative sources before planning.",
        ],
      },
      {
        id: "required-education",
        title: "Required education",
        status: goal ? "exploring" : "needs-context",
        summary: goal
          ? `Verify the education, training, and experience requirements for ${goal}.`
          : "Required education depends on the career, school, credential, or personal goal you choose.",
        items: [
          input.planSummary?.trim() || "No verified education requirement has been recorded yet.",
          "Separate mandatory requirements from helpful or optional preparation.",
        ],
      },
      {
        id: "recommended-certifications",
        title: "Recommended certifications",
        status: certifications.length > 0 ? "known" : "exploring",
        summary: certifications.length > 0
          ? `Recorded credentials: ${certifications.join(", ")}.`
          : "No certification is recommended until its relevance and current requirements are verified.",
        items: [
          "Confirm that a credential is recognized for the intended outcome.",
          "Use current official objectives, costs, prerequisites, and renewal rules.",
        ],
      },
      {
        id: "high-school-planning",
        title: "High school planning",
        status: input.currentGrade?.trim() ? "exploring" : "needs-context",
        summary:
          "Connect graduation requirements, course choices, experiences, applications, and support to longer-term options.",
        items: [
          "Confirm local graduation and admissions requirements.",
          "Plan academics, activities, work-based learning, testing, aid, and deadlines without closing alternatives too early.",
        ],
      },
      {
        id: "college-planning",
        title: "College planning",
        status: goal || careerInterests.length > 0 ? "exploring" : "needs-context",
        summary:
          "Compare programs only after clarifying outcomes, constraints, prerequisites, cost, support, and accreditation.",
        items: [
          "Review two-year, four-year, transfer, online, and part-time options where relevant.",
          "Keep admissions, financial-aid, transfer, and program claims verified and current.",
        ],
      },
      {
        id: "alternative-pathways",
        title: "Alternative pathways",
        status: "exploring",
        summary:
          "Keep credible routes beyond a single traditional degree visible throughout the roadmap.",
        items: [
          "Compare apprenticeships, trades, military education, employer training, certificates, and work-based experience.",
          "Evaluate time, cost, portability, support, evidence, and the doors each pathway opens or closes.",
        ],
      },
    ],
  };
}
