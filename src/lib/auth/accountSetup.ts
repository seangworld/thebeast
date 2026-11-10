import { getSafeAuthDestination } from './experience';
export const USERNAME_REQUIREMENTS = '3–32 characters. Start with a letter. Use only letters, numbers, and underscores (_). No spaces, other special characters, or email addresses.';
export function accountSetupPath(destination?: string | null) {
  const next=getSafeAuthDestination(destination);
  return '/account-setup?next=' + encodeURIComponent(next.startsWith('/account-setup') ? '/dashboard/today' : next);
}
export function accountSetupStage(verified: boolean, username: string | null, profile: {preferred_name?: string | null; display_name?: string | null; full_name?: string | null; birthday?: string | null} | null) {
  if (!verified) return 'verification';
  if (!username) return 'username';
  if (!profile || ![profile.preferred_name, profile.display_name, profile.full_name].some(value => value?.trim()) || !profile.birthday) return 'profile';
  return 'ready';
}
export function usernameClaimFailure(error: {code?: string; message?: string; details?: string}) {
  if (error.code === '23505') return /user_id/i.test((error.message || '') + (error.details || ''))
    ? 'Your account already has a login username. Reload to see it; it has not been replaced.'
    : 'That username is unavailable. Choose another one.';
  if (error.code === '23514' || error.code === '22023') return USERNAME_REQUIREMENTS;
  return 'Your username could not be confirmed. Your account has not been changed. Please retry.';
}

export function accountSetupReturn(app: unknown, next: string | null | undefined) {
  if(app === 'beastguide') {
    const page=['library','discover','profile','bookmark'].includes(next || '') ? next! : 'library';
    return {name:'BeastGuide', href:'https://beastguide.seangworld.com/?beast_return=1&next='+page, loginDestination:'/account-setup?app=beastguide&next='+page};
  }
  const safe=getSafeAuthDestination(next),href=safe.startsWith('/account-setup')?'/dashboard/today':safe;
  return {name:'BeastOS',href,loginDestination:accountSetupPath(href)};
}
