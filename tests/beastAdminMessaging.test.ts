import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  beastAdminMessageCategories,
  filterBeastAdminMessageThreads,
  getBeastAdminMessageThreadStateLabel,
  normalizeBeastAdminMessageBody,
  normalizeBeastAdminMessageInboxSnapshot,
  normalizeBeastAdminPrivateThread,
  type BeastAdminMessageInboxFilters,
  type BeastAdminPrivateThread,
} from "../src/lib/beastAdminMessaging";

function thread(
  overrides: Partial<BeastAdminPrivateThread> & { id: string }
): BeastAdminPrivateThread {
  const { id, ...values } = overrides;
  return {
    id,
    memberId: `member-${id}`,
    memberName: `Member ${id}`,
    memberEmail: `${id}@example.com`,
    assignedAdminId: "admin-1",
    category: "support",
    status: "open",
    memberArchived: false,
    adminArchived: false,
    linkedObjectType: null,
    linkedObjectId: null,
    createdAt: "2026-07-01T12:00:00.000Z",
    updatedAt: "2026-07-25T12:00:00.000Z",
    lastMessageAt: "2026-07-25T12:00:00.000Z",
    resolvedAt: null,
    unreadCount: 0,
    messageCount: 0,
    messages: [],
    ...values,
  };
}

const defaultFilters: BeastAdminMessageInboxFilters = {
  query: "",
  unread: "all",
  category: "all",
  status: "all",
  dateFrom: "",
  dateTo: "",
};

test("BA-129 accepts safe plain text and rejects executable message input", () => {
  assert.equal(
    normalizeBeastAdminMessageBody("  Please help with my account.  "),
    "Please help with my account."
  );
  assert.equal(normalizeBeastAdminMessageBody(""), null);
  assert.equal(normalizeBeastAdminMessageBody("x".repeat(5001)), null);
  assert.equal(
    normalizeBeastAdminMessageBody("<script>alert(1)</script>"),
    null
  );
  assert.equal(
    normalizeBeastAdminMessageBody("javascript:alert(1)"),
    null
  );
  assert.equal(
    normalizeBeastAdminMessageBody("<b>Plain text remains escaped</b>"),
    "<b>Plain text remains escaped</b>"
  );
});

test("BA-129 normalizes durable private threads without inventing edits", () => {
  const value = thread({
    id: "one",
    messages: [
      {
        id: "message-1",
        senderUserId: "member-one",
        senderRole: "member",
        recipientUserId: "admin-1",
        body: "I need account help.",
        createdAt: "2026-07-25T12:00:00.000Z",
        readAt: null,
        edited: false,
      },
    ],
    unreadCount: 1,
    messageCount: 1,
  });
  assert.deepEqual(normalizeBeastAdminPrivateThread(value), value);
  assert.equal(
    normalizeBeastAdminPrivateThread({
      ...value,
      messages: [{ ...value.messages[0], edited: true }],
    }),
    null
  );
  assert.equal(
    normalizeBeastAdminMessageInboxSnapshot({
      threads: [value],
      threadCount: 1,
    })?.threads[0].messages.length,
    1
  );
  assert.equal(
    normalizeBeastAdminMessageInboxSnapshot({
      threads: [value],
      threadCount: 2,
    }),
    null
  );
});

test("BA-129 filters the admin inbox by member unread category status and date", () => {
  const threads = [
    thread({
      id: "sean",
      memberName: "Sean Gatewood",
      memberEmail: "sean@example.com",
      category: "account",
      unreadCount: 2,
      lastMessageAt: "2026-07-25T12:00:00.000Z",
    }),
    thread({
      id: "alex",
      memberName: "Alex Member",
      category: "problem",
      status: "resolved",
      resolvedAt: "2026-06-10T12:00:00.000Z",
      lastMessageAt: "2026-06-10T12:00:00.000Z",
    }),
    thread({
      id: "archived",
      memberName: "Archived Member",
      adminArchived: true,
      lastMessageAt: "2026-05-01T12:00:00.000Z",
    }),
  ];

  assert.deepEqual(
    filterBeastAdminMessageThreads(threads, {
      ...defaultFilters,
      query: "sean@",
      unread: "unread",
      category: "account",
      status: "open",
      dateFrom: "2026-07-01",
      dateTo: "2026-07-31",
    }).map((item) => item.id),
    ["sean"]
  );
  assert.deepEqual(
    filterBeastAdminMessageThreads(threads, {
      ...defaultFilters,
      status: "resolved",
    }).map((item) => item.id),
    ["alex"]
  );
  assert.deepEqual(
    filterBeastAdminMessageThreads(threads, {
      ...defaultFilters,
      status: "archived",
    }).map((item) => item.id),
    ["archived"]
  );
  assert.equal(
    getBeastAdminMessageThreadStateLabel(threads[2], "admin"),
    "Archived"
  );
  assert.equal(
    getBeastAdminMessageThreadStateLabel(threads[1], "member"),
    "Resolved"
  );
});

