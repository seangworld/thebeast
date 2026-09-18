import type { SupabaseClient } from "@supabase/supabase-js";
import { dueBillReminders, billPushMessage, zonedDay } from "./billReminders";
import { sendDevicePush } from "./pushServer";
import { resolveMemberModuleEntitlement } from "../memberAgeEntitlements";
import { getModuleRegistryEntry } from "../moduleRegistry";
export function isQuietHour(hour: number, start: number, end: number) {
  return start === end
    ? false
    : start < end
      ? hour >= start && hour < end
      : hour >= start || hour < end;
}
export async function dispatchDeviceReminders(
  client: SupabaseClient,
  config: { public_key: string; private_key: string },
  now = new Date(),
) {
  const devices = await client
    .from("beast_push_devices")
    .select("*")
    .eq("enabled", true)
    .order("last_checked_at", { ascending: true, nullsFirst: true })
    .limit(12);
  if (devices.error) throw devices.error;
  let sent = 0,
    failed = 0;
  async function deliver(
    device: Record<string, any>,
    eventKey: string,
    payload: Parameters<typeof sendDevicePush>[1],
  ) {
    const existing = await client
      .from("beast_push_deliveries")
      .select("id,state,attempts,retry_after")
      .eq("device_id", device.id)
      .eq("event_key", eventKey)
      .maybeSingle();
    if (existing.error) throw existing.error;
    if (existing.data?.state === "sent") return true;
    if (
      existing.data &&
      (existing.data.attempts >= 3 ||
        existing.data.retry_after > now.toISOString())
    )
      return false;
    const claim = existing.data
      ? await client
          .from("beast_push_deliveries")
          .update({
            state: "sending",
            attempts: existing.data.attempts + 1,
            retry_after: new Date(now.getTime() + 600000).toISOString(),
          })
          .eq("id", existing.data.id)
          .eq("attempts", existing.data.attempts)
          .neq("state", "sent")
          .select("id")
          .maybeSingle()
      : await client
          .from("beast_push_deliveries")
          .insert({
            device_id: device.id,
            event_key: eventKey,
            state: "sending",
          })
          .select("id")
          .maybeSingle();
    if (claim.error?.code === "23505") return false;
    if (claim.error) throw claim.error;
    if (!claim.data) return false;
    // Recheck opt-out immediately before delivery.
    const current = await client
      .from("beast_push_devices")
      .select("enabled,messages_enabled,updated_at")
      .eq("id", device.id)
      .single();
    if (
      current.error ||
      !current.data?.enabled ||
      current.data.updated_at !== device.updated_at ||
      (eventKey.startsWith("message:") && !current.data.messages_enabled)
    )
      return false;
    try {
      await sendDevicePush(device.subscription, payload, config);
      await client
        .from("beast_push_deliveries")
        .update({ state: "sent", error_category: null })
        .eq("id", claim.data.id);
      await client
        .from("beast_push_devices")
        .update({ last_sent_at: now.toISOString() })
        .eq("id", device.id);
      sent++;
      return true;
    } catch (cause) {
      const status = (cause as { statusCode?: number }).statusCode;
      await client
        .from("beast_push_deliveries")
        .update({
          state: "failed",
          error_category:
            status === 404 || status === 410 ? "expired" : "delivery_failed",
        })
        .eq("id", claim.data.id);
      if (status === 404 || status === 410)
        await client
          .from("beast_push_devices")
          .update({ enabled: false })
          .eq("id", device.id);
      failed++;
      return false;
    }
  }
  for (let index = 0; index < (devices.data || []).length; index += 4)
    await Promise.all(
      (devices.data || []).slice(index, index + 4).map(async (device) => {
        try {
          await client
            .from("beast_push_devices")
            .update({ last_checked_at: now.toISOString() })
            .eq("id", device.id);
          const local = zonedDay(now, device.time_zone);
          if (isQuietHour(local.hour, device.quiet_start, device.quiet_end))
            return;
          if (device.messages_enabled) {
            const messages = await client
              .from("beast_admin_message_notifications")
              .select("id,created_at,action_url")
              .eq("user_id", device.owner_id)
              .eq("state", "Unread")
              .gt("created_at", device.message_cursor)
              .order("created_at", { ascending: false })
              .limit(1);
            if (messages.error) throw messages.error;
            const message = messages.data?.[0];
            if (
              message &&
              (await deliver(device, `message:${message.id}`, {
                title: "New message in Beast",
                body: "You have a new private message. Open Beast to read it.",
                url:
                  message.action_url === "/dashboard/admin/messages"
                    ? message.action_url
                    : "/dashboard/messages",
                tag: `beast-message-${message.id}`,
              }))
            )
              await client
                .from("beast_push_devices")
                .update({ message_cursor: message.created_at })
                .eq("id", device.id);
          }
          if (
            local.hour < device.notify_hour ||
            (!device.due_today && !device.due_tomorrow)
          )
            return;
          const [profile, override] = await Promise.all([
            client
              .from("profiles")
              .select("role,birthday")
              .eq("id", device.owner_id)
              .single(),
            client
              .from("beast_admin_member_module_access")
              .select("enabled")
              .eq("member_id", device.owner_id)
              .eq("module_id", "money")
              .maybeSingle(),
          ]);
          if (profile.error || override.error || !profile.data) return;
          if (
            !resolveMemberModuleEntitlement({
              module: "money",
              birthday: profile.data.birthday,
              isAdmin: profile.data.role === "admin",
              entry: getModuleRegistryEntry("money"),
              override:
                typeof override.data?.enabled === "boolean"
                  ? override.data.enabled
                  : undefined,
            }).allowed
          )
            return;
          const [bills, payments] = await Promise.all([
            client
              .from("bill_events")
              .select(
                "id,name,amount,due_date,frequency,next_due_date_after_payment,is_archived,reminder_enabled",
              )
              .eq("user_id", device.owner_id)
              .eq("is_archived", false)
              .limit(1000),
            client
              .from("bill_payments")
              .select(
                "bill_id,cycle_due_date,amount_paid,resulting_next_due_date",
              )
              .eq("user_id", device.owner_id)
              .gte("cycle_due_date", `${local.date.slice(0, 7)}-01`)
              .limit(1000),
          ]);
          if (
            bills.error ||
            payments.error ||
            bills.data?.length === 1000 ||
            payments.data?.length === 1000
          )
            return;
          const items = dueBillReminders({
            today: local.date,
            bills: bills.data || [],
            payments: payments.data || [],
            dueToday: device.due_today,
            dueTomorrow: device.due_tomorrow,
          });
          if (items.length)
            await deliver(
              device,
              `bills:${local.date}`,
              billPushMessage(items, local.date, device.show_details),
            );
        } catch {
          failed++;
        }
      }),
    );
  await client
    .from("beast_push_config")
    .update({ last_run_at: now.toISOString() })
    .eq("id", true);
  await client
    .from("beast_push_deliveries")
    .delete()
    .lt("created_at", new Date(now.getTime() - 30 * 86400000).toISOString());
  return { checked: devices.data?.length || 0, sent, failed };
}
