export const beastAdminPlannedWorkspaceStatuses = [
  "deferred",
  "planning",
  "research",
  "future",
] as const;

export type BeastAdminPlannedWorkspaceStatus =
  (typeof beastAdminPlannedWorkspaceStatuses)[number];

export type BeastAdminPlannedWorkspace = {
  id: "crm" | "billing" | "marketplace";
  name: string;
  status: BeastAdminPlannedWorkspaceStatus;
  purpose: string;
  reason: string;
  dependencies: readonly string[];
  targetMilestone: string;
};

export const beastAdminPlannedWorkspaceStatusDescriptions: Record<
  BeastAdminPlannedWorkspaceStatus,
  string
> = {
  deferred: "Intentionally postponed while higher-priority work matures.",
  planning: "Its boundaries and requirements are being defined.",
  research: "The need and safe product model still require investigation.",
  future: "Recognized as a possible capability, with no active planning.",
};

const unscheduledMilestone =
  "Not scheduled — requires an owner-approved roadmap item.";

export const beastAdminPlannedWorkspaces: readonly BeastAdminPlannedWorkspace[] =
  [
    {
      id: "crm",
      name: "Future CRM",
      status: "research",
      purpose:
        "Define a future owner workspace for external customer and partner relationship management.",
      reason:
        "No CRM workflow has been approved, and member identity records must not be repurposed as sales records.",
      dependencies: [
        "Approved CRM scope",
        "Contact ownership and consent model",
        "Integration and retention requirements",
      ],
      targetMilestone: unscheduledMilestone,
    },
    {
      id: "billing",
      name: "Future Billing",
      status: "planning",
      purpose:
        "Define a future owner workspace for platform-wide subscription and revenue operations.",
      reason:
        "Current billing remains source-owned until cross-product membership and payment boundaries are approved.",
      dependencies: [
        "Unified membership policy",
        "Authoritative billing provider model",
        "Owner reporting requirements",
      ],
      targetMilestone: unscheduledMilestone,
    },
    {
      id: "marketplace",
      name: "Future Marketplace",
      status: "future",
      purpose:
        "Reserve a future workspace for reviewed ecosystem offerings and partner distribution.",
      reason:
        "No marketplace business model or partner governance has been approved.",
      dependencies: [
        "Marketplace policy",
        "Partner review and permission model",
        "Payment, fulfillment, and support boundaries",
      ],
      targetMilestone: unscheduledMilestone,
    },
  ];

export function getBeastAdminPlannedWorkspace(
  id: BeastAdminPlannedWorkspace["id"]
) {
  return (
    beastAdminPlannedWorkspaces.find((workspace) => workspace.id === id) || null
  );
}