test("BA-129 migration creates one durable owner/member thread and immutable messages", () => {
  const migration = readFileSync(
    "supabase/migrations/20260726001700_add_beast_admin_private_messaging.sql",
    "utf8"
  );

  for (const table of [
    "beast_admin_message_threads",
    "beast_admin_messages",
    "beast_admin_message_notifications",
  ]) {
    assert.match(
      migration,
      new RegExp(`create table if not exists public\\.${table}`)
    );
    assert.match(
      migration,
      new RegExp(`alter table public\\.${table} enable row level security`)
    );
  }
  assert.match(migration, /member_id uuid not null unique/);
  assert.match(migration, /references auth\.users\(id\) on delete restrict/g);
  assert.match(migration, /sender_role in \('admin', 'member'\)/);
  assert.match(migration, /sender_user_id <> recipient_user_id/);
  assert.doesNotMatch(migration, /edited_at|edited_by/);
  assert.match(migration, /message history cannot be deleted/i);
  assert.match(migration, /immutable except for first read/i);
  assert.doesNotMatch(migration, /on delete cascade/);
});

test("BA-129 RLS isolates members and denies direct message mutation", () => {
  const migration = readFileSync(
    "supabase/migrations/20260726001700_add_beast_admin_private_messaging.sql",
    "utf8"
  );

  assert.match(
    migration,
    /thread\.member_id = auth\.uid\(\)[\s\S]*or public\.is_profile_admin\(\)/
  );
  assert.match(
    migration,
    /auth\.uid\(\) = member_id[\s\S]*or public\.is_profile_admin\(\)/
  );
  assert.match(
    migration,
    /Member messages may only be sent to Beast Administration/
  );
  assert.match(
    migration,
    /Administrative messages require authorized routing/
  );
  assert.match(
    migration,
    /revoke all on table public\.beast_admin_messages from authenticated/
  );
  assert.match(
    migration,
    /grant select on table public\.beast_admin_messages to authenticated/
  );
  assert.doesNotMatch(
    migration,
    /grant (insert|update|delete)[^;]*beast_admin_messages/
  );
  assert.doesNotMatch(migration, /group_id|channel_id|household_id/);
});

test("BA-129 forward hardening rejects admin system and demo thread targets", () => {
  const hardening = readFileSync(
    "supabase/migrations/20260726001800_harden_beast_admin_private_messaging.sql",
    "utf8"
  );
  assert.match(hardening, /member_profile\.role <> 'admin'/);
  assert.match(hardening, /member_profile\.account_kind = 'member'/);
  assert.match(hardening, /admin_profile\.role = 'admin'/);
  assert.match(hardening, /member_auth\.deleted_at is null/);
  assert.match(
    hardening,
    /before insert or update of member_id, assigned_admin_id/
  );
});

test("BA-129 enforces suspension rate limits notifications and metadata-only audit", () => {
  const migration = readFileSync(
    "supabase/migrations/20260726001700_add_beast_admin_private_messaging.sql",
    "utf8"
  );

  assert.match(
    migration,
    /Suspended accounts cannot send private messages/
  );
  assert.match(migration, /created_at >= now\(\) - interval '1 minute'/);
  assert.match(migration, /\) >= 10 then/);
  assert.match(migration, /Message rate limit reached/);
  assert.match(
    migration,
    /insert into public\.beast_admin_message_notifications/
  );
  assert.match(migration, /Message from Beast Administration/);
  assert.match(migration, /Member support message/);
  assert.match(migration, /admin_account_message_sent/);
  assert.match(
    migration,
    /Private account message sent; body excluded from audit/
  );
  const auditInsert = migration.slice(
    migration.indexOf(
      "insert into public.beast_admin_member_account_audit_events",
      migration.indexOf("if actor_is_admin and selected_category")
    ),
    migration.indexOf(
      "return public.build_beast_admin_message_thread",
      migration.indexOf("if actor_is_admin and selected_category")
    )
  );
  assert.doesNotMatch(auditInsert, /normalized_body|selected_body|'body'/);
  assert.doesNotMatch(
    migration,
    /agent_conversations|agent_memory|professional_journal|shared_understanding/
  );
});

test("BA-129 validates administrative links against their persisted owner sources", () => {
  const migration = readFileSync(
    "supabase/migrations/20260726001700_add_beast_admin_private_messaging.sql",
    "utf8"
  );
  assert.match(migration, /public\.learning_feedback feedback/);
  assert.match(
    migration,
    /feedback\.user_id = target_member_id/
  );
  assert.match(
    migration,
    /public\.beast_admin_member_account_audit_events audit_event/
  );
  assert.match(
    migration,
    /audit_event\.member_id = target_member_id/
  );
  assert.match(migration, /public\.beast_admin_roadmap_items roadmap/);
  assert.match(migration, /roadmap\.user_id = actor_id/);
  assert.match(migration, /selected_action = 'unlink'/);
});

