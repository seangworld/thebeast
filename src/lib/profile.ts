import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types/database";

type AuthUserIdentity = {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
} | null | undefined;

function cleanName(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function getProfileDisplayName(
  profile?: Pick<
    Profile,
    "preferred_name" | "display_name" | "full_name" | "username"
  > | null,
  user?: AuthUserIdentity
) {
  const metadata = user?.user_metadata;
  const emailPrefix = cleanName(user?.email?.split("@")[0]);

  return (
    cleanName(profile?.preferred_name) ||
    cleanName(profile?.display_name) ||
    cleanName(profile?.full_name) ||
    cleanName(profile?.username) ||
    cleanName(metadata?.preferred_name) ||
    cleanName(metadata?.display_name) ||
    cleanName(metadata?.full_name) ||
    emailPrefix ||
    "user"
  );
}

export async function getCurrentUserProfile(): Promise<Profile | null> {
  const supabase = createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as Profile | null;
}
