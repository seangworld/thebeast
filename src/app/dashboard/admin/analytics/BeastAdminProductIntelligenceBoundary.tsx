import {
  DashboardCard,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import type { BeastAdminProductIntelligenceState } from "@/lib/beastAdminProductIntelligence";

export function BeastAdminProductIntelligenceBoundary({
  state,
}: {
  state: BeastAdminProductIntelligenceState;
}) {
  return (
    <DashboardCard accent="admin">
      <SectionHeader
        eyebrow="GA4 Product Intelligence"
        title={state.title}
        description={state.description}
      />
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-white/10 p-4">
          <h3 className="font-black text-white">Approved aggregate scope</h3>
          <ul className="mt-3 grid gap-2 text-sm leading-6 text-[#c7cfdb]">
            {state.supportedAggregates.map((aggregate) => (
              <li key={aggregate}>{aggregate.replaceAll("_", " ")}</li>
            ))}
          </ul>
        </section>
        <section className="rounded-xl border border-white/10 p-4">
          <h3 className="font-black text-white">Evidence boundary</h3>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-[#c7cfdb]">
            {state.limitations.map((limitation) => (
              <li key={limitation}>{limitation}</li>
            ))}
          </ul>
        </section>
      </div>
    </DashboardCard>
  );
}
