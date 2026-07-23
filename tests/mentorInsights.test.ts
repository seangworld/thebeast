import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildMentorInsights,
  createMentorObservationIntelligence,
  type LearningObservationData,
} from "../src/lib/learning/mentorInsights";

const now = "2026-07-23T12:00:00.000Z";

test("BL-404 detects concept improvement and explains why from saved attempts", () => {
  const insights = buildMentorInsights(
    {
      attempts: [
        {
          id: "earlier",
          title: "Algebra foundations",
          completedAt: "2026-07-20T12:00:00.000Z",
          strengths: [],
          weakConcepts: ["Algebra"],
        },
        {
          id: "current",
          title: "Algebra practice",
          completedAt: "2026-07-22T12:00:00.000Z",
          strengths: ["Algebra"],
          weakConcepts: [],
        },
      ],
    },
    "owner-1",
    now
  );
  const improvement = insights.find(({ type }) => type === "Improvement");

  assert.equal(improvement?.presentation.title, "You're improving in Algebra");
  assert.match(improvement?.presentation.whyNoticed || "", /same concept moved/);
  assert.equal(improvement?.evidence.length, 2);
  assert.ok(improvement?.provenance.sourceSystems.every((source) => source.startsWith("beasteducation.")));
});

test("BL-404 recommends review and recognizes repeated difficulty without judging ability", () => {
  const data: LearningObservationData = {
    attempts: [
      {
        id: "one",
        title: "Multi-step practice",
        completedAt: "2026-07-20T12:00:00.000Z",
        strengths: [],
        weakConcepts: ["multi-step problems"],
      },
      {
        id: "two",
        title: "Equation review",
        completedAt: "2026-07-22T12:00:00.000Z",
        strengths: [],
        weakConcepts: ["multi-step problems"],
        reviewDue: true,
      },
    ],
  };
  const insights = buildMentorInsights(data, "owner-1", now);

  assert.ok(insights.some(({ presentation }) => /Review is recommended/.test(presentation.title)));
  const difficulty = insights.find(({ type }) => type === "Trend");
  assert.match(difficulty?.presentation.title || "", /still taking extra work/);
  assert.match(difficulty?.presentation.detail || "", /not a judgment about ability/);
  assert.equal(difficulty?.presentation.workspaceTarget, "/dashboard/education/reviews");
});

test("BL-404 only makes pace and reading claims when personal comparison data exists", () => {
  const withoutBaselines = buildMentorInsights(
    {
      attempts: [{
        id: "only",
        title: "Fractions",
        completedAt: now,
        strengths: ["Fractions"],
        weakConcepts: [],
        durationMinutes: 10,
        readingWordsPerMinute: 140,
      }],
    },
    "owner-1",
    now
  );
  assert.equal(withoutBaselines.some(({ category }) => category === "Learning pace"), false);
  assert.equal(withoutBaselines.some(({ category }) => category === "Reading"), false);

  const compared = buildMentorInsights(
    {
      attempts: [
        {
          id: "current",
          title: "Fractions",
          completedAt: "2026-07-22T12:00:00.000Z",
          strengths: [],
          weakConcepts: [],
          durationMinutes: 10,
          personalBaselineMinutes: 18,
          readingWordsPerMinute: 150,
        },
        {
          id: "prior",
          title: "Reading baseline",
          completedAt: "2026-07-20T12:00:00.000Z",
          strengths: [],
          weakConcepts: [],
          readingWordsPerMinute: 130,
        },
      ],
    },
    "owner-1",
    now
  );
  assert.ok(compared.some(({ category }) => category === "Learning pace"));
  assert.ok(compared.some(({ category }) => category === "Reading"));
  assert.ok(compared.every(({ provenance }) => provenance.limitations.some((item) => /educational observation/.test(item))));
});

test("BL-404 uses shared observation lifecycle and renders Explain Why", () => {
  const engine = createMentorObservationIntelligence();
  const context = {
    ownerId: "owner-1",
    specialistId: "beasteducation.guidance-counselor",
    asOf: now,
    authorizedDomains: ["education"],
    data: {
      attempts: [{
        id: "review",
        title: "Fractions",
        completedAt: now,
        strengths: [],
        weakConcepts: [],
        reviewDue: true,
      }],
    },
  };
  const insight = engine.analyze(context)[0];
  assert.equal(engine.explain("owner-1", insight.id).facts.length, 1);
  engine.dismiss("owner-1", insight.id, "owner-1");
  assert.equal(engine.analyze(context).length, 0);

  const source = readFileSync(
    "src/app/dashboard/learning/LearningMissionControl.tsx",
    "utf8"
  );
  assert.match(source, /Mentor Insights/);
  assert.match(source, /Explain Why/);
  assert.match(source, /insight\.evidence/);
  assert.match(source, /insight\.provenance\.limitations/);
});
