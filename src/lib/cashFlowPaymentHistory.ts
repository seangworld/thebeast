import type { SupabaseClient } from "@supabase/supabase-js";

const PAGE_SIZE = 250;
const MAX_PAGES = 100;
type PaymentRow = Record<string, unknown>;
type HistoryResult = { data: PaymentRow[] | null; error?: unknown };

/** Finish a capped history read for the cycles needed by Cash Flow. */
export async function completeCashFlowPaymentHistory({ client, userId, table, initial, earliestCycle }: {
  client: Pick<SupabaseClient, "from">;
  userId: string;
  table: "bill_payments" | "debt_payments";
  initial: HistoryResult;
  earliestCycle: string;
}): Promise<{ data: PaymentRow[]; complete: boolean }> {
  if (initial.error || !initial.data) return { data: [], complete: false };
  if (initial.data.length < PAGE_SIZE) return { data: initial.data, complete: true };

  const relevant: PaymentRow[] = [];
  let cursor: string | null = null;
  try {
    for (let page = 0; page < MAX_PAGES; page++) {
      let query = client.from(table).select("*")
        .eq("user_id", userId).gte("cycle_due_date", earliestCycle)
        .order("id", { ascending: true }).limit(PAGE_SIZE);
      if (table === "debt_payments") query = query.is("reversed_at", null);
      if (cursor) query = query.gt("id", cursor);
      const { data, error } = await query;
      if (error || !data) return { data: initial.data, complete: false };
      if (data.some(row => typeof row.id !== "string" || (cursor && row.id <= cursor))) {
        return { data: initial.data, complete: false };
      }
      relevant.push(...data);
      if (data.length < PAGE_SIZE) {
        // Relevant cycles come exclusively from the fresh read: stale initial rows
        // must not resurrect a payment reversed or deleted between requests.
        const older = initial.data.filter(row => typeof row.cycle_due_date === "string" && row.cycle_due_date < earliestCycle);
        return { data: [...older, ...relevant], complete: true };
      }
      cursor = data[data.length - 1].id;
    }
  } catch {
    return { data: initial.data, complete: false };
  }
  return { data: initial.data, complete: false };
}

export function earliestCashFlowCycle(cycleMonth: string, records: { next_due_date_after_payment?: unknown }[]) {
  return records.reduce((earliest, record) => {
    const date = record.next_due_date_after_payment;
    return typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date) && date < earliest ? date : earliest;
  }, `${cycleMonth}-01`);
}
