import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { Goal } from "../src/lib/platform/goals";
import type { BeastDocument } from "../src/lib/platform/documents";
import {
  contextualWorkspaceConfigs,
  documentMatchesContext,
  goalMatchesContext,
} from "../src/lib/platform/contextualWorkspaces";
import {
  beastLearningNavigation,
  memberBeastEducationNavigation,
} from "../src/lib/moduleNavigation";

function goal(overrides: Partial<Goal>): Goal {
  return {
    id: "goal",
    ownerId: "owner",
    title: "Shared goal",
    category: "Personal",
    status: "Active",
    tags: [],
    milestones: [],
    supportItems: [],
    references: [],
    contributions: [],
    recommendations: [],
    lifecycleEvents: [],
    fieldSources: [],
    createdAt: "2026-08-01T00:00:00Z",
    updatedAt: "2026-08-01T00:00:00Z",
    ...overrides,
  };
}

function document(overrides: Partial<BeastDocument>): BeastDocument {
  return {
    id: "document",
    ownerId: "owner",
    title: "Shared document",
    category: "Other",
    status: "Ready",
    tags: [],
    metadata: {},
    storage: {
      bucket: "documents",
      path: "owner/document",
      fileName: "document.pdf",
      mimeType: "application/pdf",
      sizeBytes: 10,
    },
    collections: [],
    accessGrants: [],
    goalReferences: [],
    calendarLinks: [],
    moduleLinks: [],
    createdAt: "2026-08-01T00:00:00Z",
    updatedAt: "2026-08-01T00:00:00Z",
    ...overrides,
  };
}

test("BO-502 contextual goals include canonical records linked through multiple supported signals", () => {
  const education = contextualWorkspaceConfigs.education;
  assert.equal(goalMatchesContext(goal({ category: "Career" }), education), true);
  assert.equal(goalMatchesContext(goal({ tags: ["education", "money"] }), education), true);
  assert.equal(
    goalMatchesContext(
      goal({
        contributions: [
          {
            id: "contribution",
            ownerId: "owner",
            goalId: "goal",
            sourceModule: "learning",
            type: "Progress",
            status: "Active",
            title: "Education progress",
            summary: "Shared progress",
            occurredAt: "2026-08-01T00:00:00Z",
            createdAt: "2026-08-01T00:00:00Z",
            updatedAt: "2026-08-01T00:00:00Z",
          },
        ],
      }),
      education
    ),
    true
  );
});

test("BO-502 cross-tagged goals appear in more than one contextual view without duplication", () => {
  const shared = goal({ category: "Career", tags: ["money"] });
  assert.equal(goalMatchesContext(shared, contextualWorkspaceConfigs.education), true);
  assert.equal(goalMatchesContext(shared, contextualWorkspaceConfigs.money), true);
  assert.equal(shared.id, "goal");
});

test("BO-502 documents use active owner-scoped module links and cross-context tags", () => {
  const linked = document({
    moduleLinks: [
      {
        id: "link",
        ownerId: "owner",
        documentId: "document",
        sourceModule: "health",
        title: "Health Documents",
        status: "Active",
        createdAt: "2026-08-01T00:00:00Z",
        updatedAt: "2026-08-01T00:00:00Z",
      },
    ],
  });
  assert.equal(documentMatchesContext(linked, contextualWorkspaceConfigs.health), true);
  assert.equal(
    documentMatchesContext(document({ tags: ["health", "money"] }), contextualWorkspaceConfigs.money),
    true
  );
});

test("BO-502 navigation uses distinct planning and contextual shared-workspace routes", () => {
  for (const navigation of [beastLearningNavigation, memberBeastEducationNavigation]) {
    const labels = navigation.children?.map((item) => item.label) || [];
    assert.ok(labels.includes("Education Planning"));
    assert.ok(labels.includes("Career Planning"));
    assert.ok(labels.includes("Education Goals"));
    assert.ok(labels.includes("Education Documents"));
    assert.equal(labels.includes("Paths"), false);
    assert.equal(labels.includes("Roadmap"), false);
  }
});

test("BO-502 contextual creation preserves canonical tables and owner checks", () => {
  const goals = readFileSync("src/app/dashboard/goals/LifePlanningHub.tsx", "utf8");
  const uploads = readFileSync("src/app/dashboard/uploads/DocumentUploadDropzone.tsx", "utf8");
  assert.match(goals, /source_module: context\.module/);
  assert.match(goals, /\.eq\("owner_id", memberId\)/);
  assert.match(uploads, /from\("beast_documents"\)/);
  assert.match(uploads, /from\("beast_document_module_links"\)/);
  assert.match(uploads, /owner_id: ownerId/);
  assert.doesNotMatch(goals, /education_goals|health_goals|money_goals|home_goals/);
});

test("BO-502 retains owner-only guards where required while canonical RLS remains authoritative", () => {
  const guard = readFileSync("src/app/dashboard/OwnerOnlyModuleGuard.tsx", "utf8");
  for (const path of [
    "src/app/dashboard/home/goals/page.tsx",
    "src/app/dashboard/home/documents/page.tsx",
  ]) {
    assert.match(readFileSync(path, "utf8"), /OwnerOnlyModuleGuard/);
  }
  assert.doesNotMatch(
    readFileSync("src/app/dashboard/health/goals/page.tsx", "utf8"),
    /OwnerOnlyModuleGuard/
  );
  assert.doesNotMatch(
    readFileSync("src/app/dashboard/health/documents/page.tsx", "utf8"),
    /OwnerOnlyModuleGuard/
  );
  assert.match(guard, /isBeastAdminOwnerRole/);
  assert.match(guard, /router\.replace\("\/dashboard"\)/);
  assert.doesNotMatch(guard, /service_role|SUPABASE_SERVICE_ROLE_KEY/);
});

test("BO-502 exposes every contextual route and retains direct BeastOS views", () => {
  for (const path of [
    "src/app/dashboard/education/goals/page.tsx",
    "src/app/dashboard/education/documents/page.tsx",
    "src/app/dashboard/health/goals/page.tsx",
    "src/app/dashboard/health/documents/page.tsx",
    "src/app/dashboard/money/goals/page.tsx",
    "src/app/dashboard/money/documents/page.tsx",
    "src/app/dashboard/home/goals/page.tsx",
    "src/app/dashboard/home/documents/page.tsx",
    "src/app/dashboard/goals/page.tsx",
    "src/app/dashboard/uploads/page.tsx",
  ]) {
    assert.ok(readFileSync(path, "utf8").length > 0, path);
  }
});

test("BO-502 keeps planning compatibility and documents the shared ownership model", () => {
  const aliases = readFileSync("src/lib/education/generationBoundary.ts", "utf8");
  const docs = readFileSync("docs/BO-502-CONTEXTUAL-WORKSPACES.md", "utf8");
  assert.match(aliases, /educational-roadmap[\s\S]*education-planning/);
  assert.match(docs, /BeastOS remains the authoritative owner of Goals and Documents/);
  assert.match(docs, /No schema change is required/);
});
