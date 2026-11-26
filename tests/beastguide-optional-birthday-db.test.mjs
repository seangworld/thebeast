import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('proposed BeastGuide setup migration preserves accounts and the shared age gate', async t => {
  const db = new PGlite();
  const member = '10000000-0000-4000-8000-000000000001';
  const other = '20000000-0000-4000-8000-000000000002';
  const unverified = '30000000-0000-4000-8000-000000000003';
  const unassigned = '40000000-0000-4000-8000-000000000004';
  const unnamed = '50000000-0000-4000-8000-000000000005';
  const migration = 'supabase/migrations/20261126034316_beastguide_optional_birthday_setup.sql';
  try {
    await db.exec(`
      create role anon;
      create role authenticated;
      create role service_role;
      create schema auth;
      create table auth.users(id uuid primary key, email_confirmed_at timestamptz, raw_user_meta_data jsonb);
      create table public.profiles(id uuid primary key, preferred_name text, display_name text, full_name text, birthday date);
      create function auth.uid() returns uuid language sql stable as $$
        select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
      $$;
    `);
    await db.exec(await readFile('supabase/migrations/20261103235724_universal_authentication.sql', 'utf8'));
    await db.exec(await readFile('supabase/migrations/20261104230605_account_setup_username_readback.sql', 'utf8'));
    for (const [id, name, birthday, confirmed, username] of [
      [member, 'Synthetic member', null, true, 'member_one'],
      [other, 'Existing member', '1980-01-01', true, 'member_two'],
      [unverified, 'Unverified member', null, false, 'unverified'],
      [unassigned, 'No username', null, true, null],
      [unnamed, ' ', null, true, 'unnamed'],
    ]) {
      await db.query('insert into auth.users values ($1, $2, $3)', [id, confirmed ? '2026-11-25T00:00:00Z' : null, username ? { beast_username: username } : {}]);
      await db.query('insert into public.profiles values ($1, $2, null, null, $3)', [id, name, birthday]);
    }
    const snapshot = async () => ({
      profiles: (await db.query('select * from public.profiles order by id')).rows,
      users: (await db.query('select * from auth.users order by id')).rows,
      usernames: (await db.query('select * from beast_identity.usernames order by user_id')).rows,
    });
    const before = await snapshot();
    const sharedDefinition = (await db.query("select pg_get_functiondef('public.beast_auth_account_setup_complete()'::regprocedure) as definition")).rows;
    await db.exec(await readFile(migration, 'utf8'));

    await t.test('migration changes no existing records or shared setup definition', async () => {
      assert.deepEqual(await snapshot(), before);
      assert.deepEqual((await db.query("select pg_get_functiondef('public.beast_auth_account_setup_complete()'::regprocedure) as definition")).rows, sharedDefinition);
    });
    await db.exec('set role anon');
    await t.test('anonymous calls are denied', async () => {
      await assert.rejects(db.query('select public.beastguide_account_setup_complete()'), /permission denied/);
    });
    await db.exec('reset role; set role authenticated');
    async function ready(id, rpc = 'beastguide_account_setup_complete') {
      await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
      return (await db.query(`select public.${rpc}() as ready`)).rows[0].ready;
    }
    await t.test('verified member with no birthday passes BeastGuide and still fails shared setup', async () => {
      assert.equal(await ready(member), true);
      assert.equal(await ready(member, 'beast_auth_account_setup_complete'), false);
      assert.equal(await ready(other), true);
      assert.equal(await ready(other, 'beast_auth_account_setup_complete'), true);
    });
    await t.test('unverified, unnamed, unassigned and absent subjects fail closed', async () => {
      for (const id of [unverified, unnamed, unassigned, '']) assert.equal(await ready(id), false);
      await db.query("select set_config('request.jwt.claim.sub', $1, false)", [other]);
      assert.equal(await ready(member), true);
      await assert.rejects(db.query('select * from beast_identity.usernames'), /permission denied/);
      await assert.rejects(db.query('select public.beastguide_account_setup_complete($1)', [other]), /does not exist/);
    });
    await t.test('rollback removes only the additive function', async () => {
      await db.exec('reset role; drop function public.beastguide_account_setup_complete()');
      assert.deepEqual(await snapshot(), before);
      assert.deepEqual((await db.query("select pg_get_functiondef('public.beast_auth_account_setup_complete()'::regprocedure) as definition")).rows, sharedDefinition);
    });
  } finally {
    await db.close();
  }
});
