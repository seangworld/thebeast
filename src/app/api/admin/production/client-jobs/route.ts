import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const fields = "id,client_name,project_name,job_type,status,audit_profile,attention_level,files_count,findings_count,critical_count,high_count,medium_count,input_bytes,artifact_name,created_at,archived_at";
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "cache-control": "private, no-store" } });

async function ownerAccess() {
  const client = createRouteClient(); const auth = await client.auth.getUser();
  if (!auth.data.user || auth.error) return null;
  const profile = await client.from("profiles").select("role").eq("id", auth.data.user.id).maybeSingle();
  return !profile.error && profile.data?.role === "admin" ? { client, id: auth.data.user.id } : null;
}

export async function GET() {
  const access = await ownerAccess(); if (!access) return json({ error: "SEANGWORLD HQ owner access required." }, 403);
  const result = await access.client.from("seangworld_client_jobs").select(fields).eq("owner_id", access.id).order("created_at", { ascending: false }).limit(100);
  if (result.error || !result.data) return json({ error: "Client work history is unavailable. Completed downloads are unaffected." }, 503);
  return json({ jobs: result.data });
}

export async function PATCH(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return json({ error: "Same-origin request required." }, 403);
  const access = await ownerAccess(); if (!access) return json({ error: "SEANGWORLD HQ owner access required." }, 403);
  const body = await request.json().catch(() => null) as { id?: string; action?: string } | null;
  if (!body?.id || !/^[0-9a-f-]{36}$/i.test(body.id) || body.action !== "archive") return json({ error: "Select a valid completed job to archive." }, 400);
  const result = await access.client.from("seangworld_client_jobs").update({ status: "archived", archived_at: new Date().toISOString() }).eq("id", body.id).eq("owner_id", access.id).eq("status", "completed").select(fields).maybeSingle();
  if (result.error || !result.data) return json({ error: "The client job was not archived. Refresh and retry." }, 409);
  return json({ job: result.data });
}
