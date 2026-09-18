import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";
import { requireMemberModuleEntitlement } from "@/lib/memberAgeServer";
import {
  buildMemberSchedule,
  validCalendarMonth,
} from "@/lib/calendar/memberSchedule";
import { dueBillReminders, zonedDay } from "@/lib/notifications/billReminders";
export const dynamic = "force-dynamic";
const reply = (body: unknown, status = 200) =>
  NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
export async function GET(request: Request) {
  try {
    const supabase = createRouteClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user)
      return reply({ error: "Sign in to see your calendar." }, 401);
    const params = new URL(request.url).searchParams;
    let today: string;
    try {
      today = zonedDay(new Date(), params.get("timeZone") || "UTC").date;
    } catch {
      return reply({ error: "Choose a valid timezone." }, 400);
    }
    const month = params.get("month") || today.slice(0, 7);
    if (!validCalendarMonth(month))
      return reply({ error: "Choose a valid month." }, 400);
    const [money, health] = await Promise.all([
      requireMemberModuleEntitlement("money", { supabase, user }),
      requireMemberModuleEntitlement("health", { supabase, user }),
    ]);
    const empty = { data: [], error: null };
    const start = `${month}-01`;
    const end = new Date(`${start}T12:00:00Z`);
    end.setUTCMonth(end.getUTCMonth() + 1);
    const until = end.toISOString().slice(0, 10);
    const [bills, payments, goals, appointments, debts, debtPayments] = await Promise.all([
      money.ok
        ? supabase
            .from("bill_events")
            .select(
              "id,name,amount,due_date,frequency,next_due_date_after_payment,is_archived,reminder_enabled",
            )
            .eq("user_id", user.id)
            .eq("is_archived", false)
            .limit(1000)
        : empty,
      money.ok
        ? supabase
            .from("bill_payments")
            .select(
              "bill_id,cycle_due_date,amount_paid,resulting_next_due_date",
            )
            .eq("user_id", user.id)
            .gte(
              "cycle_due_date",
              start < `${today.slice(0, 7)}-01`
                ? start
                : `${today.slice(0, 7)}-01`,
            )
            .limit(1000)
        : empty,
      supabase
        .from("beast_goals")
        .select("id,title,status,target_date")
        .eq("owner_id", user.id)
        .is("deleted_at", null)
        .is("archived_at", null)
        .gte("target_date", start)
        .lt("target_date", until)
        .limit(1000),
      health.ok
        ? supabase
            .from("beast_health_records")
            .select("id,title,status,occurred_on")
            .eq("owner_id", user.id)
            .eq("record_type", "appointment")
            .gte("occurred_on", start)
            .lt("occurred_on", until)
            .limit(1000)
        : empty,
      money.ok ? supabase.from("debts")
        .select("id,name,balance,minimum_payment,due_date,next_due_date_after_payment,is_archived,lifecycle_status,payment_behavior,reminder_enabled")
        .eq("user_id", user.id).limit(1000) : empty,
      money.ok ? supabase.from("debt_payments")
        .select("debt_id,cycle_due_date,amount,resulting_next_due_date,balance_after,reversed_at,action_type")
        .eq("user_id", user.id)
        .gte("cycle_due_date", start < `${today.slice(0, 7)}-01` ? start : `${today.slice(0, 7)}-01`)
        .limit(1000) : empty,
    ]);
    const warnings: string[] = [];
    const billIncomplete =
      debts.error || debtPayments.error || debts.data?.length === 1000 || debtPayments.data?.length === 1000 ||
      bills.error ||
      payments.error ||
      bills.data?.length === 1000 ||
      payments.data?.length === 1000;
    if (billIncomplete || (!money.ok && money.status === 503))
      warnings.push(
        "Expense dates could not all be loaded. Open Money to check them.",
      );
    if (goals.error || goals.data?.length === 1000)
      warnings.push("Some goal dates could not be loaded.");
    if (
      appointments.error ||
      appointments.data?.length === 1000 ||
      (!health.ok && health.status === 503)
    )
      warnings.push("Some appointment dates could not be loaded.");
    const billData = billIncomplete ? [] : bills.data || [];
    const paymentData = billIncomplete ? [] : payments.data || [];
    return reply({
      today,
      month,
      warnings,
      moneyAvailable: money.ok,
      events: buildMemberSchedule({
        month,
        today,
        bills: billData,
        debts: billIncomplete ? [] : debts.data || [],
        debtPayments: billIncomplete ? [] : debtPayments.data || [],
        payments: paymentData,
        goals: goals.error ? [] : goals.data || [],
        appointments: appointments.error ? [] : appointments.data || [],
      }),
      billsDue: dueBillReminders({
        today,
        bills: billData,
        debts: billIncomplete ? [] : debts.data || [],
        debtPayments: billIncomplete ? [] : debtPayments.data || [],
        payments: paymentData,
        dueToday: true,
        dueTomorrow: true,
      }),
    });
  } catch {
    return reply(
      { error: "Your calendar could not be loaded. Please try again." },
      503,
    );
  }
}
