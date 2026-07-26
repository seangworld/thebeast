# BA-106 password recovery and PKCE deployment checklist

## Applicability

BeastOS is currently deployed as magic-link-first authentication.
`NEXT_PUBLIC_BEAST_PASSWORD_SIGN_IN_ENABLED` is absent from every Vercel
environment and therefore defaults to `false`. Password sign-in, “Forgot
password?”, and both recovery pages remain unavailable until an environment
explicitly enables that flag.

The recovery implementation is complete behind the flag. It uses Supabase
PKCE, the Beast password-reset email template, a short-lived HTTP-only recovery
authorization cookie, and a global sign-out after the password changes.

## Verified environment inventory — July 26, 2026

| Environment | Application origin | Supabase project | Vercel variables | Current status |
| --- | --- | --- | --- | --- |
| Local development | `http://localhost:3000` or `http://127.0.0.1:3000` | `the-beast-dev` (`zvzcojwjgnedrouilovc`) | `.env.local` contains the development Supabase URL and anon key. Password flag and canonical site URL are absent. | Magic link works. Password recovery is intentionally hidden. Local callback configuration is corrected in `supabase/config.toml`. |
| Vercel Development | Vercel CLI local runtime | Intended: `the-beast-dev` | No Development-scoped Supabase URL, anon key, canonical site URL, or auth feature flags exist in Vercel. | `vercel dev` will not have the required Supabase variables unless it also reads `.env.local`. |
| Vercel Preview | Dynamic `*.vercel.app` deployment | The same Supabase variable assignment currently used by Production | Supabase URL and anon key are present. Canonical site URL and auth feature flags are absent. | Password recovery is hidden. Preview isolation is not established, and preview callbacks require a wildcard allowlist on the shared Supabase project. |
| Production | `https://thebeast.seangworld.com` | `thebeast` (`grpyzwvgqiwtxadfdtni`) | Supabase URL and anon key are present. Public bundle inspection confirms the production project ref. Canonical site URL and auth feature flags are absent. | Magic link is deployed. Password recovery is hidden. Hosted Supabase URL settings still require dashboard verification. |

Current production aliases also include:

- `https://thebeast-ten.vercel.app`
- `https://thebeast-seangworld-3898s-projects.vercel.app`
- `https://thebeast-git-main-seangworld-3898s-projects.vercel.app`

Setting `NEXT_PUBLIC_BEAST_SITE_URL=https://thebeast.seangworld.com` in
Production keeps all email callbacks on the canonical origin instead of
requiring every Vercel alias to be allowlisted.

## Confirmed mismatches and release blockers

1. `NEXT_PUBLIC_BEAST_SITE_URL` is missing from Production. Authentication
   initiated from a Vercel alias currently builds a callback on that alias.
2. `NEXT_PUBLIC_BEAST_PASSWORD_SIGN_IN_ENABLED` is missing everywhere.
   This correctly keeps the incomplete deployment disabled, but password
   recovery will remain invisible until explicitly enabled.
3. Vercel Development has no Supabase variables.
4. Preview and Production share one Vercel Supabase variable assignment.
   Preview is therefore not isolated from Production.
5. The hosted Supabase Site URL and redirect allowlists could not be read
   through the CLI or public Auth settings endpoint. They must be confirmed in
   each project’s Authentication → URL Configuration before enabling password
   sign-in.
6. Hosted password requirements, reset throttling, and the recovery email
   template do not automatically inherit `supabase/config.toml`. They must be
   aligned in each hosted Supabase project.

Any missing redirect causes Supabase to ignore the requested callback and use
the configured Site URL instead. That breaks PKCE because the browser does not
return to the expected BeastOS callback route.

## Required Supabase URL configuration

### Development project — `zvzcojwjgnedrouilovc`

- Site URL: `http://localhost:3000`
- Redirect URLs:
  - `http://localhost:3000/auth/callback`
  - `http://localhost:3000/auth/recovery`
  - `http://127.0.0.1:3000/auth/callback`
  - `http://127.0.0.1:3000/auth/recovery`
- If the development project also supports Vercel previews:
  - `https://*-seangworld-3898s-projects.vercel.app/auth/callback`
  - `https://*-seangworld-3898s-projects.vercel.app/auth/recovery`

### Production project — `grpyzwvgqiwtxadfdtni`

- Site URL: `https://thebeast.seangworld.com`
- Redirect URLs:
  - `https://thebeast.seangworld.com/auth/callback`
  - `https://thebeast.seangworld.com/auth/recovery`
- Do not use a broad Production wildcard when the canonical site variable is
  configured.

## Required Vercel variables

### Development

- `NEXT_PUBLIC_SUPABASE_URL=https://zvzcojwjgnedrouilovc.supabase.co`
- Development anon key for `zvzcojwjgnedrouilovc`
- `NEXT_PUBLIC_BEAST_SITE_URL` blank for local development
- `NEXT_PUBLIC_BEAST_PASSWORD_SIGN_IN_ENABLED=true` only when the development
  Supabase password provider, redirects, template, and rate limits are ready

### Preview

Recommended:

- Use the development Supabase project rather than Production.
- Leave `NEXT_PUBLIC_BEAST_SITE_URL` blank so the current preview origin is used.
- Add the exact preview wildcard callbacks to the development Supabase project.
- Enable the password flag only after those settings are confirmed.

### Production

- `NEXT_PUBLIC_SUPABASE_URL=https://grpyzwvgqiwtxadfdtni.supabase.co`
- Production anon key for `grpyzwvgqiwtxadfdtni`
- `NEXT_PUBLIC_BEAST_SITE_URL=https://thebeast.seangworld.com`
- `NEXT_PUBLIC_BEAST_PASSWORD_SIGN_IN_ENABLED=true` only after the complete
  checklist passes
- Set `NEXT_PUBLIC_BEAST_PUBLIC_REGISTRATION_ENABLED` explicitly to the intended
  Production policy instead of relying on its default

## Supabase Auth checklist before enabling the password flag

- [ ] Email/password provider enabled.
- [ ] Site URL and both callback routes match the environment.
- [ ] Beast recovery template installed as the Reset Password template.
- [ ] Minimum password length is 12.
- [ ] Password requirement is letters and digits.
- [ ] Password reset request frequency is at least 60 seconds.
- [ ] Production SMTP is configured and tested.
- [ ] Reset email always uses the same browser in which it was requested so the
      PKCE verifier cookie is available.
- [ ] Expired, reused, malformed, and non-recovery links reach the BeastOS
      invalid-link state.
- [ ] Successful reset revokes all sessions and returns to BeastOS sign-in with
      the password-updated message.
- [ ] Magic-link sign-in still works after password recovery is enabled.

No database migration is required for BA-106.
