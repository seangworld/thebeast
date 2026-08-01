import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";

export function googleOAuthError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function requireGoogleOAuthOwner() {
  const client = createRouteClient();
  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser();
  if (authError || !user) {
    return { error: googleOAuthError("Authentication required.", 401) } as const;
  }
  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) {
    return {
      error: googleOAuthError(
        "Revenue Center could not verify owner access.",
        503
      ),
    } as const;
  }
  if (profile?.role !== "admin") {
    return {
      error: googleOAuthError("BeastAdmin owner access required.", 403),
    } as const;
  }
  return { client, user } as const;
}
