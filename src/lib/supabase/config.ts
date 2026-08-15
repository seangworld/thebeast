export type SupabasePublicConfiguration = Readonly<{
  url: string;
  publicKey: string;
}>;

export type SupabaseConfigurationResult =
  | { ok: true; configuration: SupabasePublicConfiguration }
  | { ok: false; reason: "missing_url" | "missing_key" | "invalid_url" | "unusable_url" | "unusable_key" };

export type ConfigurationBoundary = "public" | "dashboard" | "api";

export function getConfigurationBoundary(pathname: string): ConfigurationBoundary {
  if (pathname.startsWith("/dashboard")) return "dashboard";
  if (pathname.startsWith("/api/") && !pathname.startsWith("/api/auth/") && pathname !== "/api/session/status") return "api";
  return "public";
}

const placeholderPattern = /(?:example|placeholder|changeme|your[-_ ]?(?:project|key)|localhost\.invalid)/i;

export function resolveSupabasePublicConfiguration(input: {
  url?: string;
  publicKey?: string;
}): SupabaseConfigurationResult {
  const url = input.url?.trim();
  const publicKey = input.publicKey?.trim();
  if (!url) return { ok: false, reason: "missing_url" };
  if (!publicKey) return { ok: false, reason: "missing_key" };

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, reason: "invalid_url" };
  }
  if (
    parsed.protocol !== "https:" ||
    !parsed.hostname ||
    placeholderPattern.test(url) ||
    parsed.username ||
    parsed.password
  ) {
    return { ok: false, reason: "unusable_url" };
  }
  if (publicKey.length < 20 || placeholderPattern.test(publicKey)) {
    return { ok: false, reason: "unusable_key" };
  }
  return { ok: true, configuration: { url, publicKey } };
}

export function requireSupabasePublicConfiguration(): SupabasePublicConfiguration {
  const result = resolveSupabasePublicConfiguration({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publicKey:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  if (!result.ok) {
    throw new Error("The application data service is not configured.");
  }
  return result.configuration;
}
