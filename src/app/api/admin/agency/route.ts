import { createBeastFusionPublicationClient } from "@/lib/supabase/service";
import { socialOwner, socialJson } from "@/lib/server/social/auth";
import { isUuid } from "@/lib/marketingSocial";
import { agencyChannels, buildAgencySnapshot, isAvailableAgencyConnection, type AgencyProfile, type AgencyConnection, type AgencyBinding } from "@/lib/agencyPreparation";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const owner = await socialOwner();
  if (!owner) return socialJson({ error: "Owner access required." }, 403);
  try {
    const db = createBeastFusionPublicationClient();
    const [profiles, connections, bindings] = await Promise.all([
      owner.client.from("beast_marketing_presenter_profiles").select("id,owner_id,name,presenter_type,active,allowed_topics,provenance").eq("owner_id", owner.id).eq("presenter_type", "future_character").order("created_at"),
      db.from("beast_marketing_social_connections").select("id,owner_id,channel,account_id,label,connected_at,expires_at,disconnected_at").eq("owner_id", owner.id),
      db.from("beast_marketing_agency_bindings").select("owner_id,presenter_profile_id,connection_id,channel").eq("owner_id", owner.id),
    ]);
    if ([profiles, connections, bindings].some(result => result.error)) return socialJson({ error: "Agency setup data is unavailable. Verify the approved database setup; no metrics have been inferred." }, 503);
    return socialJson(buildAgencySnapshot({ ownerId: owner.id, profiles: profiles.data as AgencyProfile[], connections: connections.data as AgencyConnection[], bindings: bindings.data as AgencyBinding[], now: new Date().toISOString() }));
  } catch { return socialJson({ error: "Agency setup is unavailable." }, 503); }
}

// Binds already connected accounts. Does not initiate OAuth, grant access, or authorize posting.
export async function POST(request: Request) {
  const owner = await socialOwner(request);
  if (!owner) return socialJson({ error: "Owner access required." }, 403);
  const body = await request.json().catch(() => null);
  if (body?.action !== "bind" || !isUuid(body.presenterProfileId) || !isUuid(body.connectionId) || !agencyChannels.includes(body.channel)) return socialJson({ error: "Choose a saved character, channel, and connected account." }, 400);
  try {
    const db = createBeastFusionPublicationClient();
    const [profile, connection] = await Promise.all([
      owner.client.from("beast_marketing_presenter_profiles").select("id").eq("owner_id", owner.id).eq("id", body.presenterProfileId).eq("presenter_type", "future_character").maybeSingle(),
      db.from("beast_marketing_social_connections").select("id,owner_id,channel,account_id,label,connected_at,expires_at,disconnected_at").eq("owner_id", owner.id).eq("id", body.connectionId).eq("channel", body.channel).is("disconnected_at", null).maybeSingle(),
    ]);
    if (profile.error || connection.error) return socialJson({ error: "Account binding could not be verified." }, 503);
    if (!profile.data || !connection.data) return socialJson({ error: "Choose an owned character and active account for this channel." }, 409);
    if (!isAvailableAgencyConnection(connection.data as AgencyConnection, new Date().toISOString())) return socialJson({ error: "Reconnect this unavailable or expired account first." }, 409);
    // Insert only: changing an existing mapping needs an explicit future review flow.
    // PK/unique constraints reject repeated or cross-talent binding atomically.
    const saved = await db.from("beast_marketing_agency_bindings").insert({ owner_id: owner.id, presenter_profile_id: body.presenterProfileId, connection_id: body.connectionId, channel: body.channel });
    if (saved.error) return socialJson({ error: "Binding was not created. It may already exist or this account may belong to another character. Refresh before retrying." }, 409);
    return socialJson({ saved: true, publishingAuthorized: false }, 201);
  } catch { return socialJson({ error: "Agency account binding is unavailable." }, 503); }
}
