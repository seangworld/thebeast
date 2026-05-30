import { createBrowserClient } from "@supabase/ssr";

const defaultSupabaseUrl = "https://grpyzwvgqiwtxadfdtni.supabase.co";
const defaultSupabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdycHl6d3ZncWl3dHhhZGZkdG5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY5NTI3MTYsImV4cCI6MjA5MjUyODcxNn0.k0NOMDHWthrRakYlo59MK5Hm9UeSg-r7MyBK8fjqpao";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || defaultSupabaseUrl;
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || defaultSupabaseAnonKey;

if (
  process.env.NODE_ENV !== "production" &&
  supabaseUrl === defaultSupabaseUrl
) {
  console.warn(
    "WARNING: The Beast is using the production Supabase project in non-production mode.\n" +
      "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to a development/test project before running locally."
  );
}

export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
