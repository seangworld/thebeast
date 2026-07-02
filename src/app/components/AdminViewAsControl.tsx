"use client";

import { ADMIN_VIEW_MODES, type AdminViewMode } from "@/lib/entitlements";
import { useEntitlements } from "@/lib/hooks/useEntitlements";

const adminViewModeLabels: Record<AdminViewMode, string> = {
  admin: "Admin",
  pro: "Pro",
  free: "Free",
};

export default function AdminViewAsControl() {
  const {
    loading,
    isAdmin,
    isSimulating,
    adminViewMode,
    setAdminViewMode,
  } = useEntitlements();

  if (loading || !isAdmin) return null;

  return (
    <div className="flex flex-col gap-1 rounded-lg border border-[#2a3242] bg-[#0f1419] px-3 py-2 text-xs text-[#c7cfdb] md:items-end">
      <label className="font-semibold text-[#7f8da3]" htmlFor="admin-view-as">
        View as
      </label>
      <select
        id="admin-view-as"
        value={adminViewMode}
        onChange={(event) =>
          setAdminViewMode(event.target.value as AdminViewMode)
        }
        className="rounded border border-[#2a3242] bg-[#111827] px-2 py-1 text-sm font-semibold text-white"
      >
        {ADMIN_VIEW_MODES.map((mode) => (
          <option key={mode} value={mode}>
            {adminViewModeLabels[mode]}
          </option>
        ))}
      </select>
      {isSimulating ? (
        <div className="font-semibold text-yellow-200">
          Simulating {adminViewModeLabels[adminViewMode]} access
        </div>
      ) : null}
    </div>
  );
}
