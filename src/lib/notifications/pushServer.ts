import webpush from "web-push";
import { createBeastFusionPublicationClient } from "../supabase/service";
import { validatePushSubscription } from "./pushValidation";
export const devicePublicColumns =
  "id,endpoint_hash,label,enabled,messages_enabled,quiet_start,quiet_end,due_today,due_tomorrow,show_details,notify_hour,time_zone,last_sent_at,created_at";
export async function pushConfiguration() {
  const client = createBeastFusionPublicationClient();
  let result = await client
    .from("beast_push_config")
    .select("*")
    .eq("id", true)
    .single();
  if (result.error || !result.data)
    throw new Error("Device notifications are not configured.");
  if (!result.data.public_key) {
    const keys = webpush.generateVAPIDKeys();
    const update = await client
      .from("beast_push_config")
      .update({ public_key: keys.publicKey, private_key: keys.privateKey })
      .eq("id", true)
      .is("public_key", null);
    if (update.error)
      throw new Error("Device notifications are not configured.");
    result = await client
      .from("beast_push_config")
      .select("*")
      .eq("id", true)
      .single();
  }
  if (result.error || !result.data?.private_key)
    throw new Error("Device notifications are not configured.");
  return { client, config: result.data };
}
export async function sendDevicePush(
  subscription: unknown,
  payload: { title: string; body: string; url: string; tag: string },
  config: { public_key: string; private_key: string },
) {
  return webpush.sendNotification(
    validatePushSubscription(subscription),
    JSON.stringify(payload),
    {
      vapidDetails: {
        subject: "https://thebeast.seangworld.com",
        publicKey: config.public_key,
        privateKey: config.private_key,
      },
      TTL: 3600,
      urgency: "normal",
      timeout: 8000,
    },
  );
}
