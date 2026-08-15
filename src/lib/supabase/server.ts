import { cookies, type UnsafeUnwrappedCookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { requireSupabasePublicConfiguration } from "./config";

export function createRouteClient() {
  const configuration = requireSupabasePublicConfiguration();

  // Supabase's client factory must remain synchronous for its existing callers.
  // Next 15 retains this compatibility path while async request APIs are adopted.
  const cookieStore = cookies() as unknown as UnsafeUnwrappedCookies;

  return createServerClient(configuration.url, configuration.publicKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options) {
        cookieStore.set({ name, value: "", ...options });
      },
    },
  });
}
