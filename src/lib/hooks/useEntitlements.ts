"use client";

import { useEffect, useState } from "react";
import { getCurrentUserProfile } from "@/lib/profile";
import {
  DEFAULT_FREE_MEMBERSHIP,
  getCurrentMembership,
  type MembershipSnapshot,
} from "@/lib/membership";
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
  const [membership, setMembership] = useState<MembershipSnapshot>(
    DEFAULT_FREE_MEMBERSHIP
  );
  const [loading, setLoading] = useState(true);
  const [adminViewMode, setAdminViewModeState] = useState<AdminViewMode>(
    loadStoredAdminViewMode
  );

  useEffect(() => {
    let isMounted = true;

    async function loadEntitlementSources() {
      const [profileResult, membershipResult] = await Promise.allSettled([
        getCurrentUserProfile(),
        getCurrentMembership(),
      ]);

      if (isMounted) {
        if (profileResult.status === "fulfilled") {
          setProfile(profileResult.value);
        }

        if (membershipResult.status === "fulfilled") {
          setMembership(membershipResult.value);
        }
      }

      if (
        process.env.NODE_ENV !== "production" &&
        (profileResult.status === "rejected" ||
          membershipResult.status === "rejected")
      ) {
        console.warn("Failed to load entitlement sources.", {
          profile: profileResult.status,
          membership: membershipResult.status,
        });
      }

      if (isMounted) {
        setLoading(false);
      }
    }

    loadEntitlementSources();

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

  const entitlementSubject = {
    role: profile?.role,
    membership,
  };
  const realContext: EntitlementContext =
    resolveEntitlementContext(entitlementSubject);
  const context: EntitlementContext = resolveEffectiveEntitlementContext(
    entitlementSubject,
    adminViewMode
  );
  const isAdmin = realContext.role === "admin";
  const isSimulating = isAdminViewSimulationActive(
    entitlementSubject,
    adminViewMode
  );

  return {
    loading,
    profile,
    membership,
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