test("BA-129 provides member and admin workspaces without calling them AI chat", () => {
  const memberPage = readFileSync(
    "src/app/dashboard/messages/page.tsx",
    "utf8"
  );
  const memberWorkspace = readFileSync(
    "src/app/dashboard/messages/BeastMemberAdminMessagesWorkspace.tsx",
    "utf8"
  );
  const threadView = readFileSync(
    "src/app/dashboard/messages/BeastAdminPrivateMessageThread.tsx",
    "utf8"
  );
  const adminPage = readFileSync(
    "src/app/dashboard/admin/messages/page.tsx",
    "utf8"
  );
  const adminWorkspace = readFileSync(
    "src/app/dashboard/admin/messages/BeastAdminMemberMessagesWorkspace.tsx",
    "utf8"
  );
  const messagingModel = readFileSync(
    "src/lib/beastAdminMessaging.ts",
    "utf8"
  );

  assert.match(memberPage, />Messages</);
  assert.match(memberPage, /Private account and support communication/);
  assert.match(memberWorkspace, /get_beast_member_admin_thread/);
  assert.match(memberWorkspace, /Send reply/);
  assert.match(memberWorkspace, /Archive/);
  assert.match(memberWorkspace, /Report a problem/);
  assert.match(adminPage, /BeastAdminShell/);
  assert.match(adminWorkspace, /get_beast_admin_message_threads/);
  assert.match(adminWorkspace, /New member message/);
  assert.match(
    adminWorkspace,
    /const targetMemberId = composeOpen[\s\S]*\? selectedMemberId[\s\S]*: selectedThread\?\.memberId/
  );
  assert.match(adminWorkspace, /setSelectedThreadId\(""\)/);
  assert.match(adminWorkspace, /setSelectedThread\(null\)/);
  for (const label of [
    "Unread",
    "Member",
    "Category",
    "Status",
    "From date",
    "Through date",
    "Mark resolved",
    "Reopen",
    "Archive",
  ]) {
    assert.match(adminWorkspace, new RegExp(label));
  }
  for (const label of [
    "Beta feedback",
    "Account audit action",
    "Roadmap work",
  ]) {
    assert.match(messagingModel, new RegExp(label));
  }
  assert.match(threadView, /whitespace-pre-wrap/);
  assert.doesNotMatch(
    `${memberWorkspace}\n${adminWorkspace}\n${threadView}`,
    /dangerouslySetInnerHTML/
  );
  assert.doesNotMatch(
    `${memberPage}\n${adminPage}`,
    /\bAI chat\b/
  );
});

test("BA-129 creates notifications and unread navigation across desktop and mobile", () => {
  const notification = readFileSync(
    "src/app/dashboard/notifications/PrivateAdminMessageNotifications.tsx",
    "utf8"
  );
  const notificationPage = readFileSync(
    "src/app/dashboard/notifications/page.tsx",
    "utf8"
  );
  const navigation = readFileSync("src/lib/moduleNavigation.ts", "utf8");
  const layout = readFileSync("src/app/dashboard/layout.tsx", "utf8");
  const mobile = readFileSync("src/lib/mobileFoundation.ts", "utf8");

  assert.match(
    notification,
    /\.from\("beast_admin_message_notifications"\)/
  );
  assert.match(notification, /Message bodies are opened only/);
  assert.match(notificationPage, /PrivateAdminMessageNotifications/);
  assert.match(navigation, /Messages.*\/dashboard\/messages/);
  assert.match(
    navigation,
    /Member Messages[\s\S]*?\/dashboard\/admin\/messages/
  );
  assert.match(layout, /get_beast_admin_message_unread_count/);
  assert.match(layout, /BEAST_ADMIN_MESSAGE_UNREAD_EVENT/);
  assert.match(layout, /unread private messages/);
  assert.match(mobile, /\/dashboard\/messages/);
});

test("BA-129 uses responsive bounded layouts and links member management to the real thread", () => {
  const adminWorkspace = readFileSync(
    "src/app/dashboard/admin/messages/BeastAdminMemberMessagesWorkspace.tsx",
    "utf8"
  );
  const memberWorkspace = readFileSync(
    "src/app/dashboard/messages/BeastMemberAdminMessagesWorkspace.tsx",
    "utf8"
  );
  const memberManagement = readFileSync(
    "src/app/dashboard/admin/members/BeastAdminMemberManagementWorkspace.tsx",
    "utf8"
  );

  assert.match(adminWorkspace, /min-w-0/);
  assert.match(adminWorkspace, /xl:grid-cols-\[/);
  assert.match(adminWorkspace, /max-h-\[42rem\] gap-2 overflow-y-auto/);
  assert.match(memberWorkspace, /min-w-0/);
  assert.match(memberWorkspace, /w-full min-w-0/);
  assert.match(
    memberManagement,
    /\/dashboard\/admin\/messages\?member=/
  );
  assert.doesNotMatch(
    `${adminWorkspace}\n${memberWorkspace}`,
    /overflow-x-hidden/
  );
});

test("BA-129 exposes every approved category and no public or professional delivery mode", () => {
  assert.deepEqual([...beastAdminMessageCategories], [
    "account",
    "support",
    "problem",
    "feedback",
    "access",
    "other",
  ]);
  const migration = readFileSync(
    "supabase/migrations/20260726001700_add_beast_admin_private_messaging.sql",
    "utf8"
  );
  assert.doesNotMatch(
    migration,
    /professional_id|specialist_id|public_channel|group_recipient/
  );
});
