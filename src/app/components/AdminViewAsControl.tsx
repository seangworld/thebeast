"use client";

import { ADMIN_VIEW_MODES, type AdminViewMode } from "@/lib/entitlements";
import { useEntitlements } from "@/lib/hooks/useEntitlements";

const adminViewModeLabels: Record<AdminViewMode, string> = {
  admin: "Admin",
  member: "Member",
};

type AdminViewAsControlProps = {
  compact?: boolean;
  surface?: "inline" | "sidebar";
};

export default function AdminViewAsControl({
  compact = false,
  surface = "inline",
}: AdminViewAsControlProps) {
  const {
    loading,
    isAdmin,
    isSimulating,
    adminViewMode,
    setAdminViewMode,
  } = useEntitlements();

  if (loading || !isAdmin) return null;

  if (compact) {
    return (
      <div className={surface === "sidebar" ? "border-t border-[#2a3242] p-3" : ""}>
        <div className="rounded-xl border border-yellow-300/30 bg-yellow-300/10 p-2">
          <label className="sr-only" htmlFor="admin-view-as-compact">
            Admin View As
          </label>
          <select
            id="admin-view-as-compact"
            value={adminViewMode}
            onChange={(event) =>
              setAdminViewMode(event.target.value as AdminViewMode)
            }
            aria-label="Admin View As"
            className="w-full rounded border border-yellow-300/30 bg-[#111827] px-1 py-1 text-xs font-black text-yellow-100"
            title={
              isSimulating
                ? `Simulating ${adminViewModeLabels[adminViewMode]} access`
                : "Admin View As"
            }
          >
            {ADMIN_VIEW_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {adminViewModeLabels[mode].slice(0, 1)}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  return (
    <div className={surface === "sidebar" ? "border-t border-[#2a3242] p-3" : ""}>
      <div className="flex flex-col gap-2 rounded-xl border border-yellow-300/30 bg-yellow-300/10 px-3 py-2 text-xs text-[#c7cfdb]">
        <label className="font-bold text-yellow-100" htmlFor="admin-view-as">
          Admin View As
        </label>
        <select
          id="admin-view-as"
          value={adminViewMode}
          onChange={(event) =>
            setAdminViewMode(event.target.value as AdminViewMode)
          }
          aria-label="Admin View As"
          className="rounded-lg border border-yellow-300/30 bg-[#111827] px-2 py-1.5 text-sm font-bold text-white"
        >
          {ADMIN_VIEW_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {adminViewModeLabels[mode]}
            </option>
          ))}
        </select>
        {isSimulating ? (
          <div className="font-semibold text-yellow-100">
            Simulating {adminViewModeLabels[adminViewMode]} access
          </div>
        ) : (
          <div className="font-semibold text-[#aab4c2]">
            Local entitlement preview only
          </div>
        )}
      </div>
    </div>
  );
}
