import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";
import { parseCompanyCost } from "@/lib/companyCosts";

export const dynamic = "force-dynamic";
const fields = "id,name,kind,amount_cents,interval_months,active,paid_on,notes";
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

async function ownerAccess() {
  const client = createRouteClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return { response: json({ error: "Authentication required." }, 401) };
  const profile = await client.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
  if (profile.error) return { response: json({ error: "Unable to verify CEO access." }, 503) };
  if (profile.data?.role !== "admin") return { response: json({ error: "CEO access required." }, 403) };
  return { client, ownerId: data.user.id };
}

export async function GET() {
  try {
    const access = await ownerAccess();
    if (access.response) return access.response;
    const result = await access.client!.from("beast_admin_company_costs").select(fields, { count: "exact" }).eq("owner_id", access.ownerId!).order("created_at", { ascending: false }).limit(1001);
    if (result.error || !result.data || result.count !== result.data.length || result.data.length > 1000) return json({ error: "Company costs are unavailable. Retry; no total has been inferred." }, 503);
    return json({ entries: result.data.map(parseCompanyCost) });
  } catch { return json({ error: "Company costs could not be loaded." }, 503); }
}

export async function POST(request: Request) {
  try {
    if (request.headers.get("origin") !== new URL(request.url).origin) return json({ error: "Same-origin request required." }, 403);
    const access = await ownerAccess();
    if (access.response) return access.response;
    const body = await request.text();
    if (body.length > 6000) return json({ error: "Entry too large." }, 413);
    let entry;
    try { entry = parseCompanyCost(JSON.parse(body)); }
    catch (error) { return json({ error: error instanceof Error ? error.message : "Invalid entry." }, 400); }
    const result = await access.client!.from("beast_admin_company_costs").upsert({ ...entry, owner_id: access.ownerId! }, { onConflict: "owner_id,id" }).select(fields).single();
    if (result.error || !result.data) return json({ error: "The cost was not saved. Your form is unchanged; please retry." }, 503);
    return json({ entry: parseCompanyCost(result.data) });
  } catch { return json({ error: "The cost was not saved. Please retry." }, 503); }
}
