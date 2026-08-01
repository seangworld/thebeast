"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DashboardCard,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import {
  normalizeBeastFeatureFlags,
  type BeastFeatureFlag,
} from "@/lib/beastFeatureFlags";
import {
  revenuePlacements,
  revenueSourceRegistry,
  type RevenueMetricSet,
  type RevenuePeriod,
  type RevenueSnapshot,
} from "@/lib/revenueCenter";
import { createClient } from "@/lib/supabase/client";

const periods: Array<[RevenuePeriod, string]> = [
  ["today", "Today"],
  ["yesterday", "Yesterday"],
  ["last7", "Last 7 days"],
  ["month", "This month"],
  ["lifetime", "Lifetime"],
];

function money(value: number | null, currency: string | null = "USD") {
  if (value === null) return "Unavailable";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
  }).format(value);
}

function number(value: number | null) {
  return value === null
    ? "Unavailable"
    : new Intl.NumberFormat("en-US").format(value);
}

function percent(value: number | null) {
  return value === null ? "Unavailable" : `${(value * 100).toFixed(2)}%`;
}

function MetricDetails({ metrics }: { metrics: RevenueMetricSet | null }) {
  return (
    <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
      {[
        ["Page views", number(metrics?.pageViews ?? null)],
        ["Impressions", number(metrics?.impressions ?? null)],
        ["Clicks", number(metrics?.clicks ?? null)],
        ["CTR", percent(metrics?.ctr ?? null)],
        ["Page RPM", money(metrics?.rpm ?? null, metrics?.currency)],
      ].map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-xs text-slate-400">{label}</dt>
          <dd className="mt-1 break-words font-semibold text-slate-100">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function humanizeError(error: unknown) {
  const message =
    error && typeof error === "object" && "message" in error
      ? String(error.message)
      : "";
  return message.includes("permission") || message.includes("authorized")
    ? "Owner authorization is required to change ad placement."
    : "Placement could not be saved. The current state was preserved.";
}

type GoogleConnectionStatus = {
  connected: boolean;
  provider: "adsense";
  publisherId?: string | null;
  account?: string | null;
  lastSync?: string | null;
  connectedAt?: string | null;
  unavailable?: boolean;
};

function timestamp(value: string | null | undefined) {
  if (!value) return "Never";
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? "Unavailable" : parsed.toLocaleString();
}

export function BeastAdminRevenueCenterWorkspace() {
  const [snapshot, setSnapshot] = useState<RevenueSnapshot | null>(null);
  const [flags, setFlags] = useState<BeastFeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState("");
  const [googleStatus, setGoogleStatus] = useState<GoogleConnectionStatus | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [response, statusResponse, flagResponse] = await Promise.all([
        fetch("/api/admin/revenue", {
          cache: "no-store",
          credentials: "same-origin",
        }),
        fetch("/api/admin/revenue/google/status", {
          cache: "no-store",
          credentials: "same-origin",
        }),
        createClient().rpc("get_beast_admin_feature_flags"),
      ]);
      const payload = (await response.json()) as RevenueSnapshot | { error?: string };
      const statusPayload = (await statusResponse.json()) as GoogleConnectionStatus;
      if (!response.ok || !("provider" in payload)) {
        throw new Error("Revenue reporting is unavailable.");
      }
      const normalizedFlags = flagResponse.error
        ? null
        : normalizeBeastFeatureFlags(flagResponse.data);
      setSnapshot(payload);
      setGoogleStatus(statusPayload);
      setFlags(normalizedFlags || []);
    } catch {
      setError(
        "Revenue Center could not load its connected sources. No revenue values were inferred."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  async function disconnectGoogle() {
    if (!window.confirm("Disconnect Google AdSense from Revenue Center?")) return;
    setSaving("google-disconnect");
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/revenue/google/disconnect", {
        method: "POST",
        credentials: "same-origin",
      });
      if (!response.ok) throw new Error("disconnect");
      setNotice("Google AdSense disconnected.");
      await load();
    } catch {
      setError("Google AdSense could not be disconnected. The current connection state was preserved.");
    } finally {
      setSaving("");
    }
  }

  useEffect(() => {
    void load();
  }, [load]);

  const enabledKeys = useMemo(
    () =>
      new Set(
        flags.flatMap((flag) =>
          flag.assignments.some(
            (assignment) =>
              assignment.scopeType === "module" &&
              assignment.stage === "released"
          )
            ? [flag.key]
            : []
        )
      ),
    [flags]
  );

  async function setPlacement(
    placement: (typeof revenuePlacements)[number],
    enabled: boolean
  ) {
    if (!placement.flagKey || !placement.moduleId) return;
    setSaving(placement.id);
    setError("");
    setNotice("");
    try {
      const supabase = createClient();
      let flag = flags.find((entry) => entry.key === placement.flagKey);
      if (!flag) {
        const { data, error: saveFlagError } = await supabase.rpc(
          "save_beast_admin_feature_flag",
          {
            selected_flag_id: null,
            selected_flag_key: placement.flagKey,
            selected_name: `${placement.product} ${placement.name} ad`,
            selected_description:
              "Owner-governed AdSense placement. Hidden fails closed.",
          }
        );
        if (saveFlagError || typeof data !== "string") {
          throw saveFlagError || new Error("Feature flag creation failed.");
        }
        flag = {
          id: data,
          key: placement.flagKey,
          name: placement.name,
          description: "",
          assignments: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
      const assignment = flag.assignments.find(
        (entry) =>
          entry.scopeType === "module" &&
          entry.moduleId === placement.moduleId
      );
      const { error: saveAssignmentError } = await supabase.rpc(
        "save_beast_admin_feature_flag_assignment",
        {
          selected_assignment_id: assignment?.id || null,
          selected_flag_id: flag.id,
          selected_scope_type: "module",
          selected_stage: enabled ? "released" : "hidden",
          selected_module_id: placement.moduleId,
          selected_role_name: null,
          selected_member_id: null,
        }
      );
      if (saveAssignmentError) throw saveAssignmentError;
      setNotice(
        `${placement.product} ${placement.name} is now ${
          enabled ? "enabled" : "disabled"
        }.`
      );
      await load();
    } catch (saveError) {
      setError(humanizeError(saveError));
    } finally {
      setSaving("");
    }
  }

  return (
    <div className="space-y-6">
      <DashboardCard accent="admin">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <SectionHeader
            eyebrow="BA-ADS-202 · Google OAuth"
            title="Google AdSense"
            description="Owner-authorized read-only reporting. Beast stores the refresh token encrypted on the server and refreshes access automatically."
          />
          <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-black ${googleStatus?.connected ? "bg-green-400/15 text-green-100" : "bg-slate-400/15 text-slate-200"}`}>
            {googleStatus?.connected ? "Connected" : "Not Connected"}
          </span>
        </div>
        {googleStatus?.unavailable ? (
          <p role="alert" className="mt-4 rounded-xl border border-amber-300/30 bg-amber-400/10 p-3 text-sm text-amber-100">
            Google connection status is unavailable. Revenue Center does not infer a disconnected account.
          </p>
        ) : googleStatus?.connected ? (
          <>
            <dl className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {[
                ["Publisher ID", googleStatus.publisherId || "Unavailable"],
                ["Account", googleStatus.account || "Unavailable"],
                ["Last Sync", timestamp(googleStatus.lastSync)],
                ["Estimated Earnings", money(snapshot?.periods.month?.estimatedEarnings ?? null, snapshot?.periods.month?.currency)],
                ["Today's Revenue", money(snapshot?.periods.today?.estimatedEarnings ?? null, snapshot?.periods.today?.currency)],
              ].map(([label, value]) => (
                <div key={label} className="min-w-0 rounded-xl border border-white/10 bg-black/15 p-3">
                  <dt className="text-xs font-bold uppercase text-slate-400">{label}</dt>
                  <dd className="mt-2 break-words font-semibold text-white">{value}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-5 flex flex-wrap gap-2">
              <button type="button" onClick={() => void load()} disabled={loading} className="beast-button-secondary">Refresh</button>
              <button type="button" onClick={() => void disconnectGoogle()} disabled={saving === "google-disconnect"} className="beast-button-secondary">{saving === "google-disconnect" ? "Disconnecting…" : "Disconnect"}</button>
            </div>
          </>
        ) : (
          <div className="mt-5">
            <a href="/api/admin/revenue/google/connect" className="beast-button inline-flex">Connect Google Account</a>
            <p className="mt-3 text-sm text-slate-300">Google Login → approve AdSense Read-Only → return securely to Beast.</p>
          </div>
        )}
      </DashboardCard>

      <DashboardCard accent="admin">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <SectionHeader
            eyebrow="BA-ADS-201 · Generation 1"
            title="Revenue operating summary"
            description="Aggregate AdSense reporting and conservative placement governance. Private member content is never sent to the reporting provider."
          />
          <div className="flex flex-wrap gap-2">
            <a
              href="https://www.google.com/adsense/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-slate-100"
            >
              Open AdSense
            </a>
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="min-h-11 rounded-lg border border-amber-300/40 px-4 py-2 text-sm font-semibold text-amber-100 disabled:opacity-50"
            >
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>
        {error ? (
          <p role="alert" className="mt-4 rounded-xl border border-red-300/30 bg-red-400/10 p-3 text-sm text-red-100">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p role="status" className="mt-4 rounded-xl border border-green-300/30 bg-green-400/10 p-3 text-sm text-green-100">
            {notice}
          </p>
        ) : null}
        <p className="mt-4 text-sm leading-6 text-slate-300">
          {snapshot?.diagnostic ||
            "Revenue reporting is loading. Values remain unavailable until a connected provider responds."}
        </p>
        <div className="mt-4 rounded-xl border border-white/10 bg-black/15 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Finalized earnings
          </p>
          <p className="mt-2 font-semibold text-white">Unavailable</p>
          <p className="mt-1 text-sm leading-6 text-slate-300">
            This Generation 1 adapter reads AdSense reporting metrics, which
            identify earnings as estimated. A finalized-payments source is not
            connected, so Revenue Center does not relabel estimates as final.
          </p>
        </div>
      </DashboardCard>

      <section aria-label="Revenue periods" className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {periods.map(([period, label]) => {
          const metrics = snapshot?.periods[period] || null;
          return (
            <DashboardCard key={period} accent="admin" className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                {label}
              </p>
              <p className="mt-2 break-words text-2xl font-black text-white">
                {money(metrics?.estimatedEarnings ?? null, metrics?.currency)}
              </p>
              <p className="mt-1 text-xs text-amber-100/80">
                {period === "lifetime"
                  ? metrics
                    ? "Estimated earnings since the approved reporting start date"
                    : "Unavailable without an approved reporting start date"
                  : "Estimated revenue"}
              </p>
              <MetricDetails metrics={metrics} />
            </DashboardCard>
          );
        })}
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <DashboardCard accent="admin">
          <SectionHeader
            eyebrow="Projection"
            title="Projected monthly revenue"
            description="A simple month-to-date pace estimate, not a finalized forecast."
          />
          <p className="mt-5 text-3xl font-black text-white">
            {money(
              snapshot?.projectedMonthlyRevenue ?? null,
              snapshot?.periods.month?.currency
            )}
          </p>
        </DashboardCard>
        {[
          ["Top pages", snapshot?.topPages || []],
          ["Top products", snapshot?.topProducts || []],
        ].map(([title, items]) => (
          <DashboardCard key={title as string} accent="admin">
            <SectionHeader
              eyebrow="Last 30 days"
              title={title as string}
              description="Aggregate reporting only; URL queries and fragments are removed."
            />
            {(items as RevenueSnapshot["topPages"]).length ? (
              <ol className="mt-5 space-y-3">
                {(items as RevenueSnapshot["topPages"]).map((item) => (
                  <li key={item.label} className="flex min-w-0 justify-between gap-3 text-sm">
                    <span className="min-w-0 break-all text-slate-200">{item.label}</span>
                    <span className="shrink-0 font-semibold text-white">
                      {money(item.estimatedEarnings)}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-5 text-sm leading-6 text-slate-300">
                No aggregate ranking is available from the connected source.
              </p>
            )}
          </DashboardCard>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <DashboardCard accent="admin">
          <SectionHeader
            eyebrow="Placement performance"
            title="Top ad placements"
            description="Aggregate estimated earnings by AdSense ad-unit name for the last 30 days."
          />
          {snapshot?.topPlacements.length ? (
            <ol className="mt-5 space-y-3">
              {snapshot.topPlacements.map((item) => (
                <li key={item.label} className="flex min-w-0 justify-between gap-3 text-sm">
                  <span className="min-w-0 break-words text-slate-200">{item.label}</span>
                  <span className="shrink-0 font-semibold text-white">
                    {money(item.estimatedEarnings)}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-5 text-sm leading-6 text-slate-300">
              No aggregate placement performance is available.
            </p>
          )}
        </DashboardCard>
        <DashboardCard accent="admin">
          <SectionHeader
            eyebrow="Historical trend"
            title="Estimated revenue history"
            description="Daily aggregate estimated earnings for the last 30 days."
          />
          {snapshot?.history.length ? (
            <ol className="mt-5 max-h-72 space-y-3 overflow-y-auto pr-2">
              {snapshot.history.map((item) => (
                <li key={item.date} className="flex justify-between gap-3 text-sm">
                  <time className="text-slate-200">{item.date}</time>
                  <span className="font-semibold text-white">
                    {money(item.estimatedEarnings)}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-5 text-sm leading-6 text-slate-300">
              No historical reporting rows are available.
            </p>
          )}
        </DashboardCard>
      </section>

      <DashboardCard accent="admin">
        <SectionHeader
          eyebrow="Revenue sources"
          title="Current and future revenue"
          description="Only AdSense has a Generation 1 provider boundary. Future sources remain explicitly unconnected."
        />
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {revenueSourceRegistry.map((source) => (
            <article key={source.id} className="rounded-xl border border-white/10 bg-black/15 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold text-white">{source.name}</h3>
                <span className="rounded-full border border-white/15 px-2 py-1 text-xs text-slate-300">
                  {source.generation}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-300">{source.description}</p>
              <p className="mt-3 text-sm font-semibold text-white">
                {source.id === "adsense"
                  ? money(
                      snapshot?.periods.month?.estimatedEarnings ?? null,
                      snapshot?.periods.month?.currency
                    )
                  : "Revenue unavailable — source not connected"}
              </p>
            </article>
          ))}
        </div>
      </DashboardCard>

      <DashboardCard accent="admin">
        <SectionHeader
          eyebrow="Placement governance"
          title="Owner-approved inventory"
          description="Maximum one responsive, lazy-loaded footer ad on an eligible page. Protected workspaces cannot be enabled."
        />
        <p className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/5 p-3 text-sm leading-6 text-amber-50">
          Keep advertising distinct from member content. Never place ads where
          they could be mistaken for professional guidance, records, controls,
          or private communication.
        </p>
        <div className="mt-5 space-y-3">
          {revenuePlacements.map((placement) => {
            const enabled = placement.flagKey
              ? enabledKeys.has(placement.flagKey)
              : false;
            const actionable =
              placement.eligible && placement.integration === "beast";
            return (
              <article
                key={placement.id}
                className="flex min-w-0 flex-col gap-3 rounded-xl border border-white/10 bg-black/15 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-white">
                    {placement.product} · {placement.name}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-300">
                    {placement.reason}
                  </p>
                </div>
                {actionable ? (
                  <button
                    type="button"
                    aria-pressed={enabled}
                    disabled={saving === placement.id}
                    onClick={() => void setPlacement(placement, !enabled)}
                    className="min-h-11 shrink-0 rounded-lg border border-amber-300/40 px-4 py-2 text-sm font-semibold text-amber-100 disabled:opacity-50"
                  >
                    {saving === placement.id
                      ? "Saving…"
                      : enabled
                        ? "Disable"
                        : "Enable"}
                  </button>
                ) : (
                  <span className="shrink-0 rounded-full border border-slate-300/20 px-3 py-1 text-xs text-slate-300">
                    {placement.integration === "external"
                      ? "External adapter"
                      : "Protected"}
                  </span>
                )}
              </article>
            );
          })}
        </div>
      </DashboardCard>
    </div>
  );
}
