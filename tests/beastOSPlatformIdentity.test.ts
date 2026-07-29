import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  beastOSApplications,
  beastOSPlatformIdentity,
  beastOSPlatformIdentityRules,
  beastOSSharedCapabilities,
  getBeastOSWorkspaceContext,
} from "../src/lib/platform/identity";

test("BO-313 defines BeastOS as the platform and life areas as applications", () => {
  assert.equal(beastOSPlatformIdentity.name, "BeastOS");
  assert.match(beastOSPlatformIdentity.role, /operating system/);
  assert.deepEqual(
    beastOSApplications.map((application) => application.name),
    [
      "Money",
      "Education",
      "Health",
      "Goals",
      "Documents",
      "Home",
      "Security",
    ]
  );
  assert.equal(
    beastOSApplications.find((application) => application.name === "Goals")
      ?.owner,
    "beastos"
  );
  assert.equal(
    beastOSApplications.find(
      (application) => application.name === "Documents"
    )?.owner,
    "beastos"
  );
  assert.equal(
    beastOSApplications.find((application) => application.name === "Security")
      ?.href,
    "/dashboard/home/security"
  );
});

test("BO-313 identifies the complete shared BeastOS foundation", () => {
  assert.deepEqual(beastOSSharedCapabilities, [
    "Authentication",
    "Identity",
    "Family",
    "Permissions",
    "Memory",
    "Search",
    "Timeline",
    "Notifications",
    "Professional collaboration",
  ]);
  assert.match(beastOSPlatformIdentityRules[0], /never presented as a peer/);
  assert.match(beastOSPlatformIdentityRules[1], /running on BeastOS/);
  assert.match(beastOSPlatformIdentityRules[2], /shared BeastOS capabilities/);
  assert.match(beastOSPlatformIdentityRules[3], /domain records/);
});

test("BO-313 keeps the shared shell branded as BeastOS inside every application", () => {
  const shell = readFileSync("src/app/dashboard/layout.tsx", "utf8");

  assert.match(shell, /getBeastOSWorkspaceContext\(workspaceModule\)/);
  assert.match(shell, /<BeastBrandMark[\s\S]*module="beastos"/);
  assert.doesNotMatch(shell, /<BeastBrandMark[\s\S]{0,100}module=\{workspaceModule\}/);
  assert.match(shell, /aria-label="BeastOS platform"/);
  assert.match(shell, /Shared identity and services/);
  assert.match(shell, /aria-label="Life modules"/);
  assert.match(shell, /Apps for the parts of life you manage/);
  assert.match(shell, /aria-label="Shared platform"/);
  assert.equal(getBeastOSWorkspaceContext("beastos"), "The Beast platform");
  assert.equal(getBeastOSWorkspaceContext("money"), "Money application");
  assert.equal(
    getBeastOSWorkspaceContext("learning"),
    "Education application"
  );
  assert.equal(
    getBeastOSWorkspaceContext("notifications"),
    "Shared platform service"
  );
});

test("BO-313 makes authentication and onboarding explain platform ownership", () => {
  const login = readFileSync("src/app/login/page.tsx", "utf8");
  const onboarding = readFileSync(
    "src/app/dashboard/onboarding/page.tsx",
    "utf8"
  );

  assert.match(login, />\s*BeastOS\s*</);
  assert.match(login, /beastOSPlatformIdentity\.role/);
  assert.match(login, /beastOSApplications\.map/);
  assert.match(login, /beastOSSharedCapabilities\.join/);
  assert.match(login, /signInWithOtp/);
  assert.match(login, /shouldCreateUser: intent === "create-account"/);
  assert.doesNotMatch(login, /select.*module|choose.*module/i);

  assert.match(onboarding, /Welcome to BeastOS/);
  assert.match(onboarding, /Education as your first application/);
  assert.match(onboarding, /Shared identity, permissions, and memory remain platform services/);
  assert.match(onboarding, /completeOnboarding/);
  assert.match(onboarding, /buildOnboardingCompletionProfileUpdate/);
});

test("BO-313 aligns shared page titles and metadata without changing behavior", () => {
  const rootLayout = readFileSync("src/app/layout.tsx", "utf8");
  const home = readFileSync("src/app/page.tsx", "utf8");
  const homeRedirect = readFileSync("src/app/HomeRedirect.tsx", "utf8");
  const today = readFileSync("src/app/dashboard/today/page.tsx", "utf8");
  const calendar = readFileSync(
    "src/app/dashboard/calendar/page.tsx",
    "utf8"
  );
  const notifications = readFileSync(
    "src/app/dashboard/notifications/page.tsx",
    "utf8"
  );

  assert.match(rootLayout, /BeastOS \| The Beast Platform/);
  assert.match(rootLayout, /operating system connecting identity/);
  assert.match(home, /<HomeRedirect \/>/);
  assert.match(homeRedirect, /Loading BeastOS/);
  assert.match(today, /BeastOS Command Center/);
  assert.match(today, /connected applications/);
  assert.match(calendar, /eyebrow="BeastOS Shared Service"/);
  assert.match(notifications, /eyebrow="BeastOS Shared Service"/);
  assert.match(notifications, /every Beast application/);
});
