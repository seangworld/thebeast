import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  getPersonalHubReference,
  personalHubCanonicalRoute,
  personalHubModuleReferences,
  personalHubOwnershipRules,
  personalHubSections,
  personalInformationCanonicalRoute,
} from "../src/lib/platform/personalHub";

test("BO-311 gives BeastOS one complete Personal Hub information architecture", () => {
  assert.equal(personalHubCanonicalRoute, "/dashboard/settings");
  assert.equal(
    personalInformationCanonicalRoute,
    "/dashboard/settings/profile"
  );
  assert.deepEqual(
    personalHubSections.map((section) => section.label),
    [
      "Personal Information",
      "Household",
      "Family",
      "Emergency Contacts",
      "Notification Preferences",
      "Privacy",
      "Connected Modules",
      "AI Preferences",
      "Communication Preferences",
      "Future Memory Settings",
      "Theme & Display",
    ]
  );
  assert.equal(
    new Set(personalHubSections.map((section) => section.id)).size,
    personalHubSections.length
  );
});

test("BO-311 separates shared identity ownership from module domain records", () => {
  assert.match(personalHubOwnershipRules[0], /BeastOS is the single owner/);
  assert.match(personalHubOwnershipRules[1], /instead of creating duplicate/);
  assert.deepEqual(
    personalHubModuleReferences.map((reference) => reference.module),
    ["money", "learning", "health", "home", "goals", "documents"]
  );
  assert.ok(getPersonalHubReference("money")?.owns.includes("debts"));
  assert.ok(getPersonalHubReference("learning")?.owns.includes("lessons"));
  assert.ok(getPersonalHubReference("health")?.owns.includes("health history"));
});

test("BO-311 has one canonical editable shared profile and a compatibility redirect", () => {
  const personalInformation = readFileSync(
    "src/app/dashboard/settings/profile/page.tsx",
    "utf8"
  );
  const legacyProfile = readFileSync(
    "src/app/dashboard/profile/page.tsx",
    "utf8"
  );
  const settings = readFileSync(
    "src/app/dashboard/settings/page.tsx",
    "utf8"
  );

  assert.match(personalInformation, /\.from\("profiles"\)/);
  assert.match(personalInformation, /\.update\(\{/);
  assert.match(personalInformation, /Personal Information/);
  assert.match(personalInformation, /id="household-context"/);
  assert.match(legacyProfile, /redirect\(personalInformationCanonicalRoute\)/);
  assert.doesNotMatch(legacyProfile, /\.from\("profiles"\)/);
  assert.match(settings, /availableSections\.map/);
  assert.match(settings, /plannedSections\.map/);
});

test("BO-311 modules reference BeastOS identity without owning shared profile writes", () => {
  const money = readFileSync(
    "src/app/dashboard/money/components/MoneyWorkspacePage.tsx",
    "utf8"
  );
  const education = readFileSync(
    "src/app/dashboard/learning/BeastEducationExperience.tsx",
    "utf8"
  );
  const moduleSources = [
    money,
    education,
    readFileSync("src/app/dashboard/health/BeastHealthShell.tsx", "utf8"),
    readFileSync("src/app/dashboard/home/BeastHomeShell.tsx", "utf8"),
  ].join("\n");

  assert.match(money, /getProfileDisplayName/);
  assert.match(education, /getProfileDisplayName/);
  assert.match(moduleSources, /\.from\("profiles"\)/);
  assert.doesNotMatch(moduleSources, /\.from\("profiles"\)[\s\S]{0,120}\.update/);
});

test("BO-311 keeps Health Profile distinct from BeastOS shared identity", () => {
  const navigation = readFileSync("src/lib/moduleNavigation.ts", "utf8");
  const healthShell = readFileSync(
    "src/app/dashboard/health/BeastHealthShell.tsx",
    "utf8"
  );
  const healthPages = readFileSync(
    "src/app/dashboard/health/pages.ts",
    "utf8"
  );

  assert.match(navigation, /Health Profile/);
  assert.match(healthShell, /Health Profile/);
  assert.match(healthPages, /Build your health story/);
  assert.match(
    readFileSync("src/lib/health/foundation.ts", "utf8"),
    /Shared identity remains in BeastOS Personal Hub/
  );
});
