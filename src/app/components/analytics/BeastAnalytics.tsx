"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import {
  dispatchAnalyticsEvent,
  readAnalyticsConsent,
  subscribeToAnalyticsConsent,
} from "@/lib/analytics/client";
import {
  analyticsPerformanceBucket,
  classifyBeastRoute,
  createPageViewDeduplicator,
  normalizeAnalyticsConsent,
  normalizeAnalyticsEnvironment,
  type AnalyticsConsentState,
  type AnalyticsEventName,
} from "@/lib/analytics/productAnalytics";

const pageViews = createPageViewDeduplicator();
const supportedClickEvents = new Set<AnalyticsEventName>([
  "navigation_selected",
  "call_to_action_selected",
  "beast_entry_selected",
  "sign_in_selected",
  "account_creation_selected",
  "auth_initiated",
  "conversation_created",
  "conversation_resumed",
  "recommendation_accepted",
  "recommendation_deferred",
  "recommendation_dismissed",
  "knowledge_area_selected",
  "missing_information_flow_started",
  "search_performed",
  "search_succeeded",
  "search_no_results",
]);

export function BeastAnalytics({
  measurementId,
  environmentName,
  configuredConsent,
}: {
  measurementId: string;
  environmentName?: string;
  configuredConsent?: string;
}) {
  const pathname = usePathname();
  const environment = useMemo(
    () => normalizeAnalyticsEnvironment(environmentName),
    [environmentName]
  );
  const consentDefault = normalizeAnalyticsConsent(configuredConsent);
  const readConsentSnapshot = useCallback(
    () => readAnalyticsConsent(consentDefault),
    [consentDefault]
  );
  const readServerConsentSnapshot = useCallback(
    () => consentDefault,
    [consentDefault]
  );
  const consent = useSyncExternalStore(
    subscribeToAnalyticsConsent,
    readConsentSnapshot,
    readServerConsentSnapshot
  ) as AnalyticsConsentState;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!ready || !pageViews.shouldTrack(pathname)) return;
    const context = classifyBeastRoute(pathname);
    if (!window.sessionStorage.getItem("seangworld.analytics.session_started")) {
      dispatchAnalyticsEvent({
        event: "session_started",
        context,
        consent,
        environment,
        measurementId,
      });
      window.sessionStorage.setItem(
        "seangworld.analytics.session_started",
        "true"
      );
    }
    dispatchAnalyticsEvent({
      event: "page_viewed",
      context,
      properties: { source: "client_navigation" },
      consent,
      environment,
      measurementId,
    });
    dispatchAnalyticsEvent({
      event: context.professionalId
        ? "professional_opened"
        : context.workspaceId
          ? "workspace_viewed"
          : "module_opened",
      context,
      consent,
      environment,
      measurementId,
    });
  }, [consent, environment, measurementId, pathname, ready]);

  useEffect(() => {
    if (!ready) return;
    const trackApprovedInteraction = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const control = target.closest<HTMLElement>("[data-analytics-event]");
      if (!control) return;
      const eventName = control?.dataset.analyticsEvent as
        | AnalyticsEventName
        | undefined;
      if (!eventName || !supportedClickEvents.has(eventName)) return;
      const properties = {
        action: control.dataset.analyticsAction,
        category: control.dataset.analyticsCategory,
        result: control.dataset.analyticsResult,
        status: control.dataset.analyticsStatus,
        destination: control.dataset.analyticsDestination,
      };
      dispatchAnalyticsEvent({
        event: eventName,
        context: classifyBeastRoute(window.location.pathname),
        properties,
        consent,
        environment,
        measurementId,
      });
      if (
        eventName === "search_performed" &&
        (properties.result === "success" ||
          properties.result === "no_results")
      ) {
        dispatchAnalyticsEvent({
          event:
            properties.result === "success"
              ? "search_succeeded"
              : "search_no_results",
          context: classifyBeastRoute(window.location.pathname),
          properties: { result: properties.result },
          consent,
          environment,
          measurementId,
        });
      }
    };
    document.addEventListener("click", trackApprovedInteraction);
    document.addEventListener("submit", trackApprovedInteraction);
    return () => {
      document.removeEventListener("click", trackApprovedInteraction);
      document.removeEventListener("submit", trackApprovedInteraction);
    };
  }, [consent, environment, measurementId, ready]);

  useEffect(() => {
    if (!ready || !("PerformanceObserver" in window)) return;
    let reported = false;
    const observer = new PerformanceObserver((entries) => {
      const latest = entries.getEntries().at(-1);
      if (!latest || latest.startTime < 3000 || reported) return;
      reported = true;
      dispatchAnalyticsEvent({
        event: "performance_issue",
        context: classifyBeastRoute(window.location.pathname),
        properties: {
          performance_bucket: analyticsPerformanceBucket(latest.startTime),
        },
        consent,
        environment,
        measurementId,
      });
    });
    try {
      observer.observe({ type: "largest-contentful-paint", buffered: true });
    } catch {
      observer.disconnect();
    }
    return () => observer.disconnect();
  }, [consent, environment, measurementId, ready]);

  useEffect(() => {
    if (!ready) return;
    const trackError = () => {
      dispatchAnalyticsEvent({
        event: "error_encountered",
        context: classifyBeastRoute(window.location.pathname),
        properties: { error_category: "unknown" },
        consent,
        environment,
        measurementId,
      });
    };
    window.addEventListener("error", trackError);
    return () => window.removeEventListener("error", trackError);
  }, [consent, environment, measurementId, ready]);

  if (
    consent !== "enabled" ||
    environment !== "production" ||
    !/^G-[A-Z0-9]{6,20}$/.test(measurementId)
  ) {
    return null;
  }

  return (
    <Script
      id="beast-ga4-loader"
      src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
      strategy="afterInteractive"
      onLoad={() => {
        window.dataLayer = window.dataLayer || [];
        window.gtag = (...args: unknown[]) => {
          window.dataLayer?.push(args);
        };
        window.gtag("consent", "default", {
          analytics_storage: "granted",
          ad_storage: "denied",
          ad_user_data: "denied",
          ad_personalization: "denied",
        });
        window.gtag("js", new Date());
        window.gtag("config", measurementId, {
          send_page_view: false,
          allow_google_signals: false,
          allow_ad_personalization_signals: false,
        });
        setReady(true);
      }}
    />
  );
}
