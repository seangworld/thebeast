import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  getCourseLifecycleUpdate,
  normalizeCourseLifecycleStatus,
} from "../src/lib/learning/courseLifecycle";

const migration = readFileSync(
  "supabase/migrations/20260724000100_fix_learning_course_lifecycle_schema.sql",
  "utf8"
);
const manager = readFileSync(
  "src/app/dashboard/learning/CourseLifecycleManager.tsx",
  "utf8"
);
const card = readFileSync(
  "src/app/dashboard/learning/CourseLifecycleCard.tsx",
  "utf8"
);
const workspace = readFileSync(
  "src/app/dashboard/learning/LearningWorkspaceView.tsx",
  "utf8"
);
const databaseTypes = readFileSync("src/lib/types/database.ts", "utf8");

test("BE-214 pause resume and archive use the production lifecycle schema", () => {
  assert.equal(getCourseLifecycleUpdate("pause").lifecycle_state, "paused");
  assert.equal(getCourseLifecycleUpdate("resume").lifecycle_state, "active");
  assert.equal(getCourseLifecycleUpdate("archive").lifecycle_state, "archived");
  assert.equal(getCourseLifecycleUpdate("pause").paused_at === null, false);
  assert.equal(getCourseLifecycleUpdate("resume").paused_at, null);
  assert.equal(getCourseLifecycleUpdate("archive").archived_at === null, false);
  assert.match(migration, /add column if not exists paused_at timestamptz/);
  assert.match(migration, /add column if not exists archived_at timestamptz/);
});

test("BE-214 soft removal preserves historical learning records", () => {
  assert.match(migration, /add column if not exists removed_at timestamptz/);
  assert.match(migration, /lifecycle_state = 'removed'/);
  assert.match(migration, /status = 'Removed'/);
  assert.match(migration, /insert into public\.learning_history/);
  assert.doesNotMatch(migration, /delete from public\.learning_courses/);
  assert.doesNotMatch(
    migration,
    /delete from public\.learning_(sessions|activities|achievements|certificates|history|mastery|evidence)/
  );
});

test("BE-214 enforces explicit states and production schema-cache compatibility", () => {
  for (const state of ["active", "paused", "archived", "removed"]) {
    assert.match(migration, new RegExp(`'${state}'`));
  }
  assert.match(migration, /learning_courses_lifecycle_state_check/);
  assert.match(migration, /notify pgrst, 'reload schema'/);
  assert.match(databaseTypes, /LearningCourseLifecycleState/);
  assert.equal(normalizeCourseLifecycleStatus("Active", "paused"), "Paused");
});

test("BE-214 keeps owner and admin permissions explicit", () => {
  assert.match(migration, /user_id = actor_id or actor_is_admin/);
  assert.match(migration, /profiles\.role = 'admin'/);
  assert.match(migration, /Authentication is required/);
  assert.match(migration, /removal is not permitted/);
  assert.match(manager, /You do not have permission to update this course/);
  assert.match(manager, /\.select\("id"\)\s*\.maybeSingle\(\)/);
});

test("BE-214 updates cards immediately and clears stale errors", () => {
  assert.match(card, /setStatus\(nextStatus\)/);
  assert.match(card, /completionMessage/);
  assert.match(card, /Your active course list is now up to date/);
  assert.match(manager, /setError\(""\)/);
  assert.match(manager, /Course paused/);
  assert.match(manager, /Course resumed/);
  assert.match(manager, /role="status"/);
});

test("BE-214 excludes archived and removed courses and handles zero active courses", () => {
  assert.match(workspace, /lifecycle !== "archived" && lifecycle !== "removed"/);
  assert.match(workspace, /items\.length === 0/);
  assert.match(workspace, /LearningEmptyState/);
});
