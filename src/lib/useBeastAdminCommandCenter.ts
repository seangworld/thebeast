"use client";

import { useCallback, useEffect, useState } from "react";
import {
  normalizeBeastAdminCommandCenterResponse,
  type BeastAdminCommandCenterResponse,
} from "./beastAdminCommandCenter";

export function useBeastAdminCommandCenter() {
  const [snapshot, setSnapshot] =
    useState<BeastAdminCommandCenterResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/beastfusion-projection", {
        cache: "no-store",
        credentials: "same-origin",
      });
      const body = (await response.json()) as unknown;
      const normalized = normalizeBeastAdminCommandCenterResponse(body);
      if (!normalized) {
        throw new Error("The canonical command-center response was invalid.");
      }
      setSnapshot(normalized);
      if (!response.ok || !normalized.canonical) {
        setError(normalized.provider.detail);
      }
    } catch {
      setSnapshot(null);
      setError(
        "Canonical BeastFusion governance is unavailable. No legacy roadmap or release record was substituted."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { snapshot, canonical: snapshot?.canonical ?? null, loading, error, reload: load };
}
