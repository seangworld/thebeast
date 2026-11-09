import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { NextResponse } from "next/server";
import { PGlite } from "@electric-sql/pglite";
import * as mail from "../src/lib/beastAdminMemberCommunications";

const alice = "11111111-1111-4111-8111-111111111111";
const bob = "22222222-2222-4222-8222-222222222222";
const actor = "33333333-3333-4333-8333-333333333333";
const member = (id: string, email: string) => ({
  id, email, username: null, emailVerificationStatus: "verified",
  accountKind: "member", accountStatus: "active",
} as const);
const members = [member(alice, "alice@example.test"), member(bob, "bob@example.test")];
const unverified = "44444444-4444-4444-8444-444444444444";
const draft = { category: "account_setup", subject: "Set up your username", body: "Sign in and choose your username." };

function fixture(env = "preview", role = "admin", reserve = true) {
  const sent: { to: string; from: string; replyTo: string }[] = [];
  const audit: unknown[] = [];
  const verification: unknown[] = [];
  let signedIn = true;
  const exports: { POST?: (request: Request) => Promise<NextResponse> } = {};
  const code = ts.transpileModule(readFileSync("src/app/api/admin/members/communications/route.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const client = {
    auth: { getUser: async () => ({ data: { user: signedIn ? { id: actor } : null } }) },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { role } }) }) }) }),
    rpc: async (name: string) => ({ data: name === "is_current_beast_session_allowed" ? true : [...members, { ...member(unverified, "unverified@example.test"), emailVerificationStatus: "unverified" }] }),
  };
  vm.runInNewContext(code, { exports, Buffer, URL, process: { env: {
    VERCEL_ENV: env, BEAST_AUTH_RATE_SECRET: "x".repeat(64), BEAST_ADMIN_MEMBER_EMAIL_ENABLED: "true",
    NEXT_PUBLIC_SUPABASE_URL: "https://grpyzwvgqiwtxadfdtni.supabase.co",
  } }, require: (name: string) => {
    if (name === "next/server") return { NextResponse };
    if (name === "nodemailer") return { createTransport: () => ({ sendMail: async (message: typeof sent[number]) => {
      sent.push(message);
      if (message.to === "bob@example.test") throw Error("unknown SMTP result");
      return { accepted: [message.to], rejected: [] };
    } }) };
    if (name.endsWith("/supabase/server")) return { createAsyncRouteClient: async () => client };
    if (name.endsWith("/supabase/admin")) return { createAdminClient: () => ({
      rpc: async () => ({ data: reserve }),
      auth: { resend: async (payload: unknown) => { verification.push(payload); return { error: null }; } },
      from: () => ({ update: (payload: unknown) => {
        audit.push(JSON.parse(JSON.stringify(payload)));
        return { eq: () => ({ select: () => ({ single: async () => ({ data: { id: actor } }) }) }) };
      } }),
    }) };
    if (name.endsWith("MemberTimeline")) return {
      normalizeBeastAdminMemberDirectory: (data: unknown) => data,
      normalizeBeastAdminMemberEmailStatuses: (data: unknown) => data,
      mergeBeastAdminMemberEmailStatuses: (data: unknown) => data,
    };
    if (name.endsWith("/emailWorkflows")) return { buildEmailVerificationCallbackUrl: () => "https://beast.test/auth/callback" };
    if (name.endsWith("MemberCommunications")) return mail;
    if (name.endsWith("/delivery")) return { smtpOptions: () => ({}) };
    return require(name);
  } });
  const post = (payload: object, origin = "https://beast.test") => exports.POST!(new Request(
    "https://beast.test/api/admin/members/communications",
    { method: "POST", headers: { origin }, body: JSON.stringify(payload) },
  ));
  return { post, sent, audit, verification, signOut: () => { signedIn = false; } };
}

test("only verified active setup-required members are resolved once", () => {
  const rows = [...members, { ...member(actor, "ALICE@example.test") }];
  assert.deepEqual(mail.resolveSetupRecipients(rows as never, [alice, bob, actor]).map(x => x.id), [alice, bob]);
  assert.deepEqual(mail.resolveSetupRecipients([{ ...members[0], username: "chosen" }, {
    ...members[1], emailVerificationStatus: "unverified",
  }] as never, [alice, bob]), []);
});

