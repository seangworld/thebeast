import Link from "next/link";
import {
  DashboardCard,
  ModuleBadge,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import {
  buildSharedAIContext,
  buildSharedAIMemoryBoundary,
  buildSharedAIRecommendation,
  buildSharedAISpecialistHandoff,
  sharedAIContractRules,
  type SharedAIContextItem,
} from "@/lib/platform/sharedAI";
import {
  buildHouseholdInvitationRequest,
  buildHouseholdSharedLinkRequest,
  getHouseholdSharedLinksForMember,
  householdOwnershipRules,
  type HouseholdModel,
} from "@/lib/platform/household";

const settingsSections = [
  {
    title: "Theme & Display",
    description:
      "Appearance, density, accessibility, and dashboard display preferences.",
    items: ["Theme mode", "Dashboard density", "Motion preferences"],
  },
  {
    title: "Notification Preferences",
    description:
      "Shared alert channels, quiet hours, and module notification rules.",
    items: ["Quiet hours", "Critical alerts", "Module summaries"],
  },
  {
    title: "Module Preferences",
    description:
      "Choose active modules and default landing surfaces.",
    items: ["Money active", "Learning active", "Default workspace"],
  },
];

const accountLinks = [
  {
    label: "Profile",
    href: "/dashboard/profile",
    description: "Manage preferred name and personal context.",
  },
  {
    label: "Privacy",
    href: "https://seangworld.com/privacy.html",
    description: "Review the privacy policy.",
  },
  {
    label: "Terms",
    href: "https://seangworld.com/terms.html",
    description: "Review platform terms.",
  },
];

export default function SettingsPage() {
  const householdModel: HouseholdModel = {
    households: [
      {
        id: "household-primary",
        ownerId: "member-owner",
        name: "Primary household",
        createdAt: "2026-07-17T00:00:00.000Z",
        updatedAt: "2026-07-17T00:00:00.000Z",
      },
    ],
    members: [
      {
        id: "member-owner",
        householdId: "household-primary",
        userId: "member-owner",
        displayName: "Owner",
        isOwner: true,
        joinedAt: "2026-07-17T00:00:00.000Z",
        updatedAt: "2026-07-17T00:00:00.000Z",
      },
      {
        id: "member-household",
        householdId: "household-primary",
        displayName: "Household member",
        isOwner: false,
        role: "Member",
        joinedAt: "2026-07-17T00:00:00.000Z",
        updatedAt: "2026-07-17T00:00:00.000Z",
      },
    ],
  };
  const householdInvitation = buildHouseholdInvitationRequest({
    householdId: "household-primary",
    invitedByMemberId: "member-owner",
    email: "member@example.com",
    role: "Member",
    model: householdModel,
  });
  const householdSharedLink = buildHouseholdSharedLinkRequest({
    householdId: "household-primary",
    kind: "Document",
    sourceRecordId: "document-1",
    title: "Shared document",
    permission: "View",
    grantedByMemberId: "member-owner",
    grantedToMemberIds: ["member-household"],
    model: householdModel,
  });
  const householdVisibleLinks = getHouseholdSharedLinksForMember({
    householdId: "household-primary",
    memberId: "member-household",
    model: {
      ...householdModel,
      sharedLinks: [householdSharedLink],
    },
  });
  const sharedAIContext: SharedAIContextItem[] = [
    {
      id: "context-user-preferences",
      kind: "User",
      source: "beastos",
      sourceRecordId: "personal-hub-context",
      summary: "Owner-provided preferences and AI context controls.",
      permission: "Allowed",
      retention: "Exportable",
    },
    {
      id: "context-money-cashflow",
      kind: "Module",
      source: "money",
      sourceRecordId: "cashflow-summary",
      summary: "Money summary can be referenced but calculations stay with BeastMoney.",
      permission: "Allowed",
      retention: "Session",
    },
    {
      id: "context-private-document",
      kind: "Document",
      source: "documents",
      sourceRecordId: "restricted-document",
      summary: "Restricted document context is withheld from Shared AI.",
      permission: "Restricted",
      retention: "Session",
    },
  ];
  const allowedContext = buildSharedAIContext(sharedAIContext);
  const recommendation = buildSharedAIRecommendation({
    id: "shared-ai-recommendation-preview",
    title: "Review the next useful step",
    context: sharedAIContext,
    ownerModule: "beastos",
  });
  const memoryBoundary = buildSharedAIMemoryBoundary({
    context: sharedAIContext,
    retentionDays: 30,
  });
  const handoff = buildSharedAISpecialistHandoff({
    request: "Help me understand my money alert",
  });

  return (
    <main className="beast-page">
      <div className="beast-container space-y-8">
        <section className="beast-page-header">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <ModuleBadge module="beastos" label="Platform Configuration" />
              <h1 className="beast-title">Settings</h1>
              <p className="beast-subtitle">
                App-level preferences for the BeastOS platform. Money-specific
                cashflow and debt settings remain inside BeastMoney.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/dashboard/profile" className="beast-button">
                Open Profile
              </Link>
              <Link href="/dashboard/money/settings" className="beast-button-secondary">
                Money Settings
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-3">
          {settingsSections.map((section) => (
            <DashboardCard key={section.title} accent="beastos">
              <SectionHeader title={section.title} description={section.description} />
              <div className="mt-5 grid gap-3">
                {section.items.map((item) => (
                  <div
                    key={item}
                    className="rounded-xl border border-[#2a3242] bg-[#111827] p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-bold text-white">{item}</div>
                    </div>
                  </div>
                ))}
              </div>
            </DashboardCard>
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_0.85fr]">
          <DashboardCard accent="documents">
            <SectionHeader
              eyebrow="Privacy & Security"
              title="Account ownership"
              description="BeastOS settings will gather privacy controls, export paths, deletion controls, and security preferences as platform services mature."
            />
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                "Your data belongs to you.",
                "Export and deletion controls will be centralized here.",
                "Security preferences will remain account-level.",
                "Uploads and profile context stay associated with your account.",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-xl border border-[#2a3242] bg-[#111827] p-4 text-sm font-semibold leading-5 text-[#dbe3ef]"
                >
                  {item}
                </div>
              ))}
            </div>
          </DashboardCard>

          <DashboardCard accent="money">
            <SectionHeader
              eyebrow="Account"
              title="Management links"
              description="Identity and policy destinations are separated from platform preferences."
            />
            <div className="mt-5 grid gap-3">
              {accountLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="rounded-xl border border-[#2a3242] bg-[#111827] p-4 transition duration-200 hover:-translate-y-0.5 hover:border-[#38bdf8]/50 hover:bg-[#202634]"
                >
                  <div className="font-black text-white">{link.label}</div>
                  <p className="mt-1 text-sm leading-5 text-[#9aa7b8]">
                    {link.description}
                  </p>
                </Link>
              ))}
            </div>
          </DashboardCard>
        </section>

        <DashboardCard accent="beastos">
          <SectionHeader
            eyebrow="Shared AI"
            title="Context and specialist boundaries"
            description="Shared AI can assemble permissioned context and route handoffs without owning module-specific logic."
          />
          <div className="mt-5 grid gap-4 lg:grid-cols-4">
            {[
              ["Allowed context", allowedContext.length],
              ["Recommendation facts", recommendation.sourceContextIds.length],
              ["Retention days", memoryBoundary.retentionDays],
              ["Handoff", handoff.specialist],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-xl border border-[#2a3242] bg-[#111827] p-4"
              >
                <div className="text-xs font-bold uppercase text-[#7f8da3]">
                  {label}
                </div>
                <div className="mt-2 text-lg font-black text-white">{value}</div>
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {sharedAIContractRules.map((rule) => (
              <div
                key={rule}
                className="rounded-xl border border-[#2a3242] bg-[#0f1419] p-4 text-sm font-semibold text-[#d8dee8]"
              >
                {rule}
              </div>
            ))}
          </div>
        </DashboardCard>

        <DashboardCard accent="family">
          <SectionHeader
            eyebrow="Household"
            title="Lifecycle and shared visibility"
            description="Household actions are routed as BeastOS contract events while source modules keep their own business logic."
          />
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {[
              ["Invitation", householdInvitation.dispatchMode],
              ["Shared links", householdVisibleLinks.length],
              ["Source owner", householdSharedLink.sourceModule],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-xl border border-[#2a3242] bg-[#111827] p-4"
              >
                <div className="text-xs font-bold uppercase text-[#7f8da3]">
                  {label}
                </div>
                <div className="mt-2 text-sm font-black text-white">{value}</div>
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {householdOwnershipRules.slice(0, 4).map((rule) => (
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
