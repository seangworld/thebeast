import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  beastAdminFeedbackStatuses,
  buildBeastAdminFeedbackCounts,
  feedbackStatusRequiresRoadmap,
  filterBeastAdminFeedbackItems,
  normalizeBeastAdminFeedbackItems,
  type BeastAdminFeedbackItem,
} from "../src/lib/beastAdminFeedback";

const feedback: BeastAdminFeedbackItem[] = [
  {
    id: "feedback-1",
    userId: "member-1",
    memberName: "Sean",
    memberEmail: "sean@example.com",
    category: "feature request",
    message: "Make the next learning step easier to find.",
    context: "BeastEducation feedback",
    status: "In Progress",
    roadmapItem: {
      id: "roadmap-1",
      title: "Guidance Counselor home",
      productId: "education",
      status: "in_progress",
    },
    ownerResponse: "We are improving the conversation-first entry point.",
    submittedAt: "2026-07-20T12:00:00.000Z",
    updatedAt: "2026-07-26T12:00:00.000Z",
    releasedAt: null,
    memberNotifiedAt: null,
  },
  {
    id: "feedback-2",
    userId: "member-2",
    memberName: "Beta Member",
    memberEmail: null,
    category: "bug",
    message: "The page jumps while I am reading.",
    context: "BeastEducation feedback",
    status: "New",
    roadmapItem: null,
    ownerResponse: "",
    submittedAt: "2026-07-25T12:00:00.000Z",
    updatedAt: "2026-07-25T12:00:00.000Z",
    releasedAt: null,
    memberNotifiedAt: null,
  },
];

test("BA-105 defines the complete feedback lifecycle and roadmap requirements", () => {
  assert.deepEqual(beastAdminFeedbackStatuses, [
    "New",
    "Acknowledged",
    "Planned",
    "In Progress",
    "Released",
    "Declined",
  ]);
  assert.equal(feedbackStatusRequiresRoadmap("New"), false);
  assert.equal(feedbackStatusRequiresRoadmap("Acknowledged"), false);
  assert.equal(feedbackStatusRequiresRoadmap("Planned"), true);
  assert.equal(feedbackStatusRequiresRoadmap("In Progress"), true);
  assert.equal(feedbackStatusRequiresRoadmap("Released"), true);
  assert.equal(feedbackStatusRequiresRoadmap("Declined"), false);
});

test("BA-105 normalizes only evidence-backed feedback and roadmap links", () => {
  const raw = feedback.map((item) => ({ ...item }));
  assert.deepEqual(normalizeBeastAdminFeedbackItems(raw), feedback);
  assert.equal(
    normalizeBeastAdminFeedbackItems([
      {
        ...raw[0],
        status: "Invented",
      },
    ]),
    null
  );
  assert.equal(
    normalizeBeastAdminFeedbackItems([
      {
        ...raw[0],
        roadmapItem: {
          ...raw[0].roadmapItem,
          productId: "invented",
        },
      },
    ]),
    null
  );
});

test("BA-105 filters the queue and reports lifecycle counts", () => {
  assert.deepEqual(
    filterBeastAdminFeedbackItems(feedback, {
      status: "In Progress",
      query: "conversation-first",
    }).map((item) => item.id),
    ["feedback-1"]
  );
  assert.deepEqual(
    filterBeastAdminFeedbackItems(feedback, {
      status: "all",
      query: "jumps",
    }).map((item) => item.id),
    ["feedback-2"]
  );
  assert.deepEqual(buildBeastAdminFeedbackCounts(feedback), {
    New: 1,
    Acknowledged: 0,
    Planned: 0,
    "In Progress": 1,
    Released: 0,
    Declined: 0,
  });
});

test("BA-105 keeps lifecycle changes owner-only and release notification atomic", () => {
  const migration = readFileSync(
    "supabase/migrations/20260726000300_add_beast_admin_beta_feedback.sql",
    "utf8"
  );

  assert.match(migration, /learning_feedback_roadmap_item_fk/);
  assert.match(migration, /beast_admin_roadmap_items/);
  assert.match(
    migration,
    /'New',[\s\S]*'Acknowledged',[\s\S]*'Planned',[\s\S]*'In Progress',[\s\S]*'Released',[\s\S]*'Declined'/
  );
  assert.match(migration, /security definer/g);
  assert.match(migration, /public\.is_profile_admin\(\)/g);
  assert.match(migration, /errcode = '42501'/g);
  assert.match(
    migration,
    /next_status in \('Planned', 'In Progress', 'Released'\)[\s\S]*selected_roadmap_item_id is null/
  );
  assert.match(migration, /beast_member_notifications/);
  assert.match(migration, /on conflict \(source_record_id\) do update/);
  assert.match(migration, /'Your feedback was implemented'/);
  assert.match(
    migration,
    /member_notified_at = coalesce\(member_notified_at, now\(\)\)/
  );
  assert.match(migration, /auth\.uid\(\) = user_id/g);
  assert.match(migration, /mark_beast_member_notification_read/);
  assert.match(
    migration,
    /notification\.user_id = auth\.uid\(\)/
  );
  assert.match(
    migration,
    /revoke update on public\.beast_member_notifications from authenticated/
  );
  assert.match(
    migration,
    /revoke all on function public\.update_beast_admin_feedback/
  );
  assert.doesNotMatch(migration, /service_role/);
});

test("BA-105 presents lifecycle management, roadmap linking, and member delivery", () => {
  const page = readFileSync(
    "src/app/dashboard/admin/feedback/page.tsx",
    "utf8"
  );
  const workspace = readFileSync(
    "src/app/dashboard/admin/feedback/BeastAdminFeedbackWorkspace.tsx",
    "utf8"
  );
  const notificationsPage = readFileSync(
    "src/app/dashboard/notifications/page.tsx",
    "utf8"
  );
  const notifications = readFileSync(
    "src/app/dashboard/notifications/FeedbackReleaseNotifications.tsx",
    "utf8"
  );
  const navigation = readFileSync("src/lib/moduleNavigation.ts", "utf8");

  assert.match(page, /Beta Feedback/);
  assert.match(page, /BeastAdminFeedbackWorkspace/);
  assert.match(workspace, /\.rpc\("get_beast_admin_beta_feedback"/);
  assert.match(workspace, /\.rpc\(\s*"update_beast_admin_feedback"/);
  assert.match(workspace, /Manage Candidate Intake/);
  assert.match(workspace, /Roadmap item/);
  assert.match(workspace, /Member update/);
  assert.match(workspace, /Saving will notify the submitting member/);
  assert.match(workspace, /No authenticated beta feedback yet/);
  assert.match(workspace, /No feedback matches these filters/);
  assert.doesNotMatch(workspace, /beastAdminFeedbackItems/);
  assert.doesNotMatch(workspace, /localStorage/);
  assert.match(notificationsPage, /FeedbackReleaseNotifications/);
  assert.match(
    notifications,
    /\.from\("beast_member_notifications"\)/
  );
  assert.match(notifications, /You Helped Improve Beast/);
  assert.match(notifications, /View release/);
  assert.match(
    notifications,
    /\.rpc\(\s*"mark_beast_member_notification_read"/
  );
  assert.match(navigation, /Beta Feedback/);
});
