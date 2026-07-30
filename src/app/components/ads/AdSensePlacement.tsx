"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { findRevenuePlacement } from "@/lib/revenueCenter";
import { useFeatureFlag } from "@/lib/hooks/useFeatureFlag";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

function consentAllowed(configuredConsent?: string) {
  if (configuredConsent === "enabled") return true;
  if (configuredConsent === "disabled" || configuredConsent === "pending") {
    return false;
  }
  return false;
}

export function AdSensePlacement({
  clientId,
  slot,
  environmentName,
  configuredConsent,
}: {
  clientId: string;
  slot: string;
  environmentName?: string;
  configuredConsent?: string;
}) {
  const pathname = usePathname();
  const placement = findRevenuePlacement(pathname);
  const [visible, setVisible] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const flag = useFeatureFlag({
    flagKey: placement?.flagKey || "revenue.ads.unavailable",
    moduleId: placement?.moduleId || "beastos",
    enabled: Boolean(placement),
  });
  const configured =
    environmentName === "production" &&
    /^ca-pub-\d+$/.test(clientId) &&
    /^\d+$/.test(slot) &&
    consentAllowed(configuredConsent);
  const enabled =
    Boolean(placement) && configured && !flag.loading && flag.visible && !blocked;

  useEffect(() => {
    if (!enabled || !container.current) {
      setVisible(false);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: "300px" }
    );
    observer.observe(container.current);
    return () => observer.disconnect();
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !visible) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      setBlocked(true);
    }
  }, [enabled, visible]);

  if (!enabled) return null;

  return (
    <div
      ref={container}
      className="mx-auto w-full max-w-5xl px-4 py-4 text-center"
      aria-label="Advertisement"
    >
      <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
        Advertisement
      </p>
      {visible ? (
        <>
          <Script
            id="beast-adsense"
            strategy="lazyOnload"
            async
            crossOrigin="anonymous"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`}
            onError={() => setBlocked(true)}
          />
          <ins
            className="adsbygoogle block min-h-[90px] w-full overflow-hidden"
            data-ad-client={clientId}
            data-ad-slot={slot}
            data-ad-format="auto"
            data-full-width-responsive="true"
            data-npa="1"
          />
        </>
      ) : (
        <div className="min-h-[90px]" aria-hidden="true" />
      )}
    </div>
  );
}
