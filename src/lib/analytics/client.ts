"use client";

import {
  buildAnalyticsDispatch,
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
  window.gtag("event", dispatch.event, dispatch.properties);
  return dispatch;
}
