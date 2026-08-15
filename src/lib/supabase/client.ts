import { createBrowserClient } from "@supabase/ssr";
import { requireSupabasePublicConfiguration } from "./config";

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

export function createClient() {
  const configuration = requireSupabasePublicConfiguration();
  return createBrowserClient(configuration.url, configuration.publicKey);
}
