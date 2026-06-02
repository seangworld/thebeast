import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client factory
 *
 * Environment variables:
 * - NEXT_PUBLIC_SUPABASE_URL: Supabase project URL (e.g. https://xyz.supabase.co)
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY: Supabase anon/public key
 *
 * Local development: set these in `.env.local` from your development/test Supabase project.
 * Production (Vercel): set these in the Vercel project environment variables for the production project.
 *
 * Security notes:
 * - Do NOT commit `.env.local` to the repository. `.env*.local` is already ignored by `.gitignore`.
 * - The client will throw if required env vars are missing to avoid accidentally connecting to an unintended project.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function createClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    const envHint =
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.\n" +
      "Set these in .env.local for development (pointing to your dev/test Supabase project),\n" +
      "and configure production credentials in your Vercel project settings.";

    // Fail fast to avoid accidental writes against production when envs are not explicitly configured
    throw new Error(envHint);
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
