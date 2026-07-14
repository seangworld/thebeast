import { BeastAdminShell } from "../BeastAdminShell";
import { beastAdminFeedbackItems } from "@/lib/beastAdmin";

export default function BeastAdminFeedbackPage() {
  return (
    <BeastAdminShell
      title="Feedback"
      description="Review feedback by date, module, user, status, and summary."
    >
      <section className="space-y-3">
        {beastAdminFeedbackItems.map((item) => (
          <article key={item.id} className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
            <div className="flex flex-wrap items-center gap-3 text-xs font-black uppercase text-[#7f8da3]">
              <span>{item.date}</span>
              <span>{item.module}</span>
              <span>{item.user}</span>
              <span className="rounded-full border border-amber-300/40 bg-amber-300/10 px-2 py-1 text-amber-100">{item.status}</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-[#dbe3ef]">{item.summary}</p>
          </article>
        ))}
      </section>
    </BeastAdminShell>
  );
}
