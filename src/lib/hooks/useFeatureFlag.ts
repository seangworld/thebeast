"use client";

import { useEffect, useState } from "react";
import {
  normalizeBeastFeatureFlagResolution,
  type BeastFeatureFlagResolution,
} from "@/lib/beastFeatureFlags";
import type { BeastModuleIdentifier } from "@/lib/moduleRegistry";
import { createClient } from "@/lib/supabase/client";

const hiddenResolution: BeastFeatureFlagResolution = {
  flagKey: "unresolved",
  stage: "hidden",
  visible: false,
  deprecated: false,
  sourceScope: "default",
  sourceId: null,
  reason: "Visibility has not resolved, so the feature remains hidden.",
};

export function useFeatureFlag({
  flagKey,
  moduleId,
  enabled = true,
}: {
  flagKey: string;
  moduleId: BeastModuleIdentifier;
  enabled?: boolean;
}) {
  const [resolution, setResolution] =
    useState<BeastFeatureFlagResolution>(hiddenResolution);
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    let active = true;

    async function resolveFlag() {
      if (!enabled) {
        setResolution(hiddenResolution);
        setLoading(false);
        return;
      }

      setLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase.rpc(
        "get_beast_feature_flag_resolution",
        {
          selected_flag_key: flagKey,
          selected_module_id: moduleId,
        }
      );
      if (!active) return;

      const normalized = error
        ? null
        : normalizeBeastFeatureFlagResolution(data);
      setResolution(
        normalized || {
          ...hiddenResolution,
          flagKey,
          reason:
            "The feature flag could not be verified, so visibility fails closed.",
        }
      );
      setLoading(false);
    }

    resolveFlag();
    return () => {
      active = false;
    };
  }, [enabled, flagKey, moduleId]);

  return {
    ...resolution,
    loading,
  };
}
