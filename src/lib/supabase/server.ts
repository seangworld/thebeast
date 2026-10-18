import { cookies, type UnsafeUnwrappedCookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { requireSupabasePublicConfiguration } from "./config";

function clientWithCookies(cookieStore: UnsafeUnwrappedCookies) {
  const configuration = requireSupabasePublicConfiguration();

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

// Preserve existing synchronous callers; migrated routes use the async entry point.
export function createRouteClient() {
  return clientWithCookies(cookies() as unknown as UnsafeUnwrappedCookies);
}

export async function createAsyncRouteClient() {
  return clientWithCookies(await cookies());
}
