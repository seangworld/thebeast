import test from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { guidanceCounselorContextQueries } from "../src/lib/digitalStaffRuntime/educationContext";
import { authoritativeProfessionalPrompt } from "../src/lib/digitalStaffRuntime/professionalPrompts";

test("counselor context queries are owner-scoped, bounded, and exclude retired/unapproved facts", async () => {
  const urls: URL[] = [];
  const client = createClient("https://education-test.invalid", "test-only-key", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async (input) => {
      urls.push(new URL(String(input)));
      return Response.json([]);
    } },
  });
  const results = await Promise.all(guidanceCounselorContextQueries(client, "member-a"));
  assert.ok(results.every(result => !result.error));
  assert.equal(urls.length, 2);
  for (const url of urls) assert.equal(url.searchParams.get("owner_id"), "eq.member-a");
  const profile = urls.find(url => url.pathname.endsWith("/education_profiles"))!;
  const career = urls.find(url => url.pathname.endsWith("/education_career_profile_items"))!;
  assert.equal(profile.searchParams.get("limit"), "1");
  assert.match(profile.searchParams.get("select")!, /discovery_answers/);
  assert.equal(career.searchParams.get("archived_at"), "is.null");
  assert.equal(career.searchParams.get("verification_status"), "in.(verified,member_reported)");
  assert.equal(career.searchParams.get("limit"), "19");
  for (const field of ["phase", "occurred_on", "source_type", "source_reference"]) {
    assert.ok(career.searchParams.get("select")!.split(",").includes(field));
  }
});

test("context loading preserves query failures instead of inventing an empty successful profile", async () => {
  const client = createClient("https://education-test.invalid", "test-only-key", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async () => Response.json({ message: "Invalid query" }, { status: 400 }) },
  });
  const results = await Promise.all(guidanceCounselorContextQueries(client, "member-a"));
  assert.ok(results.every(result => result.error));
});

test("counselor instructions preserve practical planning, source grounding and approval boundaries", () => {
  const prompt = authoritativeProfessionalPrompt("beasteducation.guidance-counselor");
  for (const rule of ["Zero available hours", "not an earned credential", "Respect declined paths", "relevant official source", "Never invent degrees", "Do not submit applications", "existing approval path", "no more than three"]) {
    assert.ok(prompt.includes(rule), rule);
  }
  assert.ok(!authoritativeProfessionalPrompt("beastmoney.money-coach").includes("discovery_answers"));
});
