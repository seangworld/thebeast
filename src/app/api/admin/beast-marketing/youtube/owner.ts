import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";
export const youtubeJson = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
export async function youtubeOwner() {
  const client = createRouteClient();
  const auth = await client.auth.getUser();
  if (auth.error || !auth.data.user) return null;
  const profile = await client.from("profiles").select("role").eq("id", auth.data.user.id).maybeSingle();
  return !profile.error && profile.data?.role === "admin" ? { client, user: auth.data.user } : null;
}
