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
  ["Homework Helper / AI Tutor", "/dashboard/education/tutor"],
  ["About You", "/dashboard/education/about-you"],
  ["Education Planning", "/dashboard/education/education-planning"],
  ["Career Planning", "/dashboard/education/career-planning"],
  ["Education Goals", "/dashboard/education/goals"],
  ["Schools", "/dashboard/education/schools"],
  ["Certifications", "/dashboard/education/certifications"],
  ["Scholarships", "/dashboard/education/scholarships"],
  ["Education Documents", "/dashboard/education/documents"],
  ["Progress & Decisions", "/dashboard/education/progress"],
];

test("BE-201 exposes only the approved Education and Career navigation", () => {
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

test("BE-301 releases Tutor while keeping unrelated legacy teaching routes hidden", () => {
  const hiddenDestinations = [
    "lesson-history",
    "courses",
    "achievements",
  ];
  const visibleHrefs =
    memberBeastEducationNavigation.children?.map((item) => item.href) || [];
  assert.ok(visibleHrefs.includes("/dashboard/education/tutor"));

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
    "Your plan today",
    "Current Goal",
    "Career Direction",
    "Today’s recommendation",
    "Current Progress",
    "Next steps",
    "Quick Summary",
  ]) {
    assert.match(experience, new RegExp(heading));
  }
  assert.match(counselorRoute, /mode="guidance-counselor"/);
  assert.match(experience, /<GuidanceCounselorConversation[\s\S]*recommendation=\{recommendation\}/);
  assert.equal(
    (experience.match(/<RecommendationCard recommendation=\{recommendation\}/g) || [])
      .length,
    1,
    "the dashboard owns its summary card while the Counselor owns the live recommendation"
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

  assert.match(goalsCompatibility, /GoalsOverviewPage[\s\S]*module: "education"/);
  assert.match(goals, /getContextualWorkspaceConfig/);
  assert.match(goals, /goalMatchesContext/);
  assert.match(documents, /getContextualWorkspaceConfig/);
  assert.match(documents, /documentMatchesContext/);
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
