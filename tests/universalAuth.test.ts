import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { NextRequest, NextResponse } from 'next/server';
import { normalizeUsername, validPassword } from '../src/lib/auth/universal/policy';
import * as setup from '../src/lib/auth/accountSetup';
import {buildRegistrationCallbackUrl} from '../src/lib/auth/experience';
import * as policy from '../src/lib/auth/universal/policy';

test('username canonicalization rejects ambiguous and unsafe identifiers', () => {
  assert.equal(normalizeUsername('  Beast_123 '), 'beast_123');
  for (const value of ['', 'ab', '1beast', 'béast', 'Ｂeast', 'x@y.com', 'a'.repeat(33), null, {}, 'a b']) assert.equal(normalizeUsername(value), null);
  assert.equal(validPassword('a'.repeat(12)), true);
  assert.equal(validPassword('a'.repeat(73)), false);
  assert.equal(validPassword('😀'.repeat(19)), false);
});

function gateway(options: { limited?: boolean; known?: boolean; enabled?: boolean; authenticated?: boolean; verified?: boolean; disabled?: boolean; sessionAllowed?: boolean; claimUser?: boolean; wrongSubject?: boolean; rpcFailure?: boolean; captchaRequired?: boolean; signupError?: boolean } = {}) {
  const calls: string[] = [];
  const signups: Array<Record<string, unknown>> = [];
  const rpcInputs: Array<{ name: string; args: Record<string, unknown> }> = [];
  const admin = {
    rpc: async (name: string, args: Record<string, unknown>) => { calls.push(name); rpcInputs.push({ name, args }); return { data: name === 'beast_auth_attempt' ? !options.limited : options.known ? 'existing-id' : null, error: options.rpcFailure ? new Error('unavailable') : null }; },
    auth: { admin: { getUserById: async () => ({ data: { user: { email: 'private@example.com' } }, error: null }) } },
  };
  let stageCookie: (() => void) | undefined;
  let stageVerifier: (() => void) | undefined;
  const user = { id: options.wrongSubject ? 'other-id' : 'existing-id', email_confirmed_at: options.verified === false ? null : '2026-11-03', app_metadata: { is_disabled: options.disabled === true } };
  const auth = {
    rpc: async (name: string) => ({ data: name === 'beast_auth_current_username' ? (options.known && options.claimUser ? 'beast' : null) : options.sessionAllowed !== false, error: null }),
    auth: {
      signUp: async (input: Record<string, unknown>) => { signups.push(input);stageVerifier?.();stageCookie?.();return {data:{user:null,session:null},error:options.signupError?{code:'unexpected_failure'}:null}; },
      getUser: async () => ({ data: { user: options.claimUser ? user : null }, error: null }),
      signInWithPassword: async () => { calls.push('password'); if (options.authenticated) stageCookie?.(); return { data: { user: options.authenticated ? user : null, session: options.authenticated ? { access_token: 'fixture' } : null }, error: options.authenticated ? null : new Error('invalid') }; },
      signOut: async (input: { scope: string }) => { calls.push('signout:' + input.scope); return { error: null }; },
    },
  };
  const source = fs.readFileSync('src/app/api/auth/universal/route.ts', 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const exports: { POST?: (request: NextRequest) => Promise<NextResponse> } = {};
  vm.runInNewContext(js, { exports, require: (name: string) => {
    if (name === 'next/server') return { NextResponse };
    if (name === '@supabase/ssr') return { createServerClient: (_url: string, _key: string, config: { cookies: { setAll: (values: unknown[]) => void } }) => { stageCookie = () => config.cookies.setAll([{ name: 'sb-fixture-auth-token', value: 'session', options: { path: '/', httpOnly: true, secure: true, sameSite: 'lax', maxAge: 31536000 } }]); stageVerifier = () => config.cookies.setAll([{name:'sb-fixture-code-verifier',value:'pkce-fixture',options:{path:'/',secure:true,sameSite:'lax'}}]);return auth; } };
    if (name === '@supabase/supabase-js') return { createClient: () => ({ auth: { signUp: async (input: Record<string, unknown>) => { signups.push(input); return { data: { user: null, session: null }, error: options.signupError ? {code:'unexpected_failure'} : null }; } } }) };
    if (name.endsWith('/admin')) return { createAdminClient: () => admin };
    if (name.endsWith('/config')) return { requireSupabasePublicConfiguration: () => ({ url: 'https://canonical.supabase.co', publicKey: 'public' }) };
    if (name.endsWith('/experience')) return { isDisabledBeastUser: () => options.disabled === true, buildRegistrationCallbackUrl };
    if (name.endsWith('/accountSetup')) return setup;
    if (name.endsWith('/policy')) return policy;
    if (name === 'node:crypto') return require('node:crypto');
    throw new Error(name);
  }, process: { env: { BEAST_UNIVERSAL_AUTH_ENABLED: options.enabled === false ? 'false' : 'true', BEAST_IDENTITY_URL: 'https://canonical.supabase.co', BEAST_AUTH_RATE_SECRET: 'x'.repeat(32), BEAST_AUTH_CAPTCHA_REQUIRED: options.captchaRequired ? 'true' : 'false', BEAST_AUTH_EMAIL_ORIGIN: 'https://thebeast.seangworld.com' } }, URL, setTimeout: (fn: () => void) => fn(), Date });
  return { calls, rpcInputs, signups, post: (origin = 'https://beast.test', input: Record<string, unknown> = {}) => exports.POST!(new NextRequest('https://beast.test/api/auth/universal', { method: 'POST', headers: { origin }, body: JSON.stringify({ action: 'login', username: 'Beast', password: 'test-password', captchaToken: 'token', ...input }) })) };
}
test('disabled rollout and cross-origin requests do not reach identity service', async () => {
  const disabled = gateway({ enabled: false }); assert.equal((await disabled.post()).status, 503); assert.deepEqual(disabled.calls, []);
  const foreign = gateway(); assert.equal((await foreign.post('https://evil.test')).status, 403); assert.deepEqual(foreign.calls, []);
});
test('rate limit blocks before username resolution or password verification', async () => {
  const limited = gateway({ limited: true }); assert.equal((await limited.post()).status, 429); assert.deepEqual(limited.calls, ['beast_auth_attempt']);
});
test('unknown and incorrect-password identities have identical private failures', async () => {
  const unknown = gateway(); const known = gateway({ known: true });
  const a = await unknown.post(); const b = await known.post();
  assert.equal(a.status, 401); assert.equal(b.status, 401);
  assert.equal(await a.text(), await b.text());
  assert.equal(a.headers.get('cache-control'), 'no-store');
  assert.ok(unknown.calls.includes('password')); assert.ok(known.calls.includes('password'));
  assert.equal(a.cookies.getAll().length, 0);
});

test('verified username login returns persistent cookies without resolving email to caller', async () => {
  const service = gateway({ known: true, authenticated: true });
  const result = await service.post();
  assert.equal(result.status, 200);
  const cookie = result.cookies.get('sb-fixture-auth-token');
  assert.equal(cookie?.value, 'session');
  assert.ok(result.headers.get('set-cookie')?.includes('Max-Age=31536000'));
  assert.deepEqual(await result.json(), { message: 'Signed in.' });
});
test('unverified disabled wrong-subject and blocked sessions never return login cookies', async () => {
  for (const rejection of [{ verified: false }, { disabled: true }, { wrongSubject: true }, { sessionAllowed: false }]) {
    const service = gateway({ known: true, authenticated: true, ...rejection });
    const result = await service.post();
    assert.equal(result.status, 401);
    assert.equal(result.cookies.getAll().length, 0);
    assert.ok(service.calls.includes('signout:local'));
  }
});
test('existing account claim derives ownership from verified session rather than submitted IDs', async () => {
  const service = gateway({ claimUser: true });
  const result = await service.post('https://beast.test', { action: 'claim', user_id: 'forged-id' });
  assert.equal(result.status, 200);
  const args = service.rpcInputs.find(call => call.name === 'beast_auth_claim')?.args;
  assert.equal(args?.p_username, 'beast');
  assert.equal(args?.p_user_id, 'existing-id');
});
test('unsigned unverified disabled and blocked sessions cannot claim usernames', async () => {
  for (const settings of [{ claimUser: false }, { claimUser: true, verified: false }, { claimUser: true, disabled: true }, { claimUser: true, sessionAllowed: false }]) {
    const service = gateway(settings);
    assert.equal((await service.post('https://beast.test', { action: 'claim' })).status, 401);
    assert.ok(!service.calls.includes('beast_auth_claim'));
  }
});
test('database limiter failures fail closed before private resolution', async () => {
  const service = gateway({ rpcFailure: true });
  assert.equal((await service.post()).status, 503);
  assert.deepEqual(service.calls, ['beast_auth_attempt']);
});

test('registration uses server-normalized username and existing canonical verification callback', async () => {
  const service = gateway();
  const result = await service.post('https://beast.test', { action: 'register', username: '  My_Beast  ', email: 'test@example.com', password: 'example-password-123', captchaToken: undefined });
  assert.equal(result.status, 200);
  assert.equal(service.signups.length, 1);
  const signup = service.signups[0] as { options: { data: { beast_username: string }; emailRedirectTo: string } };
  assert.equal(signup.options.data.beast_username, 'my_beast');
  assert.equal(signup.options.emailRedirectTo, 'https://beast.test/auth/callback?flow=email_verification&purpose=registration');
  assert.deepEqual(result.cookies.getAll().map(cookie => cookie.name), ['sb-fixture-code-verifier']);
});
test('CAPTCHA follows existing provider policy with optional additional gateway enforcement', async () => {
  const optional = gateway({ known: true, authenticated: true });
  assert.equal((await optional.post('https://beast.test', { captchaToken: undefined })).status, 200);
  const required = gateway({ captchaRequired: true });
  assert.equal((await required.post('https://beast.test', { captchaToken: undefined })).status, 400);
  assert.ok(!required.calls.includes('password'));
});
test('claim rejects account switching and a retry of the same owned name is idempotent', async () => {
  const switched = gateway({ claimUser: true });
  assert.equal((await switched.post('https://beast.test', { action: 'claim', expectedSubject: 'different-account' })).status, 401);
  assert.ok(!switched.calls.includes('beast_auth_claim'));
  const owned = gateway({ known: true, claimUser: true });
  assert.equal((await owned.post('https://beast.test', { action: 'claim', expectedSubject: 'existing-id' })).status, 200);
  assert.ok(!owned.calls.includes('beast_auth_claim'));
});

test('registration rejects a taken username before creating an account and never reports provider failure as email success',async()=>{
 const taken=gateway({known:true});const result=await taken.post('https://beast.test',{action:'register',email:'new@example.test'});assert.equal(result.status,409);assert.equal(taken.signups.length,0);assert.match((await result.json()).message,/unavailable/);
 const failed=gateway({signupError:true});const failure=await failed.post('https://beast.test',{action:'register',email:'new@example.test'});assert.equal(failure.status,503);assert.doesNotMatch((await failure.json()).message,/check your email/);
});
test('registration preserves only safe local requested-application destinations',async()=>{
 const service=gateway();await service.post('https://beast.test',{action:'register',email:'new@example.test',next:'/dashboard/beastguide'});const opts=service.signups[0].options as {emailRedirectTo:string};assert.equal(new URL(opts.emailRedirectTo).searchParams.get('next'),'/dashboard/beastguide');
});

test('registration retains only PKCE proof cookies and never grants an accidental signup session',async()=>{
 const service=gateway();const result=await service.post('https://beast.test',{action:'register',email:'new@example.test'});assert.equal(result.cookies.get('sb-fixture-code-verifier')?.value,'pkce-fixture');assert.equal(result.cookies.get('sb-fixture-auth-token'),undefined);
});

test('availability reveals only a rate-limited message without account IDs or sessions',async()=>{for(const known of [true,false]){const service=gateway({known});const result=await service.post('https://beast.test',{action:'availability'});assert.equal(result.status,200);const body=await result.json();assert.deepEqual(Object.keys(body),['message']);assert.match(body.message,known?/unavailable/:/is available/);assert.ok(!JSON.stringify(body).includes('existing-id'));assert.ok(!service.calls.includes('password'));}const limited=gateway({limited:true});assert.equal((await limited.post('https://beast.test',{action:'availability'})).status,429)});

test('availability does not consume the target username credential budget',async()=>{const service=gateway();await service.post('https://beast.test',{action:'availability'});await service.post('https://beast.test',{action:'login'});const buckets=service.rpcInputs.filter(x=>x.name==='beast_auth_attempt');assert.equal(buckets[0].args.p_bucket,buckets[2].args.p_bucket);assert.notEqual(buckets[1].args.p_bucket,buckets[3].args.p_bucket)});
