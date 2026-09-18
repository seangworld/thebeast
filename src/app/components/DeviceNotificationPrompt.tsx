"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
export function DeviceNotificationPrompt() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [dismissKey, setDismissKey] = useState("");
  useEffect(() => {
    let active = true;
    let request = 0;
    async function refresh() {
      const current = ++request;
      try {
        const response = await fetch("/api/notifications/devices", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        if (!data.ownerId || !Array.isArray(data.devices)) return;
        const key = `beast:push-later:${data.ownerId}`;
        let dismissed = false;
        try { dismissed = localStorage.getItem(key) === "yes"; } catch {}
        if (active && current === request) {
          setDismissKey(key);
          setVisible(!dismissed && !data.devices.some((device: { enabled: boolean }) => device.enabled));
        }
      } catch {}
    }
    const onVisible = () => { if (document.visibilityState === "visible") void refresh(); };
    void refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [pathname]);
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
