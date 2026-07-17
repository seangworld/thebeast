import {
  DashboardCard,
  ModuleBadge,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import {
  ModuleFilterRail,
  PlatformServiceHero,
  serviceModules,
} from "@/app/dashboard/platformServices";
import {
  buildNotificationActionRequest,
  buildNotificationDigest,
  buildNotificationInbox,
  groupNotificationsBySeverity,
  notificationContractRules,
  type NotificationPreferences,
  type PlatformNotificationItem,
} from "@/lib/platform/notifications";

const notificationItems: PlatformNotificationItem[] = [
  {
    id: "notification-money-buffer",
    source: "money",
    sourceRecordId: "cashflow-buffer-alert",
    title: "Cashflow buffer needs review",
    summary: "BeastMoney contributed a high-priority money alert.",
    priority: "High",
    severity: "warning",
    state: "Unread",
    createdAt: "2026-07-17T13:00:00.000Z",
    actionUrl: "/dashboard/money/cashflow",
    actions: [
      { type: "Open", label: "Open Cashflow", href: "/dashboard/money/cashflow" },
      { type: "Dismiss", label: "Dismiss" },
      { type: "Snooze", label: "Snooze" },
    ],
  },
  {
    id: "notification-learning-step",
    source: "learning",
    sourceRecordId: "mentor-next-step",
    title: "Learning step is ready",
    summary: "BeastLearning contributed a Mentor next-step notification.",
    priority: "Medium",
    severity: "info",
    state: "Unread",
    createdAt: "2026-07-17T12:00:00.000Z",
    actionUrl: "/dashboard/learning",
    actions: [
      { type: "Open", label: "Open Learning", href: "/dashboard/learning" },
      { type: "Complete", label: "Complete from source" },
    ],
  },
  {
    id: "notification-platform-ready",
    source: "beastos",
    sourceRecordId: "shared-services",
    title: "Shared services are online",
    summary: "Calendar, Timeline, Search, and Notifications are focused on active module signals.",
    priority: "Low",
    severity: "info",
    state: "Read",
    createdAt: "2026-07-17T11:00:00.000Z",
    actionUrl: "/dashboard",
    actions: [{ type: "Open", label: "Open Dashboard", href: "/dashboard" }],
  },
];

const notificationPreferences: NotificationPreferences = {
  enabled: true,
  digestFrequency: "Daily",
  mutedSources: [],
};

export default function NotificationsPage() {
  const inbox = buildNotificationInbox({
    items: notificationItems,
    preferences: notificationPreferences,
  });
  const grouped = groupNotificationsBySeverity(inbox);
  const digest = buildNotificationDigest({
    items: notificationItems,
    preferences: notificationPreferences,
  });
  const actionPreview = buildNotificationActionRequest({
    item: inbox[0],
    actionType: "Dismiss",
  });
  const notificationGroups = [
    {
      label: "Critical",
      description: "Urgent alerts that need direct attention.",
      items: grouped.critical,
    },
    {
      label: "Important",
      description: "Warnings, reminders, and module signals worth reviewing today.",
      items: grouped.warning,
    },
    {
      label: "Information",
      description: "System context and non-urgent updates.",
      items: grouped.info,
    },
  ];

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
            description="Money and Learning have active channels for the current Member experience."
            action={<ModuleBadge module="learning" label="Learning Active" />}
          />
          <div className="mt-5">
            <ModuleFilterRail modules={serviceModules} />
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-4">
            {[
              ["Inbox", inbox.length],
              ["Critical", digest.critical],
              ["Sources", digest.sources.length],
              ["Digest", digest.frequency],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-xl border border-[#2a3242] bg-[#111827] p-3"
              >
                <div className="text-xs font-bold uppercase text-[#7f8da3]">
                  {label}
                </div>
                <div className="mt-1 text-xl font-black text-white">{value}</div>
              </div>
            ))}
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
                    <div
                      key={notification.id}
                      className="rounded-xl border border-[#2a3242] bg-[#111827] p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <ModuleBadge module={notification.source} />
                        <span className="rounded-full border border-[#2a3242] px-2.5 py-1 text-xs font-bold text-[#c7cfdb]">
                          {notification.priority}
                        </span>
                        <span className="rounded-full border border-[#2a3242] px-2.5 py-1 text-xs font-bold text-[#c7cfdb]">
                          {notification.state}
                        </span>
                      </div>
                      <h3 className="mt-3 font-black text-white">
                        {notification.title}
                      </h3>
                      <p className="mt-2 text-sm leading-5 text-[#9aa7b8]">
                        {notification.summary}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {notification.actions.map((action) => (
                          <span
                            key={`${notification.id}-${action.type}`}
                            className="rounded-full border border-[#2a3242] px-2.5 py-1 text-xs font-bold text-[#c7cfdb]"
                          >
                            {action.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4 text-sm leading-5 text-[#9aa7b8]">
                    No {group.label.toLowerCase()} notifications right now.
                  </div>
                )}
              </div>
            </DashboardCard>
          ))}
        </section>

        <DashboardCard accent="notifications">
          <SectionHeader
            eyebrow="Notification Contracts"
            title="Actions, preferences, and digests"
            description="Notifications route user actions through source contracts while BeastOS owns shared inbox presentation."
          />
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
              <div className="text-xs font-bold uppercase text-[#7f8da3]">
                Action dispatch
              </div>
              <div className="mt-2 text-sm font-bold text-white">
                {actionPreview.dispatchMode}
              </div>
            </div>
            <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
              <div className="text-xs font-bold uppercase text-[#7f8da3]">
                Source
              </div>
              <div className="mt-2 text-sm font-bold text-white">
                {actionPreview.source}
              </div>
            </div>
            <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
              <div className="text-xs font-bold uppercase text-[#7f8da3]">
                Digest enabled
              </div>
              <div className="mt-2 text-sm font-bold text-white">
                {String(digest.enabled)}
              </div>
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {notificationContractRules.map((rule) => (
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
