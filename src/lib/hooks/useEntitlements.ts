"use client";

import { useEffect, useState } from "react";
import { getCurrentUserProfile } from "@/lib/profile";
import {
  hasEntitlement,
  resolveEntitlementContext,
  type EntitlementContext,
  type EntitlementFeature,
} from "@/lib/entitlements";
import type { Profile } from "@/lib/types/database";

export function useEntitlements() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

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

  const context: EntitlementContext = resolveEntitlementContext(profile);

  return {
    loading,
    profile,
    context,
    hasEntitlement: (feature: EntitlementFeature) =>
      hasEntitlement(context, feature),
  };
}
