import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { buildEducationPlanningReports } from "../src/lib/education/planningReports";
import {
  beastLearningNavigation,
  memberBeastEducationNavigation,
} from "../src/lib/moduleNavigation";

const approvedNavigation = [
  ["Dashboard", "/dashboard/education"],
  ["Guidance Counselor", "/dashboard/education/guidance-counselor"],
  ["Educational Roadmap", "/dashboard/education/educational-roadmap"],
  ["Career Planning", "/dashboard/education/career-planning"],
  ["Schools", "/dashboard/education/schools"],
  ["Scholarships", "/dashboard/education/scholarships"],
  ["Certifications", "/dashboard/education/certifications"],
  ["Skills", "/dashboard/education/skills"],
  ["Reports", "/dashboard/education/reports"],
];

test("BP-400 exposes only the approved Generation 1 BeastEducation navigation", () => {
  for (const navigation of [
    beastLearningNavigation,
    memberBeastEducationNavigation,
  ]) {
    assert.deepEqual(
      navigation.children?.map((item) => [item.label, item.href]),
      approvedNavigation
    );
  }
});

test("BP-400 keeps future teaching routes in code while hiding them from navigation", () => {
  const hiddenDestinations = [
    "tutor",
    "lesson-history",
    "courses",
    "achievements",
  ];
  const visibleHrefs =
    memberBeastEducationNavigation.children?.map((item) => item.href) || [];

  for (const destination of hiddenDestinations) {
    assert.ok(
      existsSync(`src/app/dashboard/education/[workspace]/page.tsx`),
      "the compatibility workspace route remains available"
    );
    assert.ok(
      !visibleHrefs.includes(`/dashboard/education/${destination}`),
      `${destination} remains hidden from Generation 1 navigation`
    );
  }

  const legacyDashboard = readFileSync(
    "src/app/dashboard/learning/LegacyLearningDashboard.tsx",
    "utf8"
  );
  assert.match(legacyDashboard, /LearningAIOrchestrationPanel/);
  assert.doesNotMatch(
    readFileSync("src/app/dashboard/learning/page.tsx", "utf8"),
    /LegacyLearningDashboard/
  );
});

test("BP-400 gives Dashboard and Guidance Counselor independent ownership", () => {
  const experience = readFileSync(
    "src/app/dashboard/learning/BeastEducationExperience.tsx",
    "utf8"
  );
  const counselorRoute = readFileSync(
    "src/app/dashboard/education/guidance-counselor/page.tsx",
    "utf8"
  );

  for (const heading of [
    "Executive Education Briefing",
    "Current Goal",
    "Current Career Path",
    "Today’s recommendation",
    "Current Progress",
    "Upcoming Milestones",
    "Quick Summary",
  ]) {
    assert.match(experience, new RegExp(heading));
  }
  assert.match(counselorRoute, /mode="guidance-counselor"/);
  assert.ok(
    experience.indexOf("<GuidanceCounselorConversation") <
      experience.lastIndexOf("<RecommendationCard recommendation={recommendation}")
  );
  assert.doesNotMatch(
    experience,
    /Learning Operations|AI Orchestration|Rule Engine|Curriculum Brain|Specialist Network/
  );
});

test("BP-400 routes Education goals and documents through filtered BeastOS services", () => {
  const goalsCompatibility = readFileSync(
    "src/app/dashboard/education/goals/page.tsx",
    "utf8"
  );
  const goals = readFileSync("src/app/dashboard/goals/page.tsx", "utf8");
  const documents = readFileSync("src/app/dashboard/uploads/page.tsx", "utf8");

  assert.match(goalsCompatibility, /\/dashboard\/goals\?module=education/);
  assert.match(goals, /searchParams\?\.module === "education"/);
  assert.match(goals, /goal\.sourceModule === "learning"/);
  assert.match(documents, /searchParams\?\.module === "education"/);
  assert.match(documents, /document\.sourceModule === "learning"/);
});

test("BP-400 keeps planning reports truthful and planning-oriented", () => {
  const bundle = buildEducationPlanningReports({
    profileRow: {
      goal: "Become an IT professional",
      career_interests: ["IT professional"],
      available_study_time_known: false,
    },
    goals: [
      {
        id: "goal-1",
        title: "Build an IT career path",
        status: "Active",
      },
    ],
    plans: [
      {
        id: "plan-1",
        goal_id: "goal-1",
        title: "IT career roadmap",
        summary: "Verify roles, requirements, and the first credible step.",
      },
    ],
    certificates: [],
    asOf: "2026-07-29T12:00:00.000Z",
  });

  assert.deepEqual(
    bundle.reports.map((report) => report.id),
    ["education", "career", "roadmap", "certifications"]
  );
  assert.equal(
    bundle.reports[1].rows[0].value,
    "IT professional"
  );
  assert.match(bundle.disclosure, /do not establish admissions/);
  assert.doesNotMatch(JSON.stringify(bundle), /Tutor|homework|lesson/i);
});

test("BP-400 workspaces use responsive, bounded layouts", () => {
  const experience = readFileSync(
    "src/app/dashboard/learning/BeastEducationExperience.tsx",
    "utf8"
  );
  const workspace = readFileSync(
    "src/app/dashboard/learning/LearningWorkspaceView.tsx",
    "utf8"
  );

  assert.match(experience, /beast-container space-y-6 sm:space-y-8/);
  assert.match(experience, /md:grid-cols-2 xl:grid-cols-3/);
  assert.match(workspace, /sm:grid-cols-2 xl:grid-cols-4/);
  assert.match(workspace, /min-w-0/);
});