test("owner authorization, origin, selection cap and marketing suppression", async () => {
  const request = { ...draft, action: "preview", ids: [alice] };
  assert.equal((await fixture("preview", "member").post(request)).status, 403);
  const f = fixture();
  assert.equal((await f.post(request, "https://other.test")).status, 403);
  assert.equal((await f.post({ ...request, category: "newsletter" })).status, 422);
  assert.equal((await f.post({ ...request, ids: Array(6).fill(alice) })).status, 400);
  f.signOut();
  assert.equal((await f.post(request)).status, 401);
});

test("confirmed preview is bound to its draft and recipients and Preview never reaches SMTP", async () => {
  const f = fixture();
  const request = { ...draft, ids: [alice, bob] };
  const preview = await (await f.post({ ...request, action: "preview" })).json();
  assert.equal(preview.recipients.length, 2);
  const send = { ...request, ...preview, action: "send", confirmed: true, transactionalOnly: true };
  assert.equal((await f.post({ ...send, body: "changed" })).status, 409);
  assert.equal((await f.post({ ...send, ids: [alice] })).status, 409);
  assert.equal((await f.post({ ...send, transactionalOnly: false })).status, 409);
  assert.deepEqual(await (await f.post(send)).json(), { simulated: true, count: 2 });
  assert.equal(f.sent.length, 0);
});

test("production reserves quota before separate member sends and records ambiguous delivery", async () => {
  for (const ids of [[alice], [alice, bob]]) {
    const f = fixture("production");
    const request = { ...draft, ids };
    const preview = await (await f.post({ ...request, action: "preview" })).json();
    const response = await f.post({ ...request, ...preview, action: "send", confirmed: true, transactionalOnly: true });
    assert.deepEqual(await response.json(), { accepted: 1, rejected: 0, uncertain: ids.length - 1, summary: "accepted" });
    assert.deepEqual(f.sent.map(m => m.to), [...ids.map(id => id === alice ? "alice@example.test" : "bob@example.test"), mail.MEMBER_MAIL_ADDRESS]);
    assert.ok(f.sent.every(m => m.from === mail.MEMBER_MAIL_ADDRESS && m.replyTo === mail.MEMBER_MAIL_ADDRESS && !("cc" in m) && !("bcc" in m)));
    assert.equal(f.audit.length, ids.length + 1);
  }
  const f = fixture("production", "admin", false);
  const request = { ...draft, ids: [alice] };
  const preview = await (await f.post({ ...request, action: "preview" })).json();
  assert.equal((await f.post({ ...request, ...preview, action: "send", confirmed: true, transactionalOnly: true })).status, 409);
  assert.equal(f.sent.length, 0);
});

