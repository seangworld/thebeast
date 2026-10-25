// Offline PostgreSQL regression; PGlite is a temporary test tool, not an app dependency.
// Pass the absolute path to its dist/index.js as the first argument.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const { PGlite } = await import(pathToFileURL(process.argv[2]).href);
const db = new PGlite();
const source = readFileSync("supabase/migrations/20260726001000_add_beast_admin_member_account_editing.sql", "utf8");
const original = source.slice(source.indexOf("create or replace function public.update_beast_admin_member_account("), source.indexOf("revoke all on function public.get_beast_admin_member_directory()"));
const migration = readFileSync("supabase/migrations/20261025224150_preserve_noneditable_member_access.sql", "utf8");
const actor = "00000000-0000-4000-8000-000000000001";
const member = "00000000-0000-4000-8000-000000000002";
const other = "00000000-0000-4000-8000-000000000003";
try {
  await db.exec(`
    create schema auth;
    create role anon; create role authenticated; create role service_role;
    create function auth.role() returns text language sql as $$select current_setting('request.jwt.claim.role', true)$$;
    create table auth.users(id uuid primary key, deleted_at timestamptz, banned_until timestamptz);
    create table public.profiles(id uuid primary key, role text, display_name text, account_kind text);
    create table public.beast_admin_member_module_access(member_id uuid, module_id text, enabled boolean, updated_by uuid, updated_at timestamptz default now(), primary key(member_id, module_id));
    create table public.beast_admin_feature_flags(id uuid primary key, owner_id uuid);
    create table public.beast_admin_feature_flag_assignments(flag_id uuid, owner_id uuid, scope_type text, member_id uuid, stage text, module_id text, role_name text, updated_at timestamptz);
    create unique index flag_member on public.beast_admin_feature_flag_assignments(flag_id,member_id) where scope_type='member';
    create table public.beast_admin_member_account_audit_events(id uuid default gen_random_uuid(), actor_id uuid, member_id uuid, changes jsonb);
  `);
  await db.exec(original);
  await assert.rejects(db.exec(migration), /requires the reviewed Home entitlement migration/);
  await db.exec(original.replaceAll("array['money', 'learning']::text[]", "array['money', 'learning', 'home']::text[]"));
  const signature = "public.update_beast_admin_member_account(uuid,text,text,text,text[],uuid[],jsonb,uuid)";
  await db.exec(`revoke all on function ${signature} from public, anon, authenticated; grant execute on function ${signature} to service_role;`);
  const metadata = () => db.query(`select proowner,proacl,prosecdef,proconfig from pg_proc where oid='${signature}'::regprocedure`);
  const before = await metadata();
  await db.exec(migration);
  assert.deepEqual((await metadata()).rows, before.rows);
  await assert.rejects(db.exec(migration), /differs from reviewed access preservation contract/);
  await db.exec(`
    insert into auth.users(id) values ('${actor}'),('${member}'),('${other}');
    insert into public.profiles values ('${actor}','admin','Fixture Owner','member'),('${member}','user','Fixture Member','member'),('${other}','user','Other Fixture','member');
    insert into public.beast_admin_member_module_access(member_id,module_id,enabled,updated_by,updated_at) values
      ('${member}','health',false,'${actor}','2026-01-01Z'),
      ('${member}','money',false,'${actor}','2026-01-01Z'),
      ('${member}','learning',true,'${actor}','2026-01-01Z'),
      ('${member}','home',true,'${actor}','2026-01-01Z'),
      ('${other}','health',true,'${actor}','2026-01-01Z'),
      ('${other}','money',false,'${actor}','2026-01-01Z');
  `);
  const retained = () => db.query(`select * from public.beast_admin_member_module_access where module_id='health' or member_id='${other}' order by member_id,module_id`);
  const initial = await retained();
  const save = (modules, selectedActor = actor) => db.query(`select public.update_beast_admin_member_account($1,'Updated Fixture','user','active',$2::text[],'{}'::uuid[],'{}'::jsonb,$3)`, [member, modules, selectedActor]);
  await db.exec("set request.jwt.claim.role='authenticated'");
  await assert.rejects(save(["money"]), /Server-only/);
  await db.exec("set request.jwt.claim.role='service_role'");
  await assert.rejects(save(["money"], other), /owner access required/);
  await assert.rejects(save(["health"]), /Module access selection is invalid/);
  await save(["money"]);
  assert.deepEqual((await retained()).rows, initial.rows);
  assert.deepEqual((await db.query(`select module_id,enabled from public.beast_admin_member_module_access where member_id='${member}' order by module_id`)).rows, [
    { module_id: "health", enabled: false },
    { module_id: "home", enabled: false },
    { module_id: "learning", enabled: false },
    { module_id: "money", enabled: true },
  ]);
  assert.equal((await db.query("select count(*)::int as count from public.beast_admin_member_account_audit_events")).rows[0].count, 1);
  console.log("PASS: real member RPC preserves Health and other members, updates editable access, retains grants and owner checks, rejects unsupported edits and migration drift, and records the successful save.");
} finally {
  await db.close();
}
