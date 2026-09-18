"use client";
import Link from "next/link";
import { currentPushHash, supportsPush } from "@/lib/notifications/pushClient";
import { useEffect, useState } from "react";
export function DeviceNotificationPrompt() {
  const [visible, setVisible] = useState(false);
  const [dismissKey, setDismissKey] = useState("");
  useEffect(() => {
    let active = true;
    fetch("/api/notifications/devices", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return;
        const data = await response.json();
        const hash = supportsPush() ? await currentPushHash() : null;
        const key = `beast:push-later:${data.ownerId}`;
        let dismissed = false;
        try {
          dismissed = localStorage.getItem(key) === "yes";
        } catch {}
        if (active) {
          setDismissKey(key);
          setVisible(
            !dismissed &&
              !data.devices.some(
                (device: { enabled: boolean; endpoint_hash: string }) =>
                  device.enabled && device.endpoint_hash === hash,
              ),
          );
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  if (!visible) return null;
  return (
    <section
      className="rounded-xl border border-sky-300/30 bg-sky-300/5 p-4"
      aria-label="Enable device notifications"
    >
      <h2 className="font-bold text-white">Want reminders on your phone?</h2>
      <p className="mt-2 text-sm text-slate-300">
        Connect your device for bills due soon and new private messages. You
        choose what to receive.
      </p>
      <div className="mt-3 flex flex-wrap gap-3">
        <Link
          href="/dashboard/settings/notifications"
          className="beast-button-secondary"
        >
          Set up notifications
        </Link>
        <button
          type="button"
          className="text-sm text-slate-400"
          onClick={() => {
            try {
              localStorage.setItem(dismissKey, "yes");
            } catch {}
            setVisible(false);
          }}
        >
          Not now
        </button>
      </div>
    </section>
  );
}
