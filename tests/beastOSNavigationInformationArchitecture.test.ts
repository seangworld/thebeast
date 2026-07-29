import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import {
  beastSecurityNavigation,
  buildApplicationNavigationForPersona,
  primaryNavigation,
  secondaryNavigation,
  sharedNavigation,
} from "../src/lib/moduleNavigation";

test("BP-001 organizes member navigation around daily and personal needs", () => {
  assert.deepEqual(
    primaryNavigation.map(({ group, label, href }) => ({
      group,
      label,
      href,
    })),
    [
      {
        group: "Daily",
        label: "Dashboard",
        href: "/dashboard/today",
      },
      {
        group: "Daily",
        label: "Calendar",
        href: "/dashboard/calendar",
      },
      {
        group: "Daily",
        label: "Notifications",
        href: "/dashboard/notifications",
      },
      {
        group: "Daily",
        label: "Messages",
        href: "/dashboard/messages",
      },
      {
        group: "Daily",
        label: "Timeline",
        href: "/dashboard/timeline",
      },
      {
        group: "Personal",
        label: "Personal Hub",
        href: "/dashboard/settings",
      },
      {
        group: "Personal",
        label: "Search",
        href: "/dashboard/search",
      },
    ]
  );
});

test("BP-001 keeps life modules permission-aware and in the approved order", () => {
  assert.deepEqual(
    buildApplicationNavigationForPersona({ isOwner: true }).map(
      (item) => item.label
    ),
    ["BeastMoney", "BeastEducation", "BeastHealth", "BeastHome"]
  );
  assert.deepEqual(
    buildApplicationNavigationForPersona({ isOwner: false }).map(
      (item) => item.label
    ),
    ["BeastMoney", "BeastEducation"]
  );
  assert.deepEqual(beastSecurityNavigation, {
    label: "BeastSecurity",
    module: "projects",
    comingSoon: true,
  });
  assert.equal(beastSecurityNavigation.href, undefined);
});

test("BP-001 exposes Documents and Goals as shared BeastOS services", () => {
  assert.deepEqual(
    sharedNavigation.map(({ label, href }) => [label, href]),
    [
      ["Documents", "/dashboard/uploads"],
      ["Goals", "/dashboard/goals"],
    ]
  );
});

test("BP-001 keeps member and admin Messages routes distinct", () => {
  const memberPage = readFileSync(
    "src/app/dashboard/messages/page.tsx",
    "utf8"
  );
  const adminPage = readFileSync(
    "src/app/dashboard/admin/messages/page.tsx",
    "utf8"
  );

  assert.equal(
    primaryNavigation.find((item) => item.label === "Messages")?.href,
    "/dashboard/messages"
  );
  assert.match(memberPage, /BeastMemberAdminMessagesWorkspace/);
  assert.match(adminPage, /BeastAdminMemberMessagesWorkspace/);
  assert.doesNotMatch(memberPage, /BeastAdminMemberMessagesWorkspace/);
  assert.doesNotMatch(adminPage, /BeastMemberAdminMessagesWorkspace/);
});

test("BP-001 relocates Digital Staff without removing its functionality", () => {
  assert.equal(
    primaryNavigation.some((item) => item.label === "Digital Staff"),
    false
  );
  assert.deepEqual(
    secondaryNavigation.map(({ label, href }) => [label, href]),
    [
      ["Relationship Center", "/dashboard/relationships"],
      ["Digital Staff", "/dashboard/digital-staff"],
    ]
  );
  assert.equal(existsSync("src/app/dashboard/digital-staff/page.tsx"), true);
  assert.equal(
    existsSync("src/app/dashboard/digital-staff/[professionalId]/page.tsx"),
    true
  );
});

test("BP-001 labels the desktop and responsive navigation hierarchy", () => {
  const layout = readFileSync("src/app/dashboard/layout.tsx", "utf8");

  assert.match(layout, /aria-label="Life modules"/);
  assert.match(layout, />\s*Life modules\s*</);
  assert.match(layout, /aria-label="Shared platform"/);
  assert.match(layout, />\s*Shared platform\s*</);
  assert.match(layout, /aria-label="Relationships and about"/);
  assert.match(layout, /Relationships &amp; about/);
  assert.match(layout, /lifeModuleNavigation\.map/);
  assert.match(layout, /sharedNavigation\.map/);
  assert.match(layout, /secondaryNavigation\.map/);
  assert.match(layout, /controlIdPrefix="mobile"/);
});
