import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";
import {
  pushConfiguration,
  devicePublicColumns,
  sendDevicePush,
} from "@/lib/notifications/pushServer";
import {
  devicePreferences,
  endpointHash,
  validatePushSubscription,
} from "@/lib/notifications/pushValidation";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };
const response = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers });
async function member() {
  const client = createRouteClient();
  const auth = await client.auth.getUser();
  return auth.error ? null : auth.data.user;
}
export async function GET() {
  try {
    const user = await member();
    if (!user)
      return response(
        { error: "Sign in to manage device notifications." },
        401,
      );
    const { client, config } = await pushConfiguration();
    const devices = await client
      .from("beast_push_devices")
      .select(devicePublicColumns)
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });
    if (devices.error) throw devices.error;
    return response({
      ownerId: user.id,
      publicKey: config.public_key,
      schedulerReady: config.enabled,
      devices: devices.data,
    });
  } catch {
    return response(
      { error: "Device notifications are temporarily unavailable." },
      503,
    );
  }
}
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return response(
      { error: "Open notification settings in Beast to continue." },
      403,
    );
  try {
    const user = await member();
    if (!user)
      return response(
        { error: "Sign in to manage device notifications." },
        401,
      );
    const text = await request.text();
    if (text.length > 12000)
      return response({ error: "Request too large." }, 413);
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(text);
    } catch {
      return response({ error: "Invalid request." }, 400);
    }
    if (!body || typeof body !== "object")
      return response({ error: "Invalid request." }, 400);
    const { client, config } = await pushConfiguration();
    if (body.action === "subscribe") {
      let subscription;
      let preferences;
      try {
        subscription = validatePushSubscription(body.subscription);
        preferences = devicePreferences(body);
      } catch {
        return response(
          {
            error:
              "Check the device settings and try again. This browser may not support notifications.",
          },
          400,
        );
      }
      const hash = endpointHash(subscription.endpoint);
      const existing = await client
        .from("beast_push_devices")
        .select("id,owner_id")
        .eq("endpoint_hash", hash)
        .maybeSingle();
      if (existing.error) throw existing.error;
      if (existing.data && existing.data.owner_id !== user.id)
        return response(
          {
            error:
              "This browser was registered to another account. Reset this device’s subscription and enable it again.",
          },
          409,
        );
      const count = await client
        .from("beast_push_devices")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id);
      if (count.error) throw count.error;
      if (!existing.data && (count.count || 0) >= 10)
        return response(
          {
            error:
              "Remove an old device before adding another. Up to ten devices are supported.",
          },
          409,
        );
      const payload = {
        ...preferences,
        subscription,
        enabled: true,
        updated_at: new Date().toISOString(),
        message_cursor: new Date().toISOString(),
      };
      const saved = existing.data
        ? await client
            .from("beast_push_devices")
            .update(payload)
            .eq("id", existing.data.id)
            .eq("owner_id", user.id)
            .select(devicePublicColumns)
            .single()
        : await client
            .from("beast_push_devices")
            .insert({ ...payload, owner_id: user.id, endpoint_hash: hash })
            .select(devicePublicColumns)
            .single();
      if (saved.error) throw saved.error;
      return response({ device: saved.data });
    }
    if (typeof body.id !== "string" || !/^[0-9a-f-]{36}$/i.test(body.id))
      return response({ error: "Choose a device." }, 400);
    const device = await client
      .from("beast_push_devices")
      .select("*")
      .eq("id", body.id)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (device.error) throw device.error;
    if (!device.data) return response({ error: "Device not found." }, 404);
    if (body.action === "remove") {
      const removed = await client
        .from("beast_push_devices")
        .delete()
        .eq("id", body.id)
        .eq("owner_id", user.id);
      if (removed.error) throw removed.error;
      return response({ ok: true });
    }
    if (body.action === "update") {
      let prefs;
      try {
        prefs = devicePreferences(body);
      } catch {
        return response({ error: "Check the notification settings." }, 400);
      }
      if (typeof body.enabled !== "boolean")
        return response({ error: "Choose enabled or paused." }, 400);
      const saved = await client
        .from("beast_push_devices")
        .update({
          ...prefs,
          enabled: body.enabled,
          updated_at: new Date().toISOString(),
          ...(body.enabled &&
          (!device.data.enabled ||
            (!device.data.messages_enabled && prefs.messages_enabled))
            ? { message_cursor: new Date().toISOString() }
            : {}),
        })
        .eq("id", body.id)
        .eq("owner_id", user.id)
        .select(devicePublicColumns)
        .single();
      if (saved.error) throw saved.error;
      return response({ device: saved.data });
    }
    if (body.action === "test") {
      if (!device.data.enabled)
        return response({ error: "Enable this device first." }, 409);
      const cutoff = new Date(Date.now() - 60000).toISOString();
      const claimed = await client
        .from("beast_push_devices")
        .update({ last_test_at: new Date().toISOString() })
        .eq("id", body.id)
        .eq("owner_id", user.id)
        .or(`last_test_at.is.null,last_test_at.lt.${cutoff}`)
        .select("id");
      if (claimed.error) throw claimed.error;
      if (!claimed.data?.length)
        return response(
          { error: "Wait a minute before sending another test." },
          429,
        );
      try {
        await sendDevicePush(
          device.data.subscription,
          {
            title: "Beast notifications",
            body: "Your device is connected. Bill and message alerts can appear here.",
            url: "/dashboard/notifications",
            tag: "beast-test",
          },
          config,
        );
      } catch (cause) {
        const status = (cause as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410)
          await client
            .from("beast_push_devices")
            .update({ enabled: false })
            .eq("id", body.id)
            .eq("owner_id", user.id);
        return response(
          {
            error:
              "The test could not be sent. Check device permissions and reconnect this device.",
          },
          502,
        );
      }
      return response({
        ok: true,
        message:
          "Test accepted by the notification service. Check your device to confirm it appeared.",
      });
    }
    return response({ error: "Unknown action." }, 400);
  } catch {
    return response(
      { error: "We couldn’t save the device settings. Please try again." },
      503,
    );
  }
}
