import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { beastModuleRegistry } from "../src/lib/moduleRegistry";
import {
  groupSearchResults,
  searchPlatformIndex,
} from "../src/lib/platform/search";
import { buildUnifiedSearchItems } from "../src/lib/platform/unifiedSearch";

const updatedAt = "2026-07-26T12:00:00.000Z";

test("BO-310 indexes real personal knowledge categories without AI summaries", () => {
  const items = buildUnifiedSearchItems({
    conversations: [
      {
        id: "conversation-1",
        agentId: "beastmoney.money-coach",
        title: "Debt payoff discussion",
        summary: "We compared payoff options.",
        tags: ["payoff"],
        updatedAt,
      },
    ],
    goals: [
      {
        id: "goal-1",
        title: "Earn a certification",
        summary: "Prepare for an IT credential.",
        category: "Education",
        status: "Active",
        currentStep: "Choose the credential",
        updatedAt,
      },
    ],
    documents: [
      {
        id: "document-1",
        title: "Lab result",
        category: "Health",
        status: "Ready",
        fileName: "lab.pdf",
        mimeType: "application/pdf",
        updatedAt,
      },
      {
        id: "document-2",
        title: "Tax upload",
        category: "Tax",
        status: "Uploaded",
        fileName: "tax.pdf",
        mimeType: "application/pdf",
        updatedAt,
      },
      {
        id: "document-3",
        title: "Career assessment",
        category: "Learning",
        status: "Ready",
        fileName: "career.pdf",
        mimeType: "application/pdf",
        updatedAt,
      },
    ],
    financialAccounts: [
      {
        id: "account-1",
        name: "Primary checking",
        type: "checking",
        active: true,
        updatedAt,
      },
    ],
    debts: [
      {
        id: "debt-1",
        name: "Credit card",
        archived: false,
        updatedAt,
      },
    ],
    lessons: [
      {
        id: "lesson-1",
        title: "Networking foundations",
        activityType: "Lesson",
        difficulty: "Beginner",
        status: "Ready",
        updatedAt,
      },
    ],
    roadmaps: [
      {
        id: "roadmap-1",
        title: "IT career roadmap",
        summary: "A staged learning plan.",
        updatedAt,
      },
    ],
    futureModules: beastModuleRegistry.filter(
      (module) => module.identifier === "health"
    ),
  });
  const groups = groupSearchResults(
    searchPlatformIndex({ items, query: "", allowedPermissionScopes: ["Owner"] })
  );

  assert.deepEqual(
    groups.map((group) => group.domain),
    [
      "Conversations",
      "Goals",
      "Documents",
      "Financial accounts",
      "Debts",
      "Roadmaps",
      "Health records",
      "Uploaded files",
    ]
  );
  assert.equal(items.some((item) => item.summary.includes("AI summary")), false);
});

test("BO-310 enforces module and family permission scopes before returning results", () => {
  const items = buildUnifiedSearchItems({
    financialAccounts: [
      {
        id: "account-1",
        name: "Private checking",
        type: "checking",
        active: true,
        updatedAt,
      },
    ],
    familyMembers: [
      {
        id: "member-1",
        displayName: "Household member",
        relationship: "Family",
        permissionScope: "Household",
        updatedAt,
      },
    ],
  });

  const ownerOnly = searchPlatformIndex({
    items,
    query: "",
    allowedPermissionScopes: ["Owner"],
    allowedModules: ["beastos", "family"],
  });
  const authorizedFamily = searchPlatformIndex({
    items,
    query: "household",
    allowedPermissionScopes: ["Owner", "Household"],
    allowedModules: ["family"],
  });

  assert.equal(ownerOnly.length, 0);
  assert.equal(authorizedFamily.length, 1);
  assert.equal(authorizedFamily[0].domain, "Family members");
});

test("BO-310 ignores deleted documents and does not fabricate family records", () => {
  const items = buildUnifiedSearchItems({
    documents: [
      {
        id: "deleted-document",
        title: "Removed file",
        category: "Other",
        status: "Deleted",
        fileName: "removed.pdf",
        mimeType: "application/pdf",
        updatedAt,
      },
    ],
  });

  assert.deepEqual(items, []);
});

test("BO-310 loads authenticated owner-scoped records and one unified client", () => {
  const page = readFileSync("src/app/dashboard/search/page.tsx", "utf8");
  const workspace = readFileSync(
    "src/app/dashboard/search/UnifiedSearchWorkspace.tsx",
    "utf8"
  );

  for (const table of [
    "agent_conversations",
    "beast_goals",
    "beast_documents",
    "funding_sources",
    "debts",
    "learning_plans",
  ]) {
    assert.match(page, new RegExp(`from\\("${table}"\\)`));
  }
  assert.match(page, /educationTeachingCapabilitiesAvailable/);
  assert.match(page, /\.eq\("owner_id", ownerId\)/);
  assert.match(page, /\.eq\("user_id", ownerId\)/);
  assert.match(page, /shouldUseLearningOnlyNavigation/);
  assert.match(page, /getVisibleModuleRegistryEntries/);
  assert.match(workspace, /id="beast-unified-search"/);
  assert.equal(
    (workspace.match(/<input/g) || []).length,
    1
  );
});

test("BO-310 supports keyboard navigation and owner-isolated recent searches", () => {
  const workspace = readFileSync(
    "src/app/dashboard/search/UnifiedSearchWorkspace.tsx",
    "utf8"
  );

  assert.match(workspace, /ArrowDown/);
  assert.match(workspace, /ArrowUp/);
  assert.match(workspace, /event\.key === "Enter"/);
  assert.match(workspace, /event\.key === "Escape"/);
  assert.match(workspace, /aria-activedescendant/);
  assert.match(workspace, /window\.localStorage\.getItem\(storageKey\)/);
  assert.match(workspace, /window\.localStorage\.setItem\(ownerStorageKey/);
  assert.match(workspace, /buildSearchActionRequest/);
  assert.match(workspace, /data-mobile-shared-service="search"/);
});