test("campaign SQL denies browser roles and enforces minute, daily and duplicate reservations", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon; create role authenticated; create role service_role;
      create schema auth; create schema beast_identity;
      create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,deleted_at timestamptz,banned_until timestamptz,raw_app_meta_data jsonb,email_change text);
      create table public.profiles(id uuid primary key,role text,account_kind text);
      create table beast_identity.usernames(user_id uuid);
      insert into public.profiles values ('${actor}','admin','member'),('${alice}','user','member');
      insert into auth.users values ('${alice}','alice@example.test',now(),null,null,'{}',null);
    `);
    await db.exec(readFileSync("supabase/migrations/20261109005349_beastadmin_member_communications.sql", "utf8"));
    await db.exec(readFileSync("supabase/migrations/20261109013510_beastadmin_member_email_verification.sql", "utf8"));
    const reserve = (id: string, fingerprint: string) => db.query<{ reserved: boolean }>(
      "select public.reserve_beast_admin_member_email_campaign($1,$2,$3,'Setup',$4) as reserved",
      [id, actor, fingerprint, JSON.stringify([{ id: alice, email: "alice@example.test" }])],
    );
    await db.exec("set role authenticated");
    await assert.rejects(reserve(alice, "first"), { code: "42501" });
    await db.exec("set role service_role");
    assert.equal((await reserve(alice, "first")).rows[0].reserved, true);
    assert.equal((await reserve(bob, "second")).rows[0].reserved, false);
    await db.exec("reset role; update public.beast_admin_member_email_campaigns set created_at=now()-interval '2 minutes'");
    assert.equal((await reserve(bob, "first")).rows[0].reserved, false);
    await db.exec(`insert into public.beast_admin_member_email_campaigns(id,actor_id,category,fingerprint,subject,recipients,recipient_count,created_at)
      select gen_random_uuid(),'${actor}','account_setup',i::text,'Setup','[]',5,now()-interval '2 minutes' from generate_series(1,3) i`);
    assert.equal((await reserve(bob, "daily-cap")).rows[0].reserved, false);
    await db.exec("update public.beast_admin_member_email_campaigns set created_at=now()-interval '2 days'");
    const verify = (id: string, fingerprint: string) => db.query<{ reserved: boolean }>(
      "select public.reserve_beast_admin_member_email_campaign($1,$2,$3,'Verify',$4,'verification') as reserved",
      [id, actor, fingerprint, JSON.stringify([{ id: alice, email: "alice@example.test" }])],
    );
    assert.equal((await verify(bob, "already-verified")).rows[0].reserved, false);
    await db.exec("update auth.users set email_confirmed_at=null,email_change='pending@example.test'");
    assert.equal((await verify(bob, "pending-change")).rows[0].reserved, false);
    await db.exec("update auth.users set email_change=null");
    assert.equal((await verify(bob, "verification-first")).rows[0].reserved, true);
    await db.exec("update public.beast_admin_member_email_campaigns set created_at=now()-interval '2 minutes' where category='verification'");
    assert.equal((await verify(unverified, "verification-cooldown")).rows[0].reserved, false);

  } finally {
    await db.close();
  }
});

test("bulk verification resolves unverified signup emails and uses only official Auth resend", async () => {
  for (const env of ["preview", "production"]) {
    const f = fixture(env);
    const request = { category: "verification", ids: [unverified, alice] };
    const preview = await (await f.post({ ...request, action: "preview" })).json();
    assert.deepEqual(preview.recipients.map((recipient: { id: string }) => recipient.id), [unverified]);
    assert.equal(preview.subject, "Official Beast account verification");
    const send = { ...request, ...preview, action: "send", confirmed: true };
    assert.equal((await f.post({ ...send, ids: [unverified] })).status, 409);
    const result = await (await f.post(send)).json();
    if (env === "preview") {
      assert.deepEqual(result, { simulated: true, count: 1 });
      assert.deepEqual(f.verification, []);
    } else {
      assert.deepEqual(result, { outcomes: { [unverified]: "accepted" } });
      assert.deepEqual(JSON.parse(JSON.stringify(f.verification)), [{
        type: "signup", email: "unverified@example.test",
        options: { emailRedirectTo: "https://beast.test/auth/callback" },
      }]);
      assert.equal(f.audit.length, 1);
    }
    assert.equal(f.sent.length, 0);
  }
});

test("unverified onboarding preview appends the official recovery entry point", async () => {
  const f = fixture();
  const response = await f.post({ ...draft, category: "onboarding", ids: [alice, unverified], action: "preview" });
  assert.equal(response.status, 200);
  const preview = await response.json();
  assert.equal(preview.recipients.length, 1);
  assert.match(preview.body, /https:\/\/thebeast.seangworld.com\/resend-verification/);
});

test("template recommendation follows the selected members and requires a choice for mixed eligibility", () => {
  const directory = [
    members[0],
    { ...member(unverified, "unverified@example.test"), emailVerificationStatus: "unverified" },
    { ...members[1], username: "already_set" },
  ] as never;
  assert.deepEqual(mail.getMemberMailTemplateOptions(directory, [alice]), {
    setup: 1, onboarding: 0, recommended: "account_setup",
  });
  assert.deepEqual(mail.getMemberMailTemplateOptions(directory, [unverified]), {
    setup: 0, onboarding: 1, recommended: "onboarding",
  });
  assert.deepEqual(mail.getMemberMailTemplateOptions(directory, [alice, unverified]), {
    setup: 1, onboarding: 1, recommended: null,
  });
  assert.equal(mail.getMemberMailTemplateOptions(directory, [alice, bob]).recommended, null);
  assert.equal(mail.getMemberMailTemplateOptions(directory, [bob]).recommended, null);
});
