import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  beastAdminTelemetry,
  buildBeastAdminExecutiveSnapshot,
  buildRecentBeastReleases,
  type BeastAdminReleaseIdentity,
} from "../src/lib/beastAdminExecutive";
import { beastModuleRegistry } from "../src/lib/moduleRegistry";

test("BA-101 legacy executive snapshot does not invent members without a live source", () => {
  const snapshot = buildBeastAdminExecutiveSnapshot();

  assert.deepEqual(snapshot.platformHealth, {
    label: "Visibility incomplete",
    tone: "yellow",
    summary:
      "All registered modules are enabled, but runtime health cannot be confirmed until AI usage and error telemetry are connected.",
    enabledModules: 8,
    registeredModules: 8,
    observabilityGaps: ["AI Usage", "Errors"],
  });
  assert.deepEqual(snapshot.members, {
    total: 0,
    active: 0,
    invited: 0,
    paused: 0,
    betaRoleMembers: 0,
    sourceLabel: "No live member source supplied",
  });
  assert.deepEqual(snapshot.modules.byStatus, {
    active: 3,
    foundation: 5,
    planned: 0,
    disabled: 0,
  });
  assert.equal(snapshot.modules.enabled, 8);
  assert.equal(snapshot.modules.beta, 3);
  assert.deepEqual(
    snapshot.featureProgress.operating.map((module) => module.name),
    ["BeastOS", "BeastMoney", "BeastEducation"]
  );
  assert.deepEqual(
    snapshot.featureProgress.foundations.map((module) => module.name),
    ["BeastGoals", "BeastDocuments", "BeastHealth", "BeastHome", "BeastAdmin"]
  );
  assert.equal(snapshot.betaActivity.assignedMembers, 0);
  assert.equal(snapshot.betaActivity.assignments.length, 0);
  assert.equal(snapshot.betaActivity.openFeedback.length, 0);
});

test("BA-101 never converts unavailable AI usage or errors into false zeroes", () => {
  assert.deepEqual(beastAdminTelemetry, {
    aiUsage: {
      label: "AI Usage",
      state: "not-connected",
      value: "Not measured",
      detail:
        "No centralized provider-usage or token telemetry feed is connected to BeastAdmin. This must not be interpreted as zero usage.",
    },
    errors: {
      label: "Errors",
      state: "not-connected",
      value: "Not measured",
      detail:
        "No centralized runtime error feed is connected to BeastAdmin. Platform health cannot be confirmed from the absence of reported errors.",
    },
  });

  const connected = {
    label: "AI Usage",
    state: "connected" as const,
    value: "Connected",
    detail: "Owner-approved usage feed connected.",
  };
  const visible = buildBeastAdminExecutiveSnapshot({
    aiUsage: connected,
    errors: {
      ...connected,
      label: "Errors",
      detail: "Owner-approved error feed connected.",
    },
  });

  assert.equal(visible.platformHealth.label, "Visible");
  assert.equal(visible.platformHealth.tone, "green");
  assert.deepEqual(visible.platformHealth.observabilityGaps, []);
});

test("BA-101 elevates disabled released or beta modules to action required", () => {
  const modules = beastModuleRegistry.map((module) =>
    module.identifier === "learning"
      ? { ...module, enabled: false, status: "disabled" as const }
      : module
  );
  const snapshot = buildBeastAdminExecutiveSnapshot({ modules });

  assert.equal(snapshot.platformHealth.label, "Action required");
  assert.equal(snapshot.platformHealth.tone, "red");
  assert.equal(snapshot.platformHealth.enabledModules, 7);
  assert.deepEqual(
    snapshot.featureProgress.disabled.map((module) => module.name),
    ["BeastEducation"]
  );
});

test("BA-101 recent releases are dated, deterministic, and limited", () => {
  const identities: BeastAdminReleaseIdentity[] = [
    {
      name: "Later",
      version: "2.0.0",
      buildId: "later",
      channel: "Production",
      releaseDate: "2026-07-20",
    },
    {
      name: "Alpha",
      version: "1.0.0",
      buildId: "alpha",
      channel: "Beta",
      releaseDate: "2026-07-18",
    },
    {
      name: "Undated",
      version: "0.1.0",
      buildId: "undated",
      channel: "Development",
      releaseDate: null,
    },
    {
      name: "Beta",
      version: "1.1.0",
      buildId: "beta",
      channel: "Production",
      releaseDate: "2026-07-18",
    },
  ];

  assert.deepEqual(
    buildRecentBeastReleases({ identities, limit: 2 }).map(
      (release) => release.buildId
    ),
    ["later", "alpha"]
  );
  assert.deepEqual(buildRecentBeastReleases({ identities, limit: 0 }), []);
});

test("BA-101 executive model remains available after CEO Mode becomes the landing experience", () => {
  const page = readFileSync("src/app/dashboard/admin/page.tsx", "utf8");
  const model = readFileSync("src/lib/beastAdminExecutive.ts", "utf8");
  const shell = readFileSync(
    "src/app/dashboard/admin/BeastAdminShell.tsx",
    "utf8"
  );

  assert.match(page, /CEO Mode/);
  assert.match(page, /BeastAdminCEOModeWorkspace/);
  assert.match(model, /export function buildBeastAdminExecutiveSnapshot/);
  assert.match(model, /AI Usage/);
  assert.match(model, /Errors/);
  assert.match(shell, /canAccessBeastAdmin/);
  assert.match(shell, /setAccessState\("denied"\)/);
});
