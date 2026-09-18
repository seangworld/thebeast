"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { MonthlyChecklistItem } from "@/lib/monthlyPaymentChecklist";
export function BillDueNotifications() {
  const [items, setItems] = useState<MonthlyChecklistItem[]>([]);
  const [today, setToday] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [available, setAvailable] = useState(false);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetch(
      `/api/calendar?timeZone=${encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone)}`,
      { cache: "no-store", signal: controller.signal },
    )
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setAvailable(data.moneyAvailable);
        setItems(data.billsDue);
        setToday(data.today);
        const warning = data.warnings.find((value: string) =>
          value.startsWith("Bill"),
        );
        if (warning) setError(warning);
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(cause.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [refresh]);
  if (!loading && !available && !error) return null;
  return (
    <section className="beast-card space-y-4 p-5">
      <div className="flex flex-wrap justify-between gap-2">
        <h2 className="text-lg font-bold">Bills due today or tomorrow</h2>
        <button
          className="text-sm text-sky-300 underline"
          disabled={loading}
          onClick={() => setRefresh((value) => value + 1)}
        >
          Refresh
        </button>
      </div>
      {loading ? (
        <p role="status">Checking bills…</p>
      ) : error ? (
        <p role="alert" className="text-amber-100">
          {error}
        </p>
      ) : items.length ? (
        items.map((item) => (
          <Link
            key={item.id}
            className="block rounded-xl border border-slate-700 p-3"
            href="/dashboard/money/bills"
          >
            <p className="font-bold">{item.name}</p>
            <p className="text-sm text-slate-300">
              ${item.remaining.toFixed(2)} remaining · Due{" "}
              {item.dueDate === today ? "today" : "tomorrow"}
            </p>
          </Link>
        ))
      ) : (
        <p className="text-sm text-slate-300">
          No unpaid bills with reminders enabled are due today or tomorrow.
        </p>
      )}
      <Link
        className="inline-block text-sm text-sky-300 underline"
        href="/dashboard/money/bills"
      >
        Review bills and record payments
      </Link>
    </section>
  );
}
