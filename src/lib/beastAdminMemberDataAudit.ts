export type BeastAdminMemberFieldSource = {
  id:
    | "displayName"
    | "email"
    | "emailVerification"
    | "pendingEmailChange"
    | "accountStatus"
    | "role"
    | "householdRole"
    | "enabledModules"
    | "betaAssignments"
    | "accountCreatedAt"
    | "lastSignInAt"
    | "registeredAt"
    | "lastActivityAt"
    | "eventCount"
    | "applicationsUsed"
    | "latestActivity"
    | "timelineEvents";
  label: string;
  displayedAs: string;
  source: string;
  columns: string;
  authoritativeSource: string;
  editable: string;
  synchronization: string;
  accessBoundary: string;
  kind: "direct" | "fallback" | "derived";
};

export const beastAdminMemberFieldSources: BeastAdminMemberFieldSource[] = [
  {
    id: "displayName",
    label: "Member name",
    displayedAs: "Directory name and member heading",
    source: "public.profiles",
    columns:
      "display_name → preferred_name → full_name → username; otherwise null",
    authoritativeSource:
      "public.profiles.display_name, with BeastOS identity fallbacks",
    editable:
      "The owner can update display_name through the audited member account editor.",
    synchronization:
      "Resolved at read time. Missing identity is labeled “Not provided.” in the UI and is never derived from email.",
    accessBoundary:
      "Owner-checked security-definer RPC; no service-role key is used by the browser.",
    kind: "fallback",
  },
  {
    id: "email",
    label: "Authentication email",
    displayedAs: "Directory email and member heading",
    source: "Supabase Auth",
    columns: "auth.users.email",
    authoritativeSource: "Supabase Auth user identity",
    editable:
      "Editable only through the confirmed owner-only server action backed by the Supabase Auth Admin API.",
    synchronization:
      "Read directly from auth.users for every request. No profile email copy is written.",
    accessBoundary:
      "Reads use the owner-checked RPC; writes use a server-only service-role client after cookie-bound owner verification.",
    kind: "direct",
  },
  {
    id: "emailVerification",
    label: "Email verification",
    displayedAs: "Account details",
    source: "Supabase Auth",
    columns: "auth.users.email_confirmed_at",
    authoritativeSource: "Supabase Auth user identity",
    editable:
      "Not editable in BeastAdmin. It changes only through the Auth verification workflow.",
    synchronization:
      "Read directly for each directory request. Accounts without an Auth email are labeled “Not provided.”",
    accessBoundary:
      "auth.users is read only inside the owner-checked security-definer RPC.",
    kind: "direct",
  },
  {
    id: "pendingEmailChange",
    label: "Pending email change",
    displayedAs: "Account details and owner verification action",
    source: "Supabase Auth",
    columns: "auth.users.email_change, auth.users.email_change_sent_at",
    authoritativeSource: "Supabase Auth secure email-change state",
    editable:
      "Not edited as profile data. Members initiate the Auth workflow; owners may only resend an existing verification when supported.",
    synchronization:
      "Projected at read time. The current auth.users.email remains the displayed sign-in email until Supabase completes verification.",
    accessBoundary:
      "Only the pending address and sent timestamp leave the owner-checked security-definer RPC.",
    kind: "direct",
  },
  {
    id: "accountStatus",
    label: "Account status",
    displayedAs: "Directory card and account details",
    source: "Supabase Auth",
    columns: "deleted_at, banned_until, invited_at, last_sign_in_at",
    authoritativeSource: "Supabase Auth account lifecycle state",
    editable:
      "Active and Suspended are editable through the owner-only server action. Invited remains Auth-controlled; deletion is unsupported.",
    synchronization:
      "Derived at read time as Deleted, Suspended, Invited, or Active using explicit Auth timestamps.",
    accessBoundary:
      "Only the normalized status leaves the owner-checked security-definer RPC.",
    kind: "derived",
  },
  {
    id: "role",
    label: "Profile access role",
    displayedAs: "Member heading and search",
    source: "public.profiles",
    columns: "role",
    authoritativeSource: "public.profiles.role",
    editable:
      "Editable through the audited owner-only account RPC. A database trigger blocks self-service privilege escalation.",
    synchronization:
      "Independent from household roles and feature-flag assignments. No Auth metadata synchronization exists.",
    accessBoundary:
      "Owner-checked RPC plus profiles RLS and privilege-escalation trigger.",
    kind: "direct",
  },
  {
    id: "householdRole",
    label: "Household role",
    displayedAs: "Account details",
    source: "No persisted source connected",
    columns: "null",
    authoritativeSource: "Not available",
    editable: "Not editable because Beast has no household-membership record.",
    synchronization:
      "Always labeled “Not provided.” The directory does not infer household relationships.",
    accessBoundary: "No household or family fixture is queried.",
    kind: "direct",
  },
  {
    id: "enabledModules",
    label: "Enabled modules",
    displayedAs: "Account access badges and module filter",
    source:
      "Canonical module registry, profile role, and beast_admin_member_module_access",
    columns: "identifier, enabled, visibility, role, member override",
    authoritativeSource:
      "The same registry, owner-role rule, and persisted member override used by navigation",
    editable:
      "BeastMoney and BeastEducation access are editable per member. BeastOS stays available and BeastAdmin remains role-controlled.",
    synchronization:
      "Resolved in both navigation and this directory from persisted overrides. Missing overrides preserve existing access.",
    accessBoundary:
      "Only owner-visible registry metadata and the already-authorized profile role are used.",
    kind: "derived",
  },
  {
    id: "betaAssignments",
    label: "Beta assignments",
    displayedAs: "Account access details and beta filter",
    source: "BeastAdmin feature flags",
    columns:
      "beast_admin_feature_flags + effective member/role assignment stage",
    authoritativeSource: "Owner-managed feature-flag assignments",
    editable:
      "Direct member Beta assignments are editable here. Role, module, and non-Beta overrides remain managed in Feature Flags.",
    synchronization:
      "Resolved at read time with member assignment precedence over role assignment. Only effective Internal Testing and Beta stages are listed.",
    accessBoundary:
      "Owner-scoped assignment rows are joined inside the owner-checked RPC.",
    kind: "derived",
  },
  {
    id: "accountCreatedAt",
    label: "Account created",
    displayedAs: "Account details",
    source: "Supabase Auth",
    columns: "auth.users.created_at",
    authoritativeSource: "Supabase Auth account creation timestamp",
    editable: "Database-generated and read-only.",
    synchronization: "Read directly for each directory request.",
    accessBoundary:
      "Exposed only through the owner-checked security-definer RPC.",
    kind: "direct",
  },
  {
    id: "lastSignInAt",
    label: "Last sign-in",
    displayedAs: "Account details",
    source: "Supabase Auth",
    columns: "auth.users.last_sign_in_at",
    authoritativeSource: "Supabase Auth sign-in timestamp",
    editable: "Managed by Supabase Auth and read-only in BeastAdmin.",
    synchronization:
      "Read directly. Missing timestamps are labeled “Not provided.”",
    accessBoundary:
      "Exposed only through the owner-checked security-definer RPC.",
    kind: "direct",
  },
  {
    id: "registeredAt",
    label: "Profile created",
    displayedAs: "Profile Created metric and registration timeline entry",
    source: "public.profiles",
    columns: "created_at",
    authoritativeSource: "public.profiles.created_at",
    editable: "Database-generated and not editable through the application.",
    synchronization:
      "A profile is normally created by the auth.users insert trigger. Backfilled profiles can have a later timestamp than the Auth signup.",
    accessBoundary:
      "Owner-checked security-definer RPC; authenticated execution only.",
    kind: "direct",
  },
  {
    id: "lastActivityAt",
    label: "Latest permissioned activity",
    displayedAs: "Directory activity date",
    source: "Cross-module timeline query",
    columns: "MAX(occurred_at) across the permitted event union",
    authoritativeSource: "The contributing module record timestamps",
    editable:
      "Not directly editable. It changes when source applications persist supported activity.",
    synchronization:
      "Derived at read time. Missing supported activity remains null and is labeled “Not provided.”",
    accessBoundary:
      "Owner-checked security-definer RPC; raw private content is excluded.",
    kind: "derived",
  },
  {
    id: "eventCount",
    label: "Journey events",
    displayedAs: "Directory and Journey Events totals",
    source: "Cross-module timeline query",
    columns: "Count of permitted events plus derived first-module events",
    authoritativeSource: "The member timeline RPC’s bounded event union",
    editable: "Not directly editable.",
    synchronization:
      "Recomputed at read time. It is not a login, page-view, or complete activity count.",
    accessBoundary:
      "Owner-checked security-definer RPC; sensitive values and contents are excluded.",
    kind: "derived",
  },
  {
    id: "applicationsUsed",
    label: "Applications used",
    displayedAs: "Applications Used metric",
    source: "Derived member timeline",
    columns: "Count of category = “module” activation events",
    authoritativeSource: "First supported persisted activity per module",
    editable: "Not directly editable.",
    synchronization:
      "Derived from timeline events in the loaded snapshot. It is not an entitlement or installation count.",
    accessBoundary: "Computed in the owner-only Members workspace.",
    kind: "derived",
  },
  {
    id: "latestActivity",
    label: "Latest activity",
    displayedAs: "Latest Activity metric",
    source: "Derived member timeline",
    columns: "events[0].occurredAt, falling back to member.registeredAt",
    authoritativeSource: "Latest event returned by the member timeline RPC",
    editable: "Not directly editable.",
    synchronization: "Recomputed whenever the timeline is refreshed.",
    accessBoundary: "Computed in the owner-only Members workspace.",
    kind: "derived",
  },
  {
    id: "timelineEvents",
    label: "Timeline event",
    displayedAs: "Event time, category, application, title, and detail",
    source:
      "profiles, agent_conversations, goal lifecycle, learning, payment, retirement, and document records",
    columns: "Source IDs and timestamps with privacy-bounded labels",
    authoritativeSource: "Each contributing application table",
    editable:
      "Only through the owning application’s normal workflow; the Members page is read-only.",
    synchronization:
      "Unioned at read time. Module activation events are derived from the first supported activity.",
    accessBoundary:
      "Owner-checked security-definer RPC excludes messages, balances, payment amounts, and document contents.",
    kind: "derived",
  },
];

export const beastAdminMemberNonSources = [
  {
    source: "Household and Family",
    finding:
      "No persisted Household or Family member table feeds BeastAdmin Members. Current Household and Family models are application contracts with mock fixtures only.",
  },
  {
    source: "Learning and Education profiles",
    finding:
      "learning_profiles.display_name and education profile context are not used for BeastAdmin identity. They remain module-owned records.",
  },
  {
    source: "Feature flags and beta assignments",
    finding:
      "Assignments store member_id only. Name and email are joined from profiles and auth.users at read time; assignments never override profile.role.",
  },
  {
    source: "Legacy BeastAdmin fixtures",
    finding:
      "The old .local member emails, names, statuses, feedback, and beta assignments are deterministic fixtures, not authenticated members.",
  },
] as const;
