import Link from "next/link";

export type MoneyTimelineItem = {
  id: string;
  dateLabel: string;
  title: string;
  amountLabel: string;
  type: "bill" | "income" | "debt" | "event";
  href: string;
};

const typeStyles: Record<MoneyTimelineItem["type"], string> = {
  bill: "border-red-400/40 bg-red-400/10 text-red-100",
  income: "border-green-400/40 bg-green-400/10 text-green-100",
  debt: "border-yellow-300/40 bg-yellow-300/10 text-yellow-100",
  event: "border-[#38bdf8]/40 bg-[#38bdf8]/10 text-[#bae6fd]",
};

export function MoneyTimeline({ items }: { items: MoneyTimelineItem[] }) {
  return (
    <section className="beast-card">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-xl font-bold">Financial Timeline</h2>
          <p className="mt-1 text-sm text-[#7f8da3]">
            Bills, paydays, planned debt payments, and upcoming money events.
          </p>
        </div>
        <Link href="/dashboard/calendar" className="beast-button-secondary w-fit">
          Open Calendar
        </Link>
      </div>

      <div className="mt-5 space-y-3">
        {items.length === 0 ? (
          <div className="rounded-lg border border-[#2a3242] bg-[#111827] p-4 text-sm text-[#7f8da3]">
            No upcoming money events found yet.
          </div>
        ) : (
          items.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="flex flex-col gap-3 rounded-lg border border-[#2a3242] bg-[#111827] p-4 transition hover:border-[#38bdf8] hover:bg-[#202634] md:flex-row md:items-center md:justify-between"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-1 h-3 w-3 rounded-full border ${typeStyles[item.type]}`}
                />
                <div>
                  <div className="text-sm font-semibold text-white">
                    {item.title}
                  </div>
                  <div className="mt-1 text-xs text-[#7f8da3]">
                    {item.dateLabel}
                  </div>
                </div>
              </div>
              <div className="text-sm font-bold text-[#c7cfdb]">
                {item.amountLabel}
              </div>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}
