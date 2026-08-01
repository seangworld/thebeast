export const SHARED_SESSION_ALLOWED_ORIGINS = [
  "https://www.seangworld.com",
  "https://seangworld.com",
] as const;

const allowedOrigins = new Set<string>(SHARED_SESSION_ALLOWED_ORIGINS);

export function isSharedSessionOriginAllowed(origin: string | null) {
  return Boolean(origin && allowedOrigins.has(origin));
}

export function sharedSessionCorsHeaders(origin: string) {
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-credentials": "true",
    "access-control-allow-methods": "GET, OPTIONS",
    "access-control-allow-headers": "Accept",
    "access-control-max-age": "300",
    vary: "Origin",
  } as const;
}

export function sharedSessionResponse(authenticated: boolean) {
  return { authenticated } as const;
}
