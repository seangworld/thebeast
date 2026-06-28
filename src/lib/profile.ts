import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types/database";

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
