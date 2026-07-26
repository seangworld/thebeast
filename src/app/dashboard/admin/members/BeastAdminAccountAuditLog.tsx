"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  DashboardCard,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import {
  beastAdminAccountAuditActionLabels,
  beastAdminAccountAuditActions,
  formatBeastAdminAccountAuditValue,
  getBeastAdminAccountAuditActionLabel,
  normalizeBeastAdminAccountAuditSnapshot,
  type BeastAdminAccountAuditAction,
  type BeastAdminAccountAuditSnapshot,
} from "@/lib/beastAdminAccountAudit";

type Props = {
  members: Array<{ id: string; displayName: string }>;
};

function formatAuditDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function exclusiveDateEnd(value: string) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString();
}

export function BeastAdminAccountAuditLog({ members }: Props) {
  const [memberId, setMemberId] = useState("");
  const [action, setAction] = useState<
    BeastAdminAccountAuditAction | ""
  >("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [snapshot, setSnapshot] =
    useState<BeastAdminAccountAuditSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAuditLog = useCallback(
    async (filters: {
      memberId?: string;
      action?: string;
      dateFrom?: string;
      dateTo?: string;
    }) => {
      const selected = filters;
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams();
        if (selected.memberId) {
          params.set("memberId", selected.memberId);
        }
        if (selected.action) params.set("action", selected.action);
        if (selected.dateFrom) {
          params.set(
            "dateFrom",
            new Date(`${selected.dateFrom}T00:00:00.000Z`).toISOString()
          );
        }
        if (selected.dateTo) {
          params.set("dateTo", exclusiveDateEnd(selected.dateTo));
        }

        const response = await fetch(
          `/api/admin/account-audit${
            params.size ? `?${params.toString()}` : ""
          }`,
          { cache: "no-store" }
        );
        const payload: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(
            payload &&
            typeof payload === "object" &&
            "error" in payload &&
            typeof payload.error === "string"
              ? payload.error
              : "BeastAdmin could not load the account audit log."
          );
        }

        const nextSnapshot =
          normalizeBeastAdminAccountAuditSnapshot(payload);
        if (!nextSnapshot) {
          throw new Error(
            "BeastAdmin received an invalid account audit log."
          );
        }
        setSnapshot(nextSnapshot);
      } catch (loadError) {
        setSnapshot(null);
        setError(
          loadError instanceof Error
            ? loadError.message
            : "BeastAdmin could not load the account audit log."
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadAuditLog({
      memberId: "",
      action: "",
      dateFrom: "",
      dateTo: "",
    });
  }, [loadAuditLog]);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (dateFrom && dateTo && dateTo < dateFrom) {
      setError("The ending date must be on or after the starting date.");
      return;
    }
    void loadAuditLog({ memberId, action, dateFrom, dateTo });
  }

  function clearFilters() {
    setMemberId("");
    setAction("");
    setDateFrom("");
    setDateTo("");
    void loadAuditLog({
      memberId: "",
      action: "",
      dateFrom: "",
      dateTo: "",
    });
  }

  return (
    <DashboardCard accent="admin">
      <SectionHeader
        eyebrow="Immutable account audit"
        title="Sensitive account-management history"
        description="Owner-only, append-only evidence of account changes. Passwords, tokens, one-time codes, and email-link secrets are rejected before an event can be stored."
      />

      <form
        onSubmit={applyFilters}
        className="mt-5 grid gap-3 rounded-xl border border-[#2a3242] bg-[#111827] p-4 md:grid-cols-2 xl:grid-cols-4"
      >
        <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.12em] text-[#9aa7b8]">
          Target member
          <select
            value={memberId}
            onChange={(event) => setMemberId(event.target.value)}
            className="min-h-11 rounded-lg border border-[#344052] bg-[#0b1220] px-3 py-2 text-sm font-bold normal-case tracking-normal text-white outline-none focus:border-amber-300/70"
          >
            <option value="">All members</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.displayName}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.12em] text-[#9aa7b8]">
          Action
          <select
            value={action}
            onChange={(event) =>
              setAction(
                event.target.value as BeastAdminAccountAuditAction | ""
              )
            }
            className="min-h-11 rounded-lg border border-[#344052] bg-[#0b1220] px-3 py-2 text-sm font-bold normal-case tracking-normal text-white outline-none focus:border-amber-300/70"
          >
            <option value="">All actions</option>
            {beastAdminAccountAuditActions.map((option) => (
              <option key={option} value={option}>
                {beastAdminAccountAuditActionLabels[option]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.12em] text-[#9aa7b8]">
          From date
          <input
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
            className="min-h-11 rounded-lg border border-[#344052] bg-[#0b1220] px-3 py-2 text-sm font-bold normal-case tracking-normal text-white outline-none focus:border-amber-300/70"
          />
        </label>
        <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.12em] text-[#9aa7b8]">
          Through date
          <input
            type="date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
            className="min-h-11 rounded-lg border border-[#344052] bg-[#0b1220] px-3 py-2 text-sm font-bold normal-case tracking-normal text-white outline-none focus:border-amber-300/70"
          />
        </label>
        <div className="flex flex-wrap gap-3 md:col-span-2 xl:col-span-4">
          <button
            type="submit"
            disabled={loading}
            className="beast-button min-h-11 disabled:cursor-wait disabled:opacity-60"
          >
            {loading ? "Searching audit log…" : "Search audit log"}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={clearFilters}
            className="beast-button-secondary min-h-11 disabled:opacity-60"
          >
            Clear filters
          </button>
        </div>
      </form>

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-red-300/30 bg-red-300/10 p-4 text-sm font-bold text-red-100"
        >
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="mt-5 grid gap-3" aria-busy="true">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-28 animate-pulse rounded-xl border border-[#2a3242] bg-[#111827]"
            />
          ))}
        </div>
      ) : null}

      {!loading && snapshot ? (
        <section className="mt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-black text-white">
              {snapshot.eventCount} event
              {snapshot.eventCount === 1 ? "" : "s"} shown
            </p>
            <p className="text-xs font-bold text-[#7f8da3]">
              Newest first · up to {snapshot.limit}
            </p>
          </div>
          <div className="mt-3 grid gap-3">
            {snapshot.events.map((event) => (
              <article
                key={event.id}
                className="rounded-xl border border-[#2a3242] bg-[#111827] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-black text-white">
                      {getBeastAdminAccountAuditActionLabel(event.action)}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-[#9aa7b8]">
                      {event.actorName} acted on {event.memberName}
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-black uppercase ${
                      event.outcome === "succeeded"
                        ? "border-green-300/30 bg-green-300/10 text-green-100"
                        : "border-red-300/30 bg-red-300/10 text-red-100"
                    }`}
                  >
                    {event.outcome}
                  </span>
                </div>
                <p className="mt-3 text-xs font-bold text-[#7f8da3]">
                  {formatAuditDate(event.occurredAt)}
                </p>
                {event.reason ? (
                  <p className="mt-3 rounded-lg border border-amber-300/20 bg-amber-300/10 p-3 text-sm leading-6 text-amber-100">
                    Reason: {event.reason}
                  </p>
                ) : null}
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  <div className="rounded-lg border border-[#2a3242] bg-[#0b1220] p-3">
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-[#7f8da3]">
                      Previous value
                    </p>
                    <pre className="mt-2 whitespace-pre-wrap break-words font-sans text-xs leading-5 text-[#c7cfdb]">
                      {formatBeastAdminAccountAuditValue(
                        event.previousValue
                      )}
                    </pre>
                  </div>
                  <div className="rounded-lg border border-[#2a3242] bg-[#0b1220] p-3">
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-[#7f8da3]">
                      New value
                    </p>
                    <pre className="mt-2 whitespace-pre-wrap break-words font-sans text-xs leading-5 text-[#c7cfdb]">
                      {formatBeastAdminAccountAuditValue(event.newValue)}
                    </pre>
                  </div>
                </div>
              </article>
            ))}
            {!snapshot.events.length ? (
              <p className="rounded-xl border border-dashed border-[#344052] p-5 text-center text-sm leading-6 text-[#9aa7b8]">
                No immutable account events match these filters.
              </p>
            ) : null}
          </div>
        </section>
      ) : null}
    </DashboardCard>
  );
}
