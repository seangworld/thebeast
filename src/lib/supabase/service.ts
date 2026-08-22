import { createClient } from "@supabase/supabase-js";
import { requireSupabasePublicConfiguration } from "./config";

export function createBeastFusionPublicationClient() {
  const { url } = requireSupabasePublicConfiguration();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!serviceRoleKey || serviceRoleKey.length < 40) throw new Error("The server-only Supabase publication credential is not configured.");
  return createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}
