import { createHash, ECDH } from "node:crypto";
export function validatePushSubscription(value: unknown) {
  if (!value || typeof value !== "object")
    throw new Error("Invalid device subscription.");
  const item = value as {
    endpoint?: unknown;
    keys?: { p256dh?: unknown; auth?: unknown };
  };
  if (typeof item.endpoint !== "string" || item.endpoint.length > 2048)
    throw new Error("Invalid device endpoint.");
  const url = new URL(item.endpoint);
  const allowed =
    [
      "fcm.googleapis.com",
      "updates.push.services.mozilla.com",
      "web.push.apple.com",
    ].includes(url.hostname) || url.hostname.endsWith(".notify.windows.com");
  if (
    !allowed ||
    url.protocol !== "https:" ||
    url.port ||
    url.username ||
    url.password ||
    url.hash
  )
    throw new Error("This push provider is not supported.");
  const p256dh = item.keys?.p256dh;
  const auth = item.keys?.auth;
  if (
    typeof p256dh !== "string" ||
    typeof auth !== "string" ||
    !/^[\w-]+$/.test(p256dh) ||
    !/^[\w-]+$/.test(auth) ||
    Buffer.from(p256dh, "base64url").length !== 65 ||
    Buffer.from(auth, "base64url").length !== 16
  )
    throw new Error("Invalid device encryption keys.");
  ECDH.convertKey(Buffer.from(p256dh, "base64url"), "prime256v1");
  return { endpoint: item.endpoint, keys: { p256dh, auth } };
}
export function endpointHash(endpoint: string) {
  return createHash("sha256").update(endpoint).digest("hex");
}
export function devicePreferences(value: Record<string, unknown>) {
  const label =
    typeof value.label === "string" ? value.label.trim() : "My device";
  if (!label || label.length > 80)
    throw new Error("Use a device name of 1–80 characters.");
  if (
    !Number.isInteger(value.notify_hour) ||
    Number(value.notify_hour) < 0 ||
    Number(value.notify_hour) > 23
  )
    throw new Error("Choose a reminder hour.");
  if (typeof value.time_zone !== "string" || value.time_zone.length > 100)
    throw new Error("Choose a timezone.");
  new Intl.DateTimeFormat("en", { timeZone: value.time_zone }).format();
  for (const key of [
    "due_today",
    "due_tomorrow",
    "show_details",
    "messages_enabled",
  ])
    if (typeof value[key] !== "boolean")
      throw new Error("Choose your reminder settings.");
  for (const key of ["quiet_start", "quiet_end"])
    if (
      !Number.isInteger(value[key]) ||
      Number(value[key]) < 0 ||
      Number(value[key]) > 23
    )
      throw new Error("Choose valid quiet hours.");
  return {
    messages_enabled: value.messages_enabled as boolean,
    quiet_start: Number(value.quiet_start),
    quiet_end: Number(value.quiet_end),
    label,
    notify_hour: Number(value.notify_hour),
    time_zone: value.time_zone,
    due_today: value.due_today as boolean,
    due_tomorrow: value.due_tomorrow as boolean,
    show_details: value.show_details as boolean,
  };
}
