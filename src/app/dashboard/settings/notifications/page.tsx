"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  applicationServerKey,
  currentPushHash,
  needsHomeScreen,
  stopLocalPush,
  supportsPush,
} from "@/lib/notifications/pushClient";
type Device = {
  id: string;
  endpoint_hash: string;
  label: string;
  enabled: boolean;
  due_today: boolean;
  due_tomorrow: boolean;
  messages_enabled: boolean;
  show_details: boolean;
  notify_hour: number;
  time_zone: string;
  quiet_start: number;
  quiet_end: number;
  last_sent_at: string | null;
};
type Preferences = Omit<Device, "id" | "endpoint_hash" | "last_sent_at">;
const initial: Preferences = {
  label: "My device",
  enabled: true,
  due_today: true,
  due_tomorrow: true,
  messages_enabled: true,
  show_details: false,
  notify_hour: 9,
  time_zone: "America/New_York",
  quiet_start: 22,
  quiet_end: 7,
};
export default function NotificationSettingsPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [prefs, setPrefs] = useState(initial);
  const [key, setKey] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [hash, setHash] = useState<string | null>(null);
  const [supported, setSupported] = useState(false);
  const [install, setInstall] = useState(false);
  const [permission, setPermission] = useState("default");
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [registrationReady, setRegistrationReady] = useState(false);
  const currentDevice = devices.find((device) => device.endpoint_hash === hash);
  const lock = useRef(false);
  const registration = useRef<ServiceWorkerRegistration | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/notifications/devices", {
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setDevices(data.devices);
      setKey(data.publicKey);
      setReady(data.schedulerReady);
      const currentHash = supportsPush() ? await currentPushHash() : null;
      setHash(currentHash);
      const connected = (data.devices as Device[]).find(
        (device) => device.endpoint_hash === currentHash,
      );
      setEditing(connected?.id ?? null);
      if (connected) setPrefs(connected);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not load devices.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    setSupported(supportsPush());
    setInstall(needsHomeScreen());
    setPermission(
      "Notification" in window ? Notification.permission : "unavailable",
    );
    setPrefs((current) => ({
      ...current,
      label: /iPhone/.test(navigator.userAgent) ? "My iPhone"
        : /iPad/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) ? "My iPad"
        : /Android/.test(navigator.userAgent) ? "My Android device"
        : /Mac/.test(navigator.platform) ? "My Mac" : "My computer",
      time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }));
    if (supportsPush())
      navigator.serviceWorker
        .register("/beast-push-sw.js", { scope: "/" })
        .then(() => navigator.serviceWorker.ready)
        .then((value) => {
          registration.current = value;
          setRegistrationReady(true);
        })
        .catch(() =>
          setError("Could not prepare notifications. Reload to try again."),
        );
    void load();
  }, [load]);
  async function action(body: Record<string, unknown>) {
    const response = await fetch("/api/notifications/devices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.error || "Notification request failed.");
    return data;
  }
  async function run(work: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setMessage("");
    setError("");
    try {
      await work();
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Please try again.");
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  async function enable() {
    if (!registration.current || !key || lock.current) return;
    // Invoke subscription directly from the user's gesture for Safari's permission requirement.
    const subscription = registration.current.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey(key),
    });
    await run(async () => {
      let sub: PushSubscription;
      try {
        sub = await subscription;
      } catch {
        setPermission(Notification.permission);
        throw new Error(
          "Notifications weren’t enabled. If blocked, allow them in your browser or device settings.",
        );
      }
      // Keep the browser subscription if saving fails: retry reuses its endpoint.
      // Unsubscribing here can leave a saved server record orphaned after a network failure.
      await action({
        action: "subscribe",
        subscription: sub.toJSON(),
        ...prefs,
      });
      setPermission(Notification.permission);
      setMessage("This device is connected. Send a test to check delivery.");
    });
  }
  function hourSelect(
    label: string,
    field: "notify_hour" | "quiet_start" | "quiet_end",
  ) {
    return (
      <label className="block text-sm text-slate-300">
        {label}
        <select
          className="beast-input mt-2"
          value={prefs[field]}
          onChange={(event) =>
            setPrefs({ ...prefs, [field]: Number(event.target.value) })
          }
        >
          {Array.from({ length: 24 }, (_, hour) => (
            <option key={hour} value={hour}>
              {String(hour).padStart(2, "0")}:00
            </option>
          ))}
        </select>
      </label>
    );
  }
  return (
    <main className="beast-page">
      <div className="beast-container max-w-4xl space-y-5">
        <header className="beast-page-header">
          <h1 className="beast-title">Notifications on your devices</h1>
          <p className="beast-subtitle">
            Get bill reminders and new-message alerts, even when Beast isn’t
            open.
          </p>
          <Link
            href="/dashboard/notifications"
            className="text-sky-300 underline"
          >
            Back to notifications
          </Link>
        </header>
        {error && (
          <p role="alert" className="rounded-xl bg-red-300/10 p-4 text-red-100">
            {error}
          </p>
        )}
        {message && (
          <p
            role="status"
            className="rounded-xl bg-emerald-300/10 p-4 text-emerald-100"
          >
            {message}
          </p>
        )}
        {loading && <p role="status">Loading notification settings…</p>}
        {!ready && !loading && (
          <p className="text-amber-100">
            Scheduled delivery is not active yet. You can connect a device and
            test it.
          </p>
        )}
        {install && (
          <section className="beast-card p-5">
            <h2 className="text-lg font-bold">On iPhone or iPad</h2>
            <p className="mt-2 text-slate-300">
              Open Beast in Safari, tap Share, choose Add to Home Screen, and
              open Beast from that icon. Then return here and enable
              notifications.
            </p>
          </section>
        )}
        {!supported && !install && (
          <p className="text-slate-300">
            This browser doesn’t support device notifications. You can still use
            the Notification Center.
          </p>
        )}
        {permission === "denied" && (
          <p className="text-amber-100">
            Notifications are blocked for Beast. Change the permission in your
            browser or device settings, then reload this page.
          </p>
        )}
        {currentDevice && (
          <section className="beast-card space-y-3 p-5" aria-label="This device status">
            <h2 className="text-lg font-bold">
              {permission === "denied" ? "Notifications blocked on this device" : currentDevice.enabled ? "Notifications are on for this device" : "Notifications are paused on this device"}
            </h2>
            <p className="text-slate-300">{currentDevice.label} is connected to your account. Your saved preferences are shown below.</p>
            <button type="button" className="beast-button-secondary" disabled={busy || !currentDevice.enabled || permission === "denied"}
              onClick={() => void run(async () => {
                const result = await action({ action: "test", id: currentDevice.id });
                setMessage(result.message);
              })}>Send a test to this device</button>
          </section>
        )}
        <form
          className="beast-card space-y-4 p-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (editing)
              void run(async () => {
                await action({ action: "update", id: editing, ...prefs });
                setEditing(null);
                setMessage("Device settings saved.");
              });
            else void enable();
          }}
        >
          <h2 className="text-lg font-bold">
            {editing ? "Notification preferences" : "Enable notifications on this device"}
          </h2>
          <fieldset disabled={busy || loading} className="space-y-4">
            {!editing && <p className="text-slate-300">Tap Enable notifications, then Allow when your device asks. We’ll remember this device for you.</p>}
            <details open={editing ? true : undefined}>
              <summary className="cursor-pointer text-sky-300">Customize notifications</summary>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm text-slate-300">
                Device name
                <input
                  className="beast-input mt-2"
                  maxLength={80}
                  required
                  value={prefs.label}
                  onChange={(e) =>
                    setPrefs({ ...prefs, label: e.target.value })
                  }
                />
              </label>
              <label className="text-sm text-slate-300">
                Timezone
                <input
                  className="beast-input mt-2"
                  required
                  value={prefs.time_zone}
                  onChange={(e) =>
                    setPrefs({ ...prefs, time_zone: e.target.value })
                  }
                />
              </label>
            </div>
            {(
              [
                ["due_tomorrow", "Bills due tomorrow"],
                ["due_today", "Bills due today"],
                ["messages_enabled", "New private messages"],
                [
                  "show_details",
                  "Show bill names and amounts on my lock screen",
                ],
              ] as const
            ).map(([field, label]) => (
              <label
                key={field}
                className="flex items-center gap-3 text-sm text-slate-200"
              >
                <input
                  type="checkbox"
                  checked={prefs[field]}
                  onChange={(e) =>
                    setPrefs({ ...prefs, [field]: e.target.checked })
                  }
                />
                {label}
              </label>
            ))}
            <div className="grid gap-4 sm:grid-cols-3">
              {hourSelect("Bill reminder hour", "notify_hour")}
              {hourSelect("Quiet hours start", "quiet_start")}
              {hourSelect("Quiet hours end", "quiet_end")}
            </div>
            <p className="text-sm text-slate-400">
              Reminders are checked about every five minutes and delivered after
              your chosen hour, outside quiet hours. Equal quiet-hour times turn
              quiet hours off. Your device’s Focus settings can delay or silence
              alerts. Messages never show their contents here.
            </p>
            <p className="text-sm text-slate-400">
              Bills marked paid in Beast are excluded. Bank payments must be
              recorded in Beast to stop those reminders.
            </p>
            {editing && (
              <label className="flex gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={prefs.enabled}
                  onChange={(e) =>
                    setPrefs({ ...prefs, enabled: e.target.checked })
                  }
                />
                Notifications enabled for this device
              </label>
            )}
            </details>
            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                className="beast-button"
                disabled={
                  busy ||
                  loading ||
                  (!editing &&
                    (!supported ||
                      install ||
                      permission === "denied" ||
                      !key ||
                      !registrationReady))
                }
              >
                {busy
                  ? "Working…"
                  : editing
                    ? "Save device settings"
                    : "Enable notifications"}
              </button>
              {editing && editing !== currentDevice?.id && (
                <button
                  type="button"
                  className="beast-button-secondary"
                  onClick={() => {
                    setEditing(currentDevice?.id ?? null);
                    setPrefs(currentDevice ?? {
                      ...initial,
                      time_zone:
                        Intl.DateTimeFormat().resolvedOptions().timeZone,
                    });
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </fieldset>
        </form>
        <details className="space-y-3">
          <summary className="cursor-pointer text-lg font-bold">Manage devices ({devices.length})</summary>
          <p className="text-sm text-slate-300">Each card is a separate browser or app installation. Send a test to the named device from here, including your phone. Matching names do not necessarily mean duplicate devices.</p>
          {!loading && !devices.length && (
            <p className="text-slate-400">No devices connected yet.</p>
          )}
          {devices.map((device) => (
            <article key={device.id} className="beast-card space-y-3 p-4">
              <h3 className="font-bold">
                {device.label}
                {hash === device.endpoint_hash ? " · This device" : ""}
              </h3>
              <p className="text-sm text-slate-400">
                {device.enabled ? "Enabled" : "Paused"} · {device.time_zone}
                {device.last_sent_at
                  ? ` · Last sent ${new Date(device.last_sent_at).toLocaleString()}`
                  : ""}
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={busy}
                  className="beast-button-secondary"
                  onClick={() => {
                    setEditing(device.id);
                    setPrefs(device);
                    setMessage("");
                  }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  disabled={busy || !device.enabled}
                  className="beast-button-secondary"
                  onClick={() =>
                    void run(async () => {
                      const result = await action({
                        action: "test",
                        id: device.id,
                      });
                      setMessage(result.message);
                    })
                  }
                >
                  Send test to {device.label}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  className="beast-button-secondary"
                  onClick={() =>
                    void run(async () => {
                      await action({
                        ...device,
                        action: "update",
                        enabled: !device.enabled,
                      });
                      setMessage(
                        device.enabled ? "Device paused." : "Device enabled.",
                      );
                    })
                  }
                >
                  {device.enabled ? "Pause" : "Enable"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  className="beast-button-secondary"
                  onClick={() =>
                    void run(async () => {
                      await action({ action: "remove", id: device.id });
                      if (hash === device.endpoint_hash) await stopLocalPush();
                      if (editing === device.id) setEditing(null);
                      setMessage(
                        "Device removed. You can connect it again whenever you like.",
                      );
                    })
                  }
                >
                  Remove
                </button>
              </div>
            </article>
          ))}
        </details>
      </div>
    </main>
  );
}
