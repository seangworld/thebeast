import {
  DashboardCard,
  ModuleBadge,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import {
  ModuleFilterRail,
  PlatformServiceHero,
  ServiceEventCard,
  serviceEvents,
} from "@/app/dashboard/platformServices";

const timelineGroups = ["Today", "Tomorrow", "This Week", "Upcoming"] as const;

export default function TimelinePage() {
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
        </DashboardCard>

        <div className="space-y-4">
          {timelineGroups.map((group) => {
            const items = serviceEvents.filter((event) => event.group === group);

            return (
              <DashboardCard key={group} accent="timeline">
                <SectionHeader
                  title={group}
                  description={
                    group === "Upcoming"
                      ? "Upcoming Money and Learning steps appear here when they are ready."
                      : "Money contributes the first timeline entries for this horizon."
                  }
                />
                <div className="mt-5 grid gap-3 lg:grid-cols-2">
                  {items.map((event) => (
                    <ServiceEventCard key={event.id} event={event} />
                  ))}
                </div>
              </DashboardCard>
            );
          })}
        </div>
      </div>
    </main>
  );
}
