import { createHmac, randomUUID } from 'node:crypto';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireSupabasePublicConfiguration } from '@/lib/supabase/config';
import { isDisabledBeastUser } from '@/lib/auth/experience';
import { AUTH_FAILURE, normalizeUsername, REGISTRATION_NOTICE, validPassword } from '@/lib/auth/universal/policy';

export const runtime = 'nodejs';
export async function POST(request: NextRequest) {
  const response = NextResponse.json({ message: AUTH_FAILURE }, { status: 401 });
  response.headers.set('Cache-Control', 'no-store');
  const reply = (message: string, status = 200) => {
    const result = NextResponse.json({ message }, { status });
    result.headers.set('Cache-Control', 'no-store');
    return result;
  };
  if (process.env.BEAST_UNIVERSAL_AUTH_ENABLED !== 'true') return reply('Authentication is unavailable.', 503);
  // Same-origin gateway only. Each application hosts this adapter with canonical
  // credentials; no cross-origin password or session relay.
  if (request.headers.get('origin') !== request.nextUrl.origin) return reply('Request rejected.', 403);
  if (Number(request.headers.get('content-length') || 0) > 8192) return reply('Request too large.', 413);
  const started = Date.now();
  let phase = "configuration";
  try {
    const raw = await request.text();
    if (raw.length > 8192) return reply('Request too large.', 413);
    const input = JSON.parse(raw);
    const username = normalizeUsername(input.username);
    const action = input.action;
    if (!username || !['login', 'register', 'claim'].includes(action)) return reply('Use a username of 3–32 letters, numbers or underscores, starting with a letter.', 400);
    const configuration = requireSupabasePublicConfiguration();
    // Explicit independent pin prevents accidental use of a standalone project's identity.
    if (configuration.url !== process.env.BEAST_IDENTITY_URL) throw new Error('Identity configuration');
    const admin = createAdminClient();
    const secret = process.env.BEAST_AUTH_RATE_SECRET;
    if (!admin || !secret || secret.length < 32) throw new Error('Auth configuration');
    // Vercel overwrites this header. Other deployments must add a trusted adapter;
    // a shared fallback is deliberately restrictive, never a spoofable forwarded IP.
    const network = process.env.VERCEL === '1' ? request.headers.get('x-vercel-forwarded-for') || 'unknown' : 'local-shared';
    phase = "rate_limit";
    for (const [key, limit] of [[`network:${network}`, 30], [`username:${username}`, 10]] as const) {
      const bucket = createHmac('sha256', secret).update(key).digest('hex');
      const { data, error } = await admin.rpc('beast_auth_attempt', { p_bucket: bucket, p_limit: limit });
      if (error) throw error;
      if (data !== true) return reply('Please wait before trying again.', 429);
    }
    const authenticatedReply = (message: string) => {
      const success = reply(message);
      response.cookies.getAll().forEach(cookie => success.cookies.set(cookie));
      return success;
    };
    const auth = createServerClient(configuration.url, configuration.publicKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (values) => values.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
      },
    });
    if (action === 'claim') {
      const { data: { user }, error } = await auth.auth.getUser();
      if (error || !user?.email_confirmed_at || isDisabledBeastUser(user)) return response;
      if (input.expectedSubject !== undefined && input.expectedSubject !== user.id) return reply(AUTH_FAILURE, 401);
      const control = await auth.rpc('is_current_beast_session_allowed');
      if (control.error || control.data !== true) return reply(AUTH_FAILURE, 401);
      const currentIdentity = await admin.rpc('beast_auth_identity', { p_username: username });
      if (currentIdentity.error) throw currentIdentity.error;
      if (currentIdentity.data === user.id) return authenticatedReply('Your username is already active.');
      const claimed = await admin.rpc('beast_auth_claim', { p_username: username, p_user_id: user.id });
      return claimed.error ? reply('Unable to claim this username.', 409) : authenticatedReply('Username claimed.');
    }
    if (action === 'register' && process.env.NEXT_PUBLIC_BEAST_PUBLIC_REGISTRATION_ENABLED?.trim().toLowerCase() === 'false') return reply('Registration is unavailable.', 503);
    if (!validPassword(input.password) && action === 'register') return reply('Use at least 12 characters and at most 72 UTF-8 bytes.', 400);
    if (typeof input.password !== 'string' || input.password.length > 128 || !input.password) return response;
    // Preserve the hosted provider policy. Supabase verifies any configured CAPTCHA;
    // this gateway does not provision a provider or change hosted Auth settings.
    if (input.captchaToken !== undefined && typeof input.captchaToken !== 'string') return reply('Invalid security check.', 400);
    if (process.env.BEAST_AUTH_CAPTCHA_REQUIRED === 'true' && !input.captchaToken) return reply('Complete the security check.', 400);
    if (action === 'register') {
      if (typeof input.email !== 'string' || input.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) return reply('Enter a valid email address.', 400);
      // Non-persisting client prevents accidental sessions if confirmation was
      // misconfigured. Confirmation is independently checked again at login.
      const signup = createClient(configuration.url, configuration.publicKey, { auth: { persistSession: false, autoRefreshToken: false } });
      await signup.auth.signUp({ email: input.email, password: input.password, options: {
        captchaToken: input.captchaToken,
        data: { beast_username: username },
        emailRedirectTo: new URL('/auth/callback?flow=email_verification', process.env.BEAST_AUTH_EMAIL_ORIGIN || request.nextUrl.origin).toString(),
      } });
      return reply(REGISTRATION_NOTICE);
    }
    phase = 'identity_resolution';
    const identity = await admin.rpc('beast_auth_identity', { p_username: username });
    if (identity.error) throw identity.error;
    const account = identity.data ? await admin.auth.admin.getUserById(identity.data) : null;
    if (account?.error) throw account.error;
    const user = account?.data.user;
    // Unknown users still perform a password request; never return an email lookup.
    const email = user?.email || `${randomUUID()}@invalid.example`;
    phase = 'password_verification';
    const signed = await auth.auth.signInWithPassword({ email, password: input.password, options: { captchaToken: input.captchaToken } });
    if (signed.error || !identity.data || signed.data.user?.id !== identity.data || !signed.data.user?.email_confirmed_at || isDisabledBeastUser(signed.data.user)) {
      if (signed.data.session) await auth.auth.signOut({ scope: 'local' });
      // Discard all session cookies on a rejected sign-in.
      return reply(AUTH_FAILURE, 401);
    }
    const control = await auth.rpc('is_current_beast_session_allowed');
    if (control.error || control.data !== true) {
      await auth.auth.signOut({ scope: 'local' });
      return reply(AUTH_FAILURE, 401);
    }
    // Only the owner's session cookies are returned, never the resolved email.
    return authenticatedReply('Signed in.');
  } catch {
    console.error('Beast auth gateway unavailable', { phase });
    return reply('Authentication is temporarily unavailable.', 503);
  } finally {
    // Reduce cheap timing distinctions; distributed limits and CAPTCHA remain required.
    await new Promise(resolve => setTimeout(resolve, Math.max(0, 800 - (Date.now() - started))));
  }
}
