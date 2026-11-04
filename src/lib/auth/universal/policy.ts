/** ASCII-only canonicalization deliberately avoids Unicode confusables. */
export function normalizeUsername(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  return /^[a-z][a-z0-9_]{2,31}$/.test(normalized) ? normalized : null;
}
export const AUTH_FAILURE = 'Unable to authenticate with these credentials.';
export const REGISTRATION_NOTICE = 'If registration can proceed, check your email to verify your account.';
export function validPassword(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 12 && new TextEncoder().encode(value).length <= 72;
}
