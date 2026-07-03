import Link from "next/link";

export type MoneyTimelineItem = {
  id: string;
  date: string;
  dateLabel: string;
  title: string;
  amountLabel: string;
  type: "bill" | "payday" | "debt" | "alert";
  href: string;
};

const typeStyles: Record<MoneyTimelineItem["type"], string> = {
  bill: "border-red-400/40 bg-red-400/15 text-red-100",
  payday: "border-green-400/40 bg-green-400/15 text-green-100",
  debt: "border-yellow-300/40 bg-yellow-300/15 text-yellow-100",
  alert: "border-[#38bdf8]/40 bg-[#38bdf8]/15 text-[#bae6fd]",
};

const typeLabels: Record<MoneyTimelineItem["type"], string> = {
  bill: "Bill",
  payday: "Payday",
  debt: "Debt",
  alert: "Alert",
};

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getTimelineGroup(dateValue: string) {
  const today = startOfDay(new Date());
  const date = startOfDay(new Date(dateValue));
  const daysAway = Math.round(
    (date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysAway <= 0) return "Today";
  if (daysAway === 1) return "Tomorrow";
  if (daysAway <= 7) return "This Week";
  return "Upcoming";
}

function groupTimelineItems(items: MoneyTimelineItem[]) {
  const groups = ["Today", "Tomorrow", "This Week", "Upcoming"];

  return groups
    .map((group) => ({
      group,
      items: items.filter((item) => getTimelineGroup(item.date) === group),
    }))
    .filter((group) => group.items.length > 0);
}

export function MoneyTimeline({ items }: { items: MoneyTimelineItem[] }) {
  const groupedItems = groupTimelineItems(items);

  return (
    <section className="relative overflow-hidden rounded-2xl border border-[#2a3242] bg-[#1a1f2b] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.22)]">
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

      <div className="mt-6 space-y-6">
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#2a3242] bg-[#111827] p-6 text-center text-sm text-[#7f8da3]">
            No upcoming money events found yet.
          </div>
        ) : (
          groupedItems.map((group) => (
            <div key={group.group}>
              <div className="mb-3 text-xs font-bold uppercase text-[#7f8da3]">
                {group.group}
              </div>
              <div className="space-y-3">
                {group.items.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="flex flex-col gap-3 rounded-xl border border-[#2a3242] bg-[#111827] p-4 transition duration-200 hover:-translate-y-0.5 hover:border-[#38bdf8] hover:bg-[#202634] md:flex-row md:items-center md:justify-between"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border text-xs font-black ${typeStyles[item.type]}`}
                      >
                        {typeLabels[item.type].slice(0, 1)}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white">
                          {item.title}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-[#7f8da3]">
                          <span>{item.dateLabel}</span>
                          <span>{typeLabels[item.type]}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-sm font-bold text-[#c7cfdb]">
                      {item.amountLabel}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
