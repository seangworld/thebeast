import Link from "next/link";
import { BeastMoneyShell } from "../BeastMoneyShell";

const expenseAreas = [
  {
    title: "Bills",
    description:
      "Manage recurring bills, due dates, payment status, reminders, and funding assignments.",
    href: "/dashboard/money/bills",
    action: "Manage bills",
  },
  {
    title: "Debt obligations",
    description:
      "Manage balances, minimum payments, due dates, automation, and archived debt records.",
    href: "/dashboard/money/debts#debt-accounts",
    action: "Manage debts",
  },
] as const;

export default function MoneyExpensesPage() {
  return (
    <BeastMoneyShell
      title="Expenses"
      description="Manage the bills and debt obligations that shape your monthly cash flow."
    >
      <section className="grid items-stretch gap-4 lg:grid-cols-2">
        {expenseAreas.map((area) => (
          <article
            key={area.title}
            className="flex h-full min-w-0 flex-col rounded-2xl border border-white/10 bg-white/[0.035] p-5"
          >
            <h2 className="text-xl font-black text-white">{area.title}</h2>
            <p className="mt-3 flex-1 text-sm leading-6 text-slate-300">
              {area.description}
            </p>
            <Link
              className="beast-button-secondary mt-5 inline-flex min-h-11 items-center self-start"
              href={area.href}
            >
              {area.action}
            </Link>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.05] p-5">
        <h2 className="text-lg font-black text-white">
          Looking for payoff strategy?
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Strategy comparison, Velocity planning, and debt-free projections
          belong in Payoff Plan so expense records remain separate from payoff
          decisions.
        </p>
        <Link
          className="mt-4 inline-flex min-h-11 items-center font-bold text-cyan-200"
          href="/dashboard/money/payoff-plan"
        >
          Open Payoff Plan <span aria-hidden="true" className="ml-2">→</span>
        </Link>
      </section>
    </BeastMoneyShell>
  );
}
