import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  canRemoveCourse,
  getCourseLifecycleActions,
  normalizeCourseLifecycleStatus,
} from "../src/lib/learning/courseLifecycle";

const workspace = readFileSync(
  "src/app/dashboard/learning/LearningWorkspaceView.tsx",
  "utf8"
);
const manager = readFileSync(
  "src/app/dashboard/learning/CourseLifecycleManager.tsx",
  "utf8"
);
const migration = readFileSync(
  "supabase/migrations/20260724000000_add_learning_course_lifecycle.sql",
  "utf8"
);

test("BE-209 exposes contextual resume pause archive and remove actions", () => {
  assert.deepEqual(getCourseLifecycleActions("Active"), [
    "resume",
    "pause",
    "archive",
    "remove",
  ]);
  assert.deepEqual(getCourseLifecycleActions("Paused"), [
    "resume",
    "archive",
    "remove",
  ]);
  assert.deepEqual(getCourseLifecycleActions("Archived"), ["resume", "remove"]);
  assert.equal(normalizeCourseLifecycleStatus("planned"), "Active");
  assert.match(workspace, /CourseLifecycleManager/);
});

test("BE-209 lets course owners and admins remove courses", () => {
  assert.equal(
    canRemoveCourse({ actorId: "member-1", courseOwnerId: "member-1" }),
    true
  );
  assert.equal(
    canRemoveCourse({
      actorId: "admin-1",
      courseOwnerId: "member-1",
      actorRole: "admin",
    }),
    true
  );
  assert.equal(
    canRemoveCourse({ actorId: "member-2", courseOwnerId: "member-1" }),
    false
  );
  assert.match(migration, /Admins manage all learning courses/);
  assert.match(migration, /security definer/);
  assert.match(migration, /user_id = actor_id or actor_is_admin/);
});

test("BE-209 confirms removal and states its historical impact", () => {
  assert.match(manager, /role="alertdialog"/);
  assert.match(manager, /Confirm removal/);
  assert.match(manager, /This action cannot be undone/);
  assert.match(manager, /achievements,\s+certificates, completed history/);
});

test("BE-209 removal preserves earned and completed historical records", () => {
  assert.match(migration, /on delete set null/);
  assert.match(migration, /insert into public\.learning_history/);
  assert.match(migration, /course_removed/);
  assert.match(migration, /update public\.learning_activities[\s\S]*set course_id = null/);
  assert.doesNotMatch(migration, /delete from public\.learning_(achievements|certificates|history)/);
});
