import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildLifelongEducationRoadmap } from "../src/lib/education/lifelongRoadmap";

test("BE-203 builds every required lifelong roadmap section", () => {
  const roadmap = buildLifelongEducationRoadmap({
    currentGrade: "11th grade",
    academicProgressPercent: 64,
    completedSessions: 5,
    careerInterests: ["Cybersecurity", "Public service"],
    activeGoal: "Explore security careers",
    goalCategory: "Technology",
    planSummary: "Compare verified education requirements.",
    currentCourses: ["Computer science"],
    earnedCertifications: ["First aid"],
  });

  assert.equal(roadmap.owner, "Guidance Counselor");
  assert.match(roadmap.updatePolicy, /continuously updates/i);
  assert.deepEqual(
    roadmap.sections.map((section) => section.id),
    [
      "current-grade",
      "academic-progress",
      "career-interests",
      "possible-careers",
      "required-education",
      "recommended-certifications",
      "high-school-planning",
      "college-planning",
      "alternative-pathways",
    ]
  );
  assert.match(
    roadmap.sections.find((section) => section.id === "academic-progress")!.summary,
    /64%/
  );
});

test("BE-203 handles missing roadmap context without inventing facts", () => {
  const roadmap = buildLifelongEducationRoadmap({});

  assert.equal(
    roadmap.sections.find((section) => section.id === "current-grade")!.status,
    "needs-context"
  );
  assert.match(
    roadmap.sections.find((section) => section.id === "recommended-certifications")!.summary,
    /No certification is recommended/
  );
  assert.match(
    roadmap.sections.find((section) => section.id === "possible-careers")!.summary,
    /after interests and priorities are understood/
  );
});

test("BE-203 makes the roadmap central to the Guidance Counselor experience", () => {
  const page = readFileSync("src/app/dashboard/learning/page.tsx", "utf8");
  const view = readFileSync(
    "src/app/dashboard/learning/EducationalCareerRoadmap.tsx",
    "utf8"
  );

  assert.match(page, /buildLifelongEducationRoadmap/);
  assert.match(page, /<EducationalCareerRoadmap roadmap=\{lifelongRoadmap\} \/>/);
  assert.ok(
    page.indexOf("<EducationalCareerRoadmap") <
      page.indexOf("<LearningMissionControl"),
    "the lifelong roadmap should precede supporting dashboards"
  );
  assert.match(view, /Central artifact/);
  assert.match(view, /data-roadmap-section/);
  assert.match(view, /md:grid-cols-2 xl:grid-cols-3/);
});
