"use client";

import {
  buildAnalyticsDispatch,
  classifyBeastRoute,
  normalizeAnalyticsConsent,
  type AnalyticsConsentState,
  type AnalyticsContext,
  type AnalyticsDispatch,
  type AnalyticsEnvironment,
  type AnalyticsEventName,
} from "./productAnalytics";

export const ANALYTICS_CONSENT_STORAGE_KEY =
  "seangworld.analytics.consent";
export const ANALYTICS_CONSENT_EVENT = "seangworld:analytics-consent";

let analyticsRuntime: {
  consentDefault: AnalyticsConsentState;
  environment: AnalyticsEnvironment;
  measurementId: string;
} = { consentDefault: "pending", environment: "development", measurementId: "" };

export function configureAnalyticsRuntime(config: typeof analyticsRuntime) {
  analyticsRuntime = config;
}

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function readAnalyticsConsent(
  configuredDefault: AnalyticsConsentState = "pending"
) {
  if (typeof window === "undefined") return configuredDefault;
  return normalizeAnalyticsConsent(
    window.localStorage.getItem(ANALYTICS_CONSENT_STORAGE_KEY) ||
      configuredDefault
  );
}

export function setAnalyticsConsent(consent: AnalyticsConsentState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, consent);
  window.gtag?.("consent", "update", {
    analytics_storage: consent === "enabled" ? "granted" : "denied",
  });
  window.dispatchEvent(
    new CustomEvent(ANALYTICS_CONSENT_EVENT, { detail: consent })
  );
}

export function subscribeToAnalyticsConsent(callback: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(ANALYTICS_CONSENT_EVENT, callback);
  return () =>
    window.removeEventListener(ANALYTICS_CONSENT_EVENT, callback);
}

export function dispatchAnalyticsEvent({
  event,
  context,
  properties,
  consent,
  environment,
  measurementId,
}: {
  event: AnalyticsEventName;
  context: AnalyticsContext;
  properties?: Record<string, unknown>;
  consent: AnalyticsConsentState;
  environment: AnalyticsEnvironment;
  measurementId: string;
}): AnalyticsDispatch | null {
  const dispatch = buildAnalyticsDispatch({
    event,
    context,
    properties,
    consent,
    environment,
    measurementId,
  });
  if (!dispatch || typeof window === "undefined" || !window.gtag) return dispatch;
  if (dispatch.event !== "page_viewed") window.gtag("event", dispatch.event, dispatch.properties);
  return dispatch;
}

export function trackBeastFunnelEvent(
  event: "beast_entry_selected" | "sign_in_selected" | "account_creation_selected" | "auth_initiated" | "account_created" | "login_completed",
  properties?: Record<string, unknown>
) {
  if (typeof window === "undefined") return null;
  return dispatchAnalyticsEvent({
    event,
    context: classifyBeastRoute(window.location.pathname),
    properties,
    consent: readAnalyticsConsent(analyticsRuntime.consentDefault),
    environment: analyticsRuntime.environment,
    measurementId: analyticsRuntime.measurementId,
  });
}

export function trackGuidedOnboardingEvent(
  event:
    | "onboarding_offered"
    | "onboarding_started"
    | "onboarding_completed"
    | "onboarding_skipped"
    | "onboarding_replayed"
    | "whats_new_started"
    | "whats_new_completed",
  properties: {
    action: string;
    category: "guided_tour" | "whats_new";
    status: "offered" | "started" | "completed" | "skipped" | "replayed";
  }
) {
  if (typeof window === "undefined") return null;
  return dispatchAnalyticsEvent({
    event,
    context: classifyBeastRoute(window.location.pathname),
    properties,
    consent: readAnalyticsConsent(analyticsRuntime.consentDefault),
    environment: analyticsRuntime.environment,
    measurementId: analyticsRuntime.measurementId,
  });
}
