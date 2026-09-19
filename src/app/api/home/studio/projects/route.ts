import { NextResponse } from "next/server";
import { normalizeHomeStudioSavedProject } from "@/lib/homeStudio";
import { requireMemberModuleEntitlement } from "@/lib/memberAgeServer";
import { createRouteClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const headers = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
};
const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers });
const projectColumns = "id,name,project,plan,source_photo_count,created_at,updated_at";
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function access() {
  const supabase = createRouteClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: reply({ error: "Authentication required." }, 401) } as const;
  const entitlement = await requireMemberModuleEntitlement("home", { supabase, user });
  if (!entitlement.ok) {
    return {
      error: reply(
        { error: entitlement.status === 428 ? "Complete your birthday before using BeastHome." : "BeastHome is available to eligible adult members." },
        entitlement.status,
      ),
    } as const;
  }
  return { supabase, user } as const;
}

function publicProject(row: Record<string, unknown>) {
  return {
    id: row.id,
    project: row.project,
    plan: row.plan,
    sourcePhotoCount: row.source_photo_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function GET() {
  const authorized = await access();
  if ("error" in authorized) return authorized.error;
  const result = await authorized.supabase
    .from("beast_home_studio_projects")
    .select(projectColumns)
    .eq("owner_id", authorized.user.id)
    .order("updated_at", { ascending: false })
    .limit(30);
  if (result.error) return reply({ error: "Saved Home Studio projects are temporarily unavailable." }, 503);
  return reply({ projects: (result.data || []).map((row) => publicProject(row as Record<string, unknown>)) });
}

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return reply({ error: "Open Home Studio in BeastHome to continue." }, 403);
  }
  const authorized = await access();
  if ("error" in authorized) return authorized.error;
  const text = await request.text();
  if (text.length > 100_000) return reply({ error: "Project data is too large." }, 413);
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(text) as Record<string, unknown>;
  } catch {
    return reply({ error: "Invalid project request." }, 400);
  }

  const id = typeof body.id === "string" && uuidPattern.test(body.id) ? body.id : "";
  if (body.action === "delete") {
    if (!id) return reply({ error: "Choose a saved project." }, 400);
    const removed = await authorized.supabase
      .from("beast_home_studio_projects")
      .delete()
      .eq("id", id)
      .eq("owner_id", authorized.user.id)
      .select("id")
      .maybeSingle();
    if (removed.error) return reply({ error: "The project could not be deleted." }, 503);
    if (!removed.data) return reply({ error: "Saved project not found." }, 404);
    return reply({ ok: true });
  }

  if (body.action !== "save") return reply({ error: "Choose a supported project action." }, 400);
  const normalized = normalizeHomeStudioSavedProject(body);
  if (!normalized) return reply({ error: "Add a valid project name, room type, style, and project plan." }, 400);
  const sourcePhotoCount = typeof body.sourcePhotoCount === "number"
    ? Math.max(0, Math.min(4, Math.floor(body.sourcePhotoCount)))
    : 0;
  const payload = {
    name: normalized.project.roomName,
    project: normalized.project,
    plan: normalized.plan,
    source_photo_count: sourcePhotoCount,
    schema_version: 1,
  };

  if (id) {
    const saved = await authorized.supabase
      .from("beast_home_studio_projects")
      .update(payload)
      .eq("id", id)
      .eq("owner_id", authorized.user.id)
      .select(projectColumns)
      .maybeSingle();
    if (saved.error) return reply({ error: "The project could not be updated." }, 503);
    if (!saved.data) return reply({ error: "Saved project not found." }, 404);
    return reply({ project: publicProject(saved.data as Record<string, unknown>) });
  }

  const count = await authorized.supabase
    .from("beast_home_studio_projects")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", authorized.user.id);
  if (count.error) return reply({ error: "The project could not be saved." }, 503);
  if ((count.count || 0) >= 30) return reply({ error: "Delete an older project before saving another. Home Studio supports up to 30 saved projects." }, 409);
  const saved = await authorized.supabase
    .from("beast_home_studio_projects")
    .insert({ ...payload, owner_id: authorized.user.id })
    .select(projectColumns)
    .single();
  if (saved.error) return reply({ error: "The project could not be saved." }, 503);
  return reply({ project: publicProject(saved.data as Record<string, unknown>) }, 201);
}
