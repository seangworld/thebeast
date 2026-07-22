import {
  DashboardCard,
  ModuleBadge,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import {
  ModuleFilterRail,
  PlatformServiceHero,
} from "@/app/dashboard/platformServices";
import {
  buildTimelineDetail,
  buildTimelineStream,
  groupTimelineByDate,
  summarizeTimeline,
  timelineContractRules,
  type PlatformTimelineItem,
} from "@/lib/platform/timeline";

const timelineItems: PlatformTimelineItem[] = [
  {
    id: "timeline-money-buffer",
    source: "money",
    sourceRecordId: "cashflow-buffer-review",
    kind: "Reviewed",
    title: "Cashflow buffer reviewed",
    summary: "BeastMoney contributed a meaningful review event for operating cash.",
    occurredAt: "2026-07-17T13:00:00.000Z",
    visibility: "Owner",
    href: "/dashboard/money/cashflow",
    meaningful: true,
    details: [
      { label: "Source", value: "BeastMoney" },
      { label: "Record", value: "cashflow-buffer-review" },
    ],
  },
  {
    id: "timeline-learning-step",
    source: "learning",
    sourceRecordId: "mentor-next-step",
    kind: "Scheduled",
    title: "Learning step queued",
    summary: "BeastEducation contributed the next Guidance Counselor-guided learning step.",
    occurredAt: "2026-07-17T11:00:00.000Z",
    visibility: "Owner",
    href: "/dashboard/education",
    meaningful: true,
    details: [
      { label: "Source", value: "BeastEducation" },
      { label: "Record", value: "mentor-next-step" },
    ],
  },
  {
    id: "timeline-document-upload",
    source: "documents",
    sourceRecordId: "document-tax-upload",
    kind: "Created",
    title: "Document uploaded",
    summary: "BeastOS Documents contributed a meaningful upload event.",
    occurredAt: "2026-07-16T15:00:00.000Z",
    visibility: "Owner",
    href: "/dashboard/uploads",
    meaningful: true,
    details: [
      { label: "Source", value: "Documents" },
      { label: "Record", value: "document-tax-upload" },
    ],
  },
  {
    id: "timeline-system-noise",
    source: "beastos",
    sourceRecordId: "background-refresh",
    kind: "Updated",
    title: "Background refresh",
    summary: "Internal refresh event that should not be shown to users.",
    occurredAt: "2026-07-17T10:00:00.000Z",
    visibility: "Owner",
    href: "/dashboard/timeline",
    meaningful: false,
    details: [{ label: "Internal", value: "Refresh" }],
  },
];

export default function TimelinePage() {
  const stream = buildTimelineStream({
    items: timelineItems,
    allowedVisibility: ["Owner"],
  });
  const groups = groupTimelineByDate(stream);
  const summary = summarizeTimeline(timelineItems);
  const detailPreview = buildTimelineDetail(stream[0]);

  return (
    <main className="beast-page">
      <div className="beast-container space-y-8">
        <PlatformServiceHero
          module="timeline"
          eyebrow="Shared Service"
          title="BeastOS Timeline"
          description="One chronological stream for current Money and Learning activity."
        />

        <DashboardCard accent="timeline">
          <SectionHeader
            eyebrow="Scope"
            title="Shared event stream"
            description="The timeline is organized by time horizon, not by module. Filters let users narrow the shared stream when needed."
            action={<ModuleBadge module="money" label="Money Events" />}
          />
          <div className="mt-5">
            <ModuleFilterRail />
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-4">
            {[
              ["Meaningful", summary.totalMeaningful],
              ["Sources", summary.sources.length],
              ["Kinds", summary.kinds.length],
              ["Date Groups", summary.groups],
            ].map(([label, count]) => (
              <div
                key={label}
                className="rounded-xl border border-[#2a3242] bg-[#111827] p-3"
              >
                <div className="text-xs font-bold uppercase text-[#7f8da3]">
                  {label}
                </div>
                <div className="mt-1 text-xl font-black text-white">{count}</div>
              </div>
            ))}
          </div>
        </DashboardCard>

        <div className="space-y-4">
          {groups.map((group) => (
            <DashboardCard key={group.key} accent="timeline">
              <SectionHeader
                title={group.label}
                description="Meaningful source-owned events grouped by date."
              />
              <div className="mt-5 grid gap-3 lg:grid-cols-2">
                {group.items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-[#2a3242] bg-[#111827] p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <ModuleBadge module={item.source} />
                      <span className="rounded-full border border-[#2a3242] px-2.5 py-1 text-xs font-bold text-[#c7cfdb]">
                        {item.kind}
                      </span>
                      <span className="rounded-full border border-[#2a3242] px-2.5 py-1 text-xs font-bold text-[#c7cfdb]">
                        {item.visibility}
                      </span>
                    </div>
                    <h3 className="mt-3 text-lg font-black text-white">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm leading-5 text-[#9aa7b8]">
                      {item.summary}
                    </p>
                    <div className="mt-4 grid gap-2">
                      {item.details.map((detail) => (
                        <div
                          key={`${item.id}-${detail.label}`}
                          className="flex justify-between gap-3 rounded-lg border border-[#2a3242] bg-[#0f1419] px-3 py-2 text-xs font-semibold"
                        >
                          <span className="text-[#7f8da3]">{detail.label}</span>
                          <span className="text-white">{detail.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </DashboardCard>
          ))}
        </div>

        <DashboardCard accent="timeline">
          <SectionHeader
            eyebrow="Timeline Contracts"
            title="Filters and item details"
            description="Timeline displays source-provided details without taking over source records."
          />
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
              <div className="text-xs font-bold uppercase text-[#7f8da3]">
                Detail source
              </div>
              <div className="mt-2 text-sm font-bold text-white">
                {detailPreview.source}
              </div>
            </div>
            <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
              <div className="text-xs font-bold uppercase text-[#7f8da3]">
                Source record
              </div>
              <div className="mt-2 text-sm font-bold text-white">
                {detailPreview.sourceRecordId}
              </div>
            </div>
            <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
              <div className="text-xs font-bold uppercase text-[#7f8da3]">
                Ownership
              </div>
              <div className="mt-2 text-sm font-bold text-white">
                Preserved: {String(detailPreview.sourceOwnershipPreserved)}
              </div>
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {timelineContractRules.map((rule) => (
              <div
                key={rule}
                className="rounded-xl border border-[#2a3242] bg-[#0f1419] p-4 text-sm font-semibold text-[#d8dee8]"
              >
                {rule}
              </div>
            ))}
          </div>
        </DashboardCard>
      </div>
    </main>
  );
}
