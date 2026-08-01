"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { buildDebtOverdueSignals } from "@/lib/debtManagement";

type DebtRow = { id: string; name?: string | null; balance?: number | null; due_date?: number | null; next_due_date_after_payment?: string | null; is_archived?: boolean | null };

function dueDateFor(debt: DebtRow, now: Date) {
  if (debt.next_due_date_after_payment) return new Date(`${debt.next_due_date_after_payment}T00:00:00`);
  return new Date(now.getFullYear(), now.getMonth(), Math.min(Math.max(Number(debt.due_date || 1), 1), 28));
}

export function OverdueDebtNotifications() {
  const [signals, setSignals] = useState<ReturnType<typeof buildDebtOverdueSignals>>([]);
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    let active = true;
    void (async () => {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { data, error } = await supabase.from("debts").select("id, name, balance, due_date, next_due_date_after_payment, is_archived").eq("user_id", auth.user.id).eq("is_archived", false);
      if (!active) return;
      if (error) { setAvailable(false); return; }
      const now = new Date();
      setSignals(buildDebtOverdueSignals(((data || []) as DebtRow[]).map((debt) => ({ ...debt, nextDueDate: dueDateFor(debt, now) })), now));
    })();
    return () => { active = false; };
  }, []);

  if (!available) return <section className="rounded-xl border border-[#2a3242] bg-[#111827] p-4 text-sm text-[#9aa7b8]">Debt notifications are currently unavailable; no zero or empty state is inferred.</section>;
  if (!signals.length) return null;
  return <section className="rounded-2xl border border-red-500/30 bg-red-950/20 p-5" aria-label="Overdue debt notifications"><h2 className="text-lg font-black text-red-100">Overdue debt payments</h2><div className="mt-3 grid gap-3">{signals.map((signal) => <article key={signal.id} className="rounded-xl border border-red-500/20 bg-[#111827] p-4"><h3 className="font-black text-white">{signal.title}</h3><p className="mt-1 text-sm text-red-100">{signal.detail}</p><Link href={signal.href} className="beast-button mt-3 inline-flex">Review Debt</Link></article>)}</div></section>;
}
