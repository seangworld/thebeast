"use client";

import { useEffect, useState } from "react";
import { getCurrentUserProfile } from "@/lib/profile";
import {
  ADMIN_VIEW_MODE_EVENT,
  ADMIN_VIEW_MODE_STORAGE_KEY,
  hasEntitlement,
  isAdminViewSimulationActive,
  normalizeAdminViewMode,
  resolveEffectiveEntitlementContext,
  resolveEntitlementContext,
  type AdminViewMode,
  type EntitlementContext,
  type EntitlementFeature,
} from "@/lib/entitlements";
import type { Profile } from "@/lib/types/database";

function loadStoredAdminViewMode() {
  if (typeof window === "undefined") return "admin" as AdminViewMode;

  return normalizeAdminViewMode(
    window.localStorage.getItem(ADMIN_VIEW_MODE_STORAGE_KEY)
  );
}

export function useEntitlements() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminViewMode, setAdminViewModeState] = useState<AdminViewMode>(
    loadStoredAdminViewMode
  );

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      try {
        const currentProfile = await getCurrentUserProfile();
        if (isMounted) {
          setProfile(currentProfile);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    function syncAdminViewMode() {
      setAdminViewModeState(loadStoredAdminViewMode());
    }

    window.addEventListener("storage", syncAdminViewMode);
    window.addEventListener(ADMIN_VIEW_MODE_EVENT, syncAdminViewMode);

    return () => {
      window.removeEventListener("storage", syncAdminViewMode);
      window.removeEventListener(ADMIN_VIEW_MODE_EVENT, syncAdminViewMode);
    };
  }, []);

  function setAdminViewMode(mode: AdminViewMode) {
    const normalizedMode = normalizeAdminViewMode(mode);
    setAdminViewModeState(normalizedMode);
    window.localStorage.setItem(ADMIN_VIEW_MODE_STORAGE_KEY, normalizedMode);
    window.dispatchEvent(new Event(ADMIN_VIEW_MODE_EVENT));
  }

  const realContext: EntitlementContext = resolveEntitlementContext(profile);
  const context: EntitlementContext = resolveEffectiveEntitlementContext(
    profile,
    adminViewMode
  );
  const isAdmin = realContext.role === "admin";
  const isSimulating = isAdminViewSimulationActive(profile, adminViewMode);

  return {
    loading,
    profile,
    realContext,
    context,
    adminViewMode,
    setAdminViewMode,
    isAdmin,
    isSimulating,
    hasEntitlement: (feature: EntitlementFeature) =>
      hasEntitlement(context, feature),
  };
}
