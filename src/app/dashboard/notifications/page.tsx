import {
  DashboardCard,
  ModuleBadge,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import {
  ModuleFilterRail,
  PlatformServiceHero,
  ServiceNotificationRow,
  serviceModules,
  serviceNotifications,
} from "@/app/dashboard/platformServices";

const notificationGroups = [
  {
    label: "Critical",
    description: "Urgent alerts that need direct attention.",
    items: serviceNotifications.filter((item) => item.severity === "critical"),
  },
  {
    label: "Important",
    description: "Warnings, reminders, and module signals worth reviewing today.",
    items: serviceNotifications.filter((item) => item.severity === "warning"),
  },
  {
    label: "Information",
    description: "System context, future module messages, and non-urgent updates.",
    items: serviceNotifications.filter((item) => item.severity === "info"),
  },
];

export default function NotificationsPage() {
  return (
    <main className="beast-page">
      <div className="beast-container space-y-8">
        <PlatformServiceHero
          module="notifications"
          eyebrow="Shared Service"
          title="Notification Center"
          description="A platform inbox for every BeastOS module. Critical, important, and informational items share one durable review surface."
        />

        <DashboardCard accent="notifications">
          <SectionHeader
            eyebrow="Inbox Filters"
            title="Module channels"
            description="Money and Learning now have active channels. Health, Home, and Projects are reserved for future notification sources."
            action={<ModuleBadge module="learning" label="Learning Active" />}
          />
          <div className="mt-5">
            <ModuleFilterRail
              modules={serviceModules.filter((module) =>
                ["Money", "Learning", "Health", "Home", "Projects"].includes(
                  module.label
                )
              )}
            />
          </div>
        </DashboardCard>

        <section className="grid gap-4 xl:grid-cols-3">
          {notificationGroups.map((group) => (
            <DashboardCard
              key={group.label}
              accent={
                group.label === "Critical"
                  ? "red"
                  : group.label === "Important"
                  ? "yellow"
                  : "blue"
              }
            >
              <SectionHeader
                title={group.label}
                description={group.description}
              />
              <div className="mt-5 space-y-4">
                {group.items.length > 0 ? (
                  group.items.map((notification) => (
                    <ServiceNotificationRow
                      key={notification.id}
                      notification={notification}
                    />
                  ))
                ) : (
                  <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4 text-sm leading-5 text-[#9aa7b8]">
                    No {group.label.toLowerCase()} notifications right now.
                    Future modules will use this lane when their signals become
                    active.
                  </div>
                )}
              </div>
            </DashboardCard>
          ))}
        </section>
      </div>
    </main>
  );
}
