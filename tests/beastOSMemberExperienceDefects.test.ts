import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("BeastOS Messages remains a member workspace and never redirects to BeastAdmin", () => {
  const memberPage = readFileSync(
    "src/app/dashboard/messages/page.tsx",
    "utf8"
  );
  const memberWorkspace = readFileSync(
    "src/app/dashboard/messages/BeastMemberAdminMessagesWorkspace.tsx",
    "utf8"
  );
  const navigation = readFileSync("src/lib/moduleNavigation.ts", "utf8");

  assert.match(
    navigation,
    /label: "Messages",[\s\S]*?href: "\/dashboard\/messages"/
  );
  assert.match(memberPage, /BeastMemberAdminMessagesWorkspace/);
  assert.match(memberWorkspace, /get_beast_member_admin_thread/);
  assert.doesNotMatch(memberWorkspace, /router\.replace\("\/dashboard\/admin\/messages"\)/);
  assert.doesNotMatch(
    `${memberPage}\n${memberWorkspace}`,
    /BeastAdminShell|get_beast_admin_message_threads|New member message|Mark resolved/
  );
});

test("member notifications omit implementation contracts without removing the inbox", () => {
  const page = readFileSync(
    "src/app/dashboard/notifications/page.tsx",
    "utf8"
  );

  assert.match(page, /buildNotificationInbox/);
  assert.match(page, /buildNotificationDigest/);
  assert.match(page, /FeedbackReleaseNotifications/);
  assert.match(page, /PrivateAdminMessageNotifications/);
  assert.doesNotMatch(page, /Notification Contracts|notificationContractRules|Action dispatch/);
});

test("Professional Activity keeps calculation metadata internal", () => {
  const page = readFileSync("src/app/dashboard/timeline/page.tsx", "utf8");
  const activity = readFileSync(
    "src/lib/platform/professionalActivity.ts",
    "utf8"
  );

  assert.match(page, /calculationVersion: String\(row\.calculation_version\)/);
  assert.doesNotMatch(activity, /label: "Calculation version"/);
  assert.doesNotMatch(page, /bm35-v1/);
});

test("Personal Hub exposes real saved workflows and makes planned areas non-interactive", () => {
  const page = readFileSync("src/app/dashboard/settings/page.tsx", "utf8");
  const profile = readFileSync(
    "src/app/dashboard/settings/profile/page.tsx",
    "utf8"
  );

  assert.match(page, /availableSections\.map/);
  assert.match(page, /href=\{section\.href\}/);
  assert.match(page, /data-personal-hub-availability="available"/);
  assert.match(profile, /\.from\("profiles"\)/);
  assert.match(profile, /\.update\(\{/);
  assert.match(profile, /preferred_name/);
  assert.match(profile, /location/);
  assert.match(profile, /timezone/);
  assert.match(profile, /id="household-context"/);

  assert.match(page, /plannedSections\.map/);
  assert.match(page, /data-personal-hub-availability="planned"/);
  assert.doesNotMatch(page, /plannedSections\.map[\s\S]*<Link/);
  assert.match(page, /Not available yet/);
  assert.doesNotMatch(
    page,
    /One shared identity|Context and specialist boundaries|Relationships and shared context|Lifecycle and shared visibility|Responsive states and support/
  );
});

test("other BeastOS member workspaces omit developer contract panels", () => {
  const calendar = readFileSync(
    "src/app/dashboard/calendar/page.tsx",
    "utf8"
  );
  const today = readFileSync("src/app/dashboard/today/page.tsx", "utf8");

  assert.doesNotMatch(calendar, /Calendar Contracts|calendarContractRules|dispatchMode/);
  assert.match(calendar, /Recurring events and reminders/);
  assert.doesNotMatch(
    today,
    /Cross-module contribution contract|todayContributionContractRules/
  );
  assert.match(today, /How Today chose your next step/);
});
