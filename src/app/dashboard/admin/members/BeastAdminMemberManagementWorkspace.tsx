"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  DashboardCard,
  MetricTile,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import {
  beastAdminMemberTimelineCategories,
  beastAdminMemberTimelineCategoryLabels,
  buildBeastAdminMemberTimelineCounts,
  filterBeastAdminMemberTimelineEvents,
  mergeBeastAdminMemberEmailStatuses,
  normalizeBeastAdminMemberDirectory,
  normalizeBeastAdminMemberEmailStatuses,
  normalizeBeastAdminMemberTimeline,
  type BeastAdminMemberAccountStatus,
  type BeastAdminMemberTimelineCategory,
  type BeastAdminMemberTimelineSnapshot,
} from "@/lib/beastAdminMemberTimeline";
import {
  BEAST_ADMIN_MEMBER_USAGE_PERIOD_DAYS,
  buildBeastAdminManagedMemberDirectory,
  getBeastAdminMostUsedModuleLabel,
  normalizeBeastAdminMemberUsageSummary,
  type BeastAdminManagedMember,
} from "@/lib/beastAdminMemberManagement";
import { beastAdminMemberFieldSources } from "@/lib/beastAdminMemberDataAudit";
import {
  normalizeBeastFeatureFlags,
  type BeastFeatureFlag,
} from "@/lib/beastFeatureFlags";
import {
  normalizeBeastAdminInvitationDirectory,
  type BeastAdminInvitationHousehold,
  type BeastAdminMemberInvitation,
} from "@/lib/beastAdminMemberInvitations";
import {
  BEAST_VERIFICATION_REMINDER_BODY,
  BEAST_VERIFICATION_REMINDER_SUBJECT,
  beastEmailVerificationPolicy,
  getBeastEmailVerificationAccessImpact,
} from "@/lib/beastEmailVerificationPolicy";
import { createClient } from "@/lib/supabase/client";
import { BeastAdminAccountAuditLog } from "./BeastAdminAccountAuditLog";
import { BeastAdminMemberAccessHistory } from "./BeastAdminMemberAccessHistory";
import { BeastAdminMemberEditor } from "./BeastAdminMemberEditor";
import { BeastAdminMemberInvitationPanel } from "./BeastAdminMemberInvitationPanel";
import {
  BeastAdminMemberManagementTable,
  type BeastAdminMemberRowAction,
} from "./BeastAdminMemberManagementTable";

const MISSING_VALUE = "Not provided.";

const accountStatusLabels: Record<BeastAdminMemberAccountStatus, string> = {
  active: "Active",
  invited: "Invited",
  suspended: "Suspended",
  deleted: "Deleted",
};

const categoryClasses: Record<BeastAdminMemberTimelineCategory, string> = {
  registration: "border-sky-300/35 bg-sky-300/10 text-sky-100",
  module: "border-amber-300/35 bg-amber-300/10 text-amber-100",
  conversation: "border-purple-300/35 bg-purple-300/10 text-purple-100",
  goals: "border-yellow-300/35 bg-yellow-300/10 text-yellow-100",
  learning: "border-indigo-300/35 bg-indigo-300/10 text-indigo-100",
  money: "border-green-300/35 bg-green-300/10 text-green-100",
  health: "border-red-300/35 bg-red-300/10 text-red-100",
  documents: "border-slate-300/35 bg-slate-300/10 text-slate-100",
};

function formatDate(value: string | null) {
  if (!value) return MISSING_VALUE;
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function memberCanBeManaged(member: BeastAdminManagedMember | undefined) {
  return Boolean(
    member &&
      member.accountKind === "member" &&
      member.accountStatus !== "deleted" &&
      member.email
  );
}

function humanizeDirectoryError(error: unknown) {
  const message =
    error && typeof error === "object" && "message" in error
      ? String(error.message)
      : "";
  if (
    /get_beast_admin_member_|schema cache|function .* does not exist/i.test(
      message
    )
  ) {
    return "The authoritative member sources are not connected in this environment.";
  }
  if (/permission|owner access|required|42501/i.test(message)) {
    return "Member management is restricted to the Beast owner.";
  }
  return "BeastAdmin could not load the authoritative member directory.";
}

function formatActionDiagnostic(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  return JSON.stringify(value, null, 2);
}

function DirectoryField({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-[#2a3242] bg-[#111827] p-4">
      <dt className="text-[10px] font-black uppercase tracking-wide text-[#7f8da3]">
        {label}
      </dt>
      <dd className="mt-2 break-words text-sm font-bold text-white">{value}</dd>
    </div>
  );
}

export function BeastAdminMemberManagementWorkspace() {
  const [members, setMembers] = useState<BeastAdminManagedMember[]>([]);
  const [featureFlags, setFeatureFlags] = useState<BeastFeatureFlag[]>([]);
  const [featureFlagsAvailable, setFeatureFlagsAvailable] = useState(true);
  const [invitations, setInvitations] = useState<
    BeastAdminMemberInvitation[]
  >([]);
  const [households, setHouseholds] = useState<
    BeastAdminInvitationHousehold[]
  >([]);
  const [usageEvidenceAvailable, setUsageEvidenceAvailable] = useState(true);
  const [directoryLoading, setDirectoryLoading] = useState(true);
  const [directoryError, setDirectoryError] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [pendingMemberId, setPendingMemberId] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [actionDiagnostic, setActionDiagnostic] = useState("");
  const [timeline, setTimeline] =
    useState<BeastAdminMemberTimelineSnapshot | null>(null);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [timelineError, setTimelineError] = useState("");
  const [timelineCategory, setTimelineCategory] = useState<
    BeastAdminMemberTimelineCategory | "all"
  >("all");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadDirectory() {
      setDirectoryLoading(true);
      setDirectoryError("");
      try {
        const supabase = createClient();
        const [
          directoryResult,
          emailStatusResult,
          featureFlagResult,
          invitationResult,
          usageResult,
        ] = await Promise.all([
          supabase.rpc("get_beast_admin_member_directory"),
          supabase.rpc("get_beast_admin_member_email_statuses"),
          supabase.rpc("get_beast_admin_feature_flags"),
          supabase.rpc("get_beast_admin_member_invitations"),
          supabase.rpc("get_beast_admin_member_usage_summary", {
            usage_period_days: BEAST_ADMIN_MEMBER_USAGE_PERIOD_DAYS,
          }),
        ]);

        if (directoryResult.error) throw directoryResult.error;
        if (emailStatusResult.error) throw emailStatusResult.error;
        if (invitationResult.error) throw invitationResult.error;

        const directory = normalizeBeastAdminMemberDirectory(
          directoryResult.data
        );
        const emailStatuses = normalizeBeastAdminMemberEmailStatuses(
          emailStatusResult.data
        );
        const invitationDirectory = normalizeBeastAdminInvitationDirectory(
          invitationResult.data
        );
        const usage = usageResult.error
          ? []
          : normalizeBeastAdminMemberUsageSummary(usageResult.data);
        if (!directory || !emailStatuses || !invitationDirectory) {
          throw new Error("Member directory data was invalid.");
        }
        if (!usageResult.error && !usage) {
          throw new Error("Member usage data was invalid.");
        }

        const usageAvailable = !usageResult.error;
        const membersWithUsage = buildBeastAdminManagedMemberDirectory({
          members: mergeBeastAdminMemberEmailStatuses(
            directory,
            emailStatuses
          ),
          usage: usage || [],
          usageEvidenceAvailable: usageAvailable,
        });
        const invitationByMember = new Map(
          invitationDirectory.invitations.map((invitation) => [
            invitation.memberId,
            invitation,
          ])
        );
        const nextMembers = membersWithUsage.map((member) => {
          const invitation = invitationByMember.get(member.id);
          if (!invitation?.householdName || invitation.state === "revoked") {
            return member;
          }
          const householdRole =
            invitation.state === "accepted" ? "Member" : "Pending member";
          return {
            ...member,
            householdRole: `${householdRole} · ${invitation.householdName}${
              invitation.relationship ? ` · ${invitation.relationship}` : ""
            }`,
          };
        });
        const nextFlags = featureFlagResult.error
          ? null
          : normalizeBeastFeatureFlags(featureFlagResult.data);
        if (!active) return;

        setMembers(nextMembers);
        setUsageEvidenceAvailable(usageAvailable);
        setFeatureFlags(nextFlags || []);
        setFeatureFlagsAvailable(Boolean(nextFlags));
        setInvitations(invitationDirectory.invitations);
        setHouseholds(invitationDirectory.households);
        setSelectedMemberIds((current) =>
          current.filter((id) =>
            nextMembers.some((member) => member.id === id)
          )
        );
        setSelectedMemberId((current) =>
          nextMembers.some((member) => member.id === current) ? current : ""
        );
      } catch (error) {
        if (!active) return;
        setMembers([]);
        setFeatureFlags([]);
        setFeatureFlagsAvailable(false);
        setInvitations([]);
        setHouseholds([]);
        setUsageEvidenceAvailable(false);
        setDirectoryError(humanizeDirectoryError(error));
      } finally {
        if (active) setDirectoryLoading(false);
      }
    }

    void loadDirectory();
    return () => {
      active = false;
    };
  }, [refreshKey]);

  useEffect(() => {
    let active = true;
    if (!drawerOpen || !selectedMemberId) {
      setTimeline(null);
      setTimelineError("");
      return;
    }

    async function loadTimeline() {
      setTimelineLoading(true);
      setTimelineError("");
      setTimelineCategory("all");
      try {
        const supabase = createClient();
        const { data, error } = await supabase.rpc(
          "get_beast_admin_member_timeline",
          {
            selected_member_id: selectedMemberId,
            event_limit: 200,
          }
        );
        if (error) throw error;
        const snapshot = normalizeBeastAdminMemberTimeline(data);
        if (!snapshot) throw new Error("Member timeline data was invalid.");
        if (active) setTimeline(snapshot);
      } catch (error) {
        if (active) {
          setTimeline(null);
          setTimelineError(humanizeDirectoryError(error));
        }
      } finally {
        if (active) setTimelineLoading(false);
      }
    }

    void loadTimeline();
    return () => {
      active = false;
    };
  }, [drawerOpen, selectedMemberId]);

  const selectedMember = members.find(
    (member) => member.id === selectedMemberId
  );
  const selectedMemberCanBeManaged = memberCanBeManaged(selectedMember);
  const visibleTimelineEvents = useMemo(
    () =>
      timeline
        ? filterBeastAdminMemberTimelineEvents(
            timeline.events,
            timelineCategory
          )
        : [],
    [timeline, timelineCategory]
  );
  const timelineCounts = useMemo(
    () => buildBeastAdminMemberTimelineCounts(timeline?.events || []),
    [timeline]
  );

  function openMember(
    member: BeastAdminManagedMember,
    options: { edit?: boolean; section?: string } = {}
  ) {
    setSelectedMemberId(member.id);
    setDrawerOpen(true);
    setEditorOpen(Boolean(options.edit));
    setActionError("");
    setActionSuccess("");
    setActionDiagnostic("");
    window.setTimeout(() => {
      document
        .getElementById(`member-management-${options.section || "account"}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
  }

  function directBetaFlagIds(memberId: string) {
    return featureFlags
      .filter((flag) =>
        flag.assignments.some(
          (assignment) =>
            assignment.scopeType === "member" &&
            assignment.memberId === memberId &&
            assignment.stage === "beta"
        )
      )
      .map((flag) => flag.id);
  }

  async function parseActionResponse(
    response: Response,
    fallback: string
  ) {
    const payload: unknown = await response.json().catch(() => null);
    setActionDiagnostic(
      payload &&
        typeof payload === "object" &&
        "diagnostic" in payload
        ? formatActionDiagnostic(payload.diagnostic)
        : ""
    );
    if (
      !response.ok ||
      !payload ||
      typeof payload !== "object" ||
      !("message" in payload) ||
      typeof payload.message !== "string"
    ) {
      throw new Error(
        payload &&
        typeof payload === "object" &&
        "error" in payload &&
        typeof payload.error === "string"
          ? payload.error
          : fallback
      );
    }
    return payload.message;
  }

  async function resendVerification(member: BeastAdminManagedMember) {
    if (
      !window.confirm(
        `Resend the official Supabase verification email to ${member.email}? The member must open that email to verify the account.`
      )
    ) {
      return;
    }
    setPendingMemberId(member.id);
    setActionError("");
    setActionSuccess("");
    setActionDiagnostic("");
    try {
      const response = await fetch(
        `/api/admin/members/${encodeURIComponent(
          member.id
        )}/email-verification`,
        { method: "POST" }
      );
      setActionSuccess(
        await parseActionResponse(
          response,
          "BeastAdmin could not resend verification."
        )
      );
      setRefreshKey((current) => current + 1);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "BeastAdmin could not resend verification."
      );
    } finally {
      setPendingMemberId("");
    }
  }

  async function sendVerificationReminder(member: BeastAdminManagedMember) {
    if (
      member.emailVerificationStatus !== "unverified" ||
      !memberCanBeManaged(member)
    ) {
      return;
    }
    if (
      !window.confirm(
        `${BEAST_VERIFICATION_REMINDER_SUBJECT}\n\n${BEAST_VERIFICATION_REMINDER_BODY}\n\nThis private Admin message does not verify the member's email. Send it now?`
      )
    ) {
      return;
    }

    setPendingMemberId(member.id);
    setActionError("");
    setActionSuccess("");
    setActionDiagnostic("");
    try {
      const response = await fetch(
        `/api/admin/members/${encodeURIComponent(
          member.id
        )}/verification-outreach`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "send_reminder" }),
        }
      );
      setActionSuccess(
        await parseActionResponse(
          response,
          "BeastAdmin could not send the private verification reminder."
        )
      );
      setRefreshKey((current) => current + 1);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "BeastAdmin could not send the private verification reminder."
      );
    } finally {
      setPendingMemberId("");
    }
  }

  async function copyLoginEmail(member: BeastAdminManagedMember) {
    if (!member.email) return;
    setActionError("");
    setActionSuccess("");
    setActionDiagnostic("");
    try {
      await navigator.clipboard.writeText(member.email);
      setActionSuccess("Authoritative Supabase Auth sign-in email copied.");
    } catch {
      setActionError(
        "BeastAdmin could not copy the sign-in email. Select and copy it from the member detail."
      );
    }
  }

  async function passwordReset(member: BeastAdminManagedMember) {
    if (
      !window.confirm(
        `Send a password-reset email to ${member.displayName}'s authoritative login email?`
      )
    ) {
      return;
    }
    setPendingMemberId(member.id);
    setActionError("");
    setActionSuccess("");
    setActionDiagnostic("");
    try {
      const response = await fetch(
        `/api/admin/members/${encodeURIComponent(member.id)}/password-reset`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ reason: null }),
        }
      );
      setActionSuccess(
        await parseActionResponse(
          response,
          "BeastAdmin could not request a password reset."
        )
      );
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "BeastAdmin could not request a password reset."
      );
    } finally {
      setPendingMemberId("");
    }
  }

  async function revokeSessions(member: BeastAdminManagedMember) {
    if (
      !window.confirm(
        `Revoke all active Beast sessions for ${member.displayName}?`
      )
    ) {
      return;
    }
    setPendingMemberId(member.id);
    setActionError("");
    setActionSuccess("");
    setActionDiagnostic("");
    try {
      const response = await fetch(
        `/api/admin/members/${encodeURIComponent(member.id)}/access-history`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action: "revoke_sessions",
            reason: null,
          }),
        }
      );
      setActionSuccess(
        await parseActionResponse(
          response,
          "BeastAdmin could not revoke active sessions."
        )
      );
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "BeastAdmin could not revoke active sessions."
      );
    } finally {
      setPendingMemberId("");
    }
  }

  async function toggleSuspension(member: BeastAdminManagedMember) {
    if (!member.email || !memberCanBeManaged(member)) return;
    const nextStatus =
      member.accountStatus === "suspended" ? "active" : "suspended";
    const restoring = nextStatus === "active";
    if (
      !window.confirm(
        `${restoring ? "Restore" : "Suspend"} ${member.displayName}'s account? ${
          restoring
            ? "The member will regain sign-in access."
            : "The member will be unable to sign in until restored."
        }`
      )
    ) {
      return;
    }

    setPendingMemberId(member.id);
    setActionError("");
    setActionSuccess("");
    setActionDiagnostic("");
    try {
      const response = await fetch(
        `/api/admin/members/${encodeURIComponent(member.id)}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            displayName:
              member.displayName === MISSING_VALUE
                ? null
                : member.displayName,
            email: member.email,
            role: member.role,
            accountStatus: nextStatus,
            moduleAccess: member.enabledModules
              .map((module) => module.id)
              .filter((id) => ["money", "learning", "home"].includes(id)),
            betaFlagIds: directBetaFlagIds(member.id),
            confirmEmailChange: false,
          }),
        }
      );
      setActionSuccess(
        await parseActionResponse(
          response,
          `BeastAdmin could not ${
            restoring ? "restore" : "suspend"
          } this account.`
        )
      );
      setRefreshKey((current) => current + 1);
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "BeastAdmin could not update account status."
      );
    } finally {
      setPendingMemberId("");
    }
  }

  function handleRowAction(
    action: BeastAdminMemberRowAction,
    member: BeastAdminManagedMember
  ) {
    switch (action) {
      case "view":
        openMember(member);
        return;
      case "edit":
      case "manage_modules":
      case "manage_beta":
        openMember(member, { edit: true, section: "account" });
        return;
      case "message":
        window.location.href = `/dashboard/admin/messages?member=${encodeURIComponent(
          member.id
        )}`;
        return;
      case "copy_login_email":
        void copyLoginEmail(member);
        return;
      case "send_verification_reminder":
        void sendVerificationReminder(member);
        return;
      case "resend_verification":
        void resendVerification(member);
        return;
      case "view_verification_history":
        openMember(member, { section: "verification" });
        return;
      case "password_reset":
        void passwordReset(member);
        return;
      case "toggle_suspension":
        void toggleSuspension(member);
        return;
      case "revoke_sessions":
        void revokeSessions(member);
        return;
      case "timeline":
        openMember(member, { section: "timeline" });
    }
  }

  if (directoryLoading) {
    return (
      <DashboardCard accent="admin">
        <SectionHeader
          eyebrow="Member management"
          title="Loading authoritative Beast accounts"
          description="BeastAdmin is joining owner-approved Auth, profile, access, beta, household, and activity sources."
        />
        <div className="mt-5 grid gap-3" aria-busy="true">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-20 animate-pulse rounded-xl border border-[#2a3242] bg-[#111827]"
            />
          ))}
        </div>
      </DashboardCard>
    );
  }

  if (directoryError) {
    return (
      <DashboardCard accent="red">
        <SectionHeader
          eyebrow="Member management"
          title="Authoritative account directory unavailable"
          description={`${directoryError} No users are substituted from fixtures, assignments, or placeholder data.`}
        />
        <button
          type="button"
          className="beast-button mt-5"
          onClick={() => setRefreshKey((current) => current + 1)}
        >
          Retry
        </button>
      </DashboardCard>
    );
  }

  if (!members.length) {
    return (
      <DashboardCard accent="admin">
        <SectionHeader
          eyebrow="Member management"
          title="No authenticated Beast accounts exist"
          description="The authoritative Supabase Auth directory returned no accounts. BeastAdmin will never create member rows from seeded or placeholder profile data."
        />
        <div className="mt-5">
          <BeastAdminMemberInvitationPanel
            invitations={invitations}
            households={households}
            featureFlags={featureFlags}
            onChanged={(message, memberId) => {
              setActionSuccess(message);
              if (memberId) setSelectedMemberId(memberId);
              setRefreshKey((current) => current + 1);
            }}
          />
        </div>
      </DashboardCard>
    );
  }

  return (
    <div className="min-w-0 space-y-6">
      {actionError ? (
        <p
          role="alert"
          className="rounded-xl border border-red-300/30 bg-red-300/10 p-4 text-sm font-bold text-red-100"
        >
          {actionError}
        </p>
      ) : null}
      {actionSuccess ? (
        <p
          role="status"
          className="rounded-xl border border-green-300/30 bg-green-300/10 p-4 text-sm font-bold text-green-100"
        >
          {actionSuccess}
        </p>
      ) : null}
      {actionDiagnostic ? (
        <details className="rounded-xl border border-sky-300/25 bg-sky-300/10 p-4 text-sky-100">
          <summary className="cursor-pointer text-sm font-black">
            Owner technical diagnostics
          </summary>
          <pre className="mt-3 max-w-full overflow-x-auto whitespace-pre-wrap break-words text-xs leading-5">
            {actionDiagnostic}
          </pre>
        </details>
      ) : null}

      <BeastAdminMemberManagementTable
        members={members}
        usageEvidenceAvailable={usageEvidenceAvailable}
        selectedMemberIds={selectedMemberIds}
        pendingMemberId={pendingMemberId}
        onSelectedMemberIdsChange={setSelectedMemberIds}
        onAction={handleRowAction}
      />

      <details className="rounded-2xl border border-[#2a3242] bg-[#0b1220]">
        <summary className="cursor-pointer px-5 py-4 font-black text-white">
          Member invitations
          <span className="ml-2 text-xs font-bold text-[#7f8da3]">
            Create and manage pending Beast identities
          </span>
        </summary>
        <div className="border-t border-[#2a3242] p-4">
          <BeastAdminMemberInvitationPanel
            invitations={invitations}
            households={households}
            featureFlags={featureFlags}
            onChanged={(message, memberId) => {
              setActionSuccess(message);
              if (memberId) setSelectedMemberId(memberId);
              setRefreshKey((current) => current + 1);
            }}
          />
        </div>
      </details>

      <details className="rounded-2xl border border-[#2a3242] bg-[#0b1220]">
        <summary className="cursor-pointer px-5 py-4 font-black text-white">
          Platform-wide account audit
          <span className="ml-2 text-xs font-bold text-[#7f8da3]">
            Search immutable sensitive-action history
          </span>
        </summary>
        <div className="border-t border-[#2a3242] p-4">
          <BeastAdminAccountAuditLog
            members={members.map((member) => ({
              id: member.id,
              displayName: member.displayName,
            }))}
          />
        </div>
      </details>

      {drawerOpen && selectedMember ? (
        <div className="fixed inset-0 z-[80] flex justify-end bg-black/75">
          <button
            type="button"
            aria-label="Close member detail"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 cursor-default"
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="member-detail-title"
            className="relative h-dvh w-full max-w-5xl overflow-y-auto border-l border-[#344052] bg-[#070b13] shadow-2xl"
          >
            <header className="sticky top-0 z-20 flex min-w-0 items-start justify-between gap-4 border-b border-[#2a3242] bg-[#070b13]/95 px-4 py-4 backdrop-blur sm:px-6">
              <div className="min-w-0">
                <p className="beast-kicker">Authoritative member detail</p>
                <h2
                  id="member-detail-title"
                  className="mt-1 truncate text-xl font-black text-white sm:text-2xl"
                >
                  {selectedMember.displayName}
                </h2>
                <p className="mt-1 break-all text-xs text-[#9aa7b8]">
                  {selectedMember.email || MISSING_VALUE}
                </p>
              </div>
              <button
                type="button"
                className="beast-button-secondary min-h-11 shrink-0"
                onClick={() => setDrawerOpen(false)}
              >
                Close
              </button>
            </header>

            <div className="min-w-0 space-y-6 p-4 sm:p-6">
              <section id="member-management-account">
                <DashboardCard accent="admin">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <SectionHeader
                      eyebrow="Account identity"
                      title="Authentication, role, and access"
                      description="Auth owns login identity. Profile, household, module, and beta values retain their approved source boundaries."
                    />
                    {selectedMemberCanBeManaged ? (
                      <button
                        type="button"
                        className="beast-button min-h-11 shrink-0"
                        onClick={() =>
                          setEditorOpen((current) => !current)
                        }
                      >
                        {editorOpen ? "Close editor" : "Edit account"}
                      </button>
                    ) : (
                      <p className="max-w-sm text-sm font-bold leading-6 text-amber-100">
                        Protected, unmanaged, and deleted accounts remain
                        read-only.
                      </p>
                    )}
                  </div>

                  <dl className="mt-5 grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <DirectoryField
                      label="Display name"
                      value={selectedMember.displayName}
                    />
                    <DirectoryField
                      label="Login email"
                      value={selectedMember.email || MISSING_VALUE}
                    />
                    <DirectoryField
                      label="Email verification"
                      value={
                        selectedMember.emailVerificationStatus === "verified"
                          ? "Verified"
                          : selectedMember.emailVerificationStatus ===
                              "unverified"
                            ? "Unverified"
                            : MISSING_VALUE
                      }
                    />
                    <DirectoryField
                      label="Verified at"
                      value={formatDate(selectedMember.verifiedAt || null)}
                    />
                    <DirectoryField
                      label="Last verification email sent"
                      value={formatDate(
                        selectedMember.lastVerificationEmailSentAt || null
                      )}
                    />
                    <DirectoryField
                      label="Verification access impact"
                      value={getBeastEmailVerificationAccessImpact(
                        selectedMember.emailVerificationStatus === "verified"
                      )}
                    />
                    <DirectoryField
                      label="Account status"
                      value={
                        accountStatusLabels[selectedMember.accountStatus]
                      }
                    />
                    <DirectoryField
                      label="Beast role"
                      value={selectedMember.role}
                    />
                    <DirectoryField
                      label="Household role"
                      value={selectedMember.householdRole || MISSING_VALUE}
                    />
                    <DirectoryField
                      label="Most-used module"
                      value={getBeastAdminMostUsedModuleLabel(selectedMember)}
                    />
                    <DirectoryField
                      label="Last sign-in"
                      value={formatDate(selectedMember.lastSignInAt)}
                    />
                    <DirectoryField
                      label="Last active"
                      value={formatDate(selectedMember.lastActivityAt)}
                    />
                    <DirectoryField
                      label="Joined"
                      value={formatDate(selectedMember.createdAt)}
                    />
                  </dl>

                  <div className="mt-5 grid min-w-0 gap-4 lg:grid-cols-2">
                    <section className="min-w-0 rounded-xl border border-[#2a3242] bg-[#111827] p-4">
                      <h3 className="font-black text-white">Module access</h3>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {selectedMember.enabledModules.length ? (
                          selectedMember.enabledModules.map((module) => (
                            <span
                              key={module.id}
                              className="rounded-full border border-sky-300/30 bg-sky-300/10 px-2.5 py-1 text-xs font-black text-sky-100"
                            >
                              {module.label}
                            </span>
                          ))
                        ) : (
                          <p className="text-sm text-[#9aa7b8]">
                            No enabled modules.
                          </p>
                        )}
                      </div>
                    </section>
                    <section className="min-w-0 rounded-xl border border-[#2a3242] bg-[#111827] p-4">
                      <h3 className="font-black text-white">Beta assignments</h3>
                      <div className="mt-3 grid gap-2">
                        {selectedMember.betaAssignments.length ? (
                          selectedMember.betaAssignments.map((assignment) => (
                            <p
                              key={assignment.id}
                              className="break-words text-sm text-purple-100"
                            >
                              {assignment.name} ·{" "}
                              {assignment.stage === "internal_testing"
                                ? "Internal testing"
                                : "Beta"}
                            </p>
                          ))
                        ) : (
                          <p className="text-sm text-[#9aa7b8]">
                            None assigned.
                          </p>
                        )}
                      </div>
                    </section>
                  </div>

                  {selectedMemberCanBeManaged ? (
                    <div className="mt-5 flex flex-wrap gap-3">
                      {selectedMember.email ? (
                        <button
                          type="button"
                          className="beast-button-secondary min-h-11"
                          onClick={() => void copyLoginEmail(selectedMember)}
                        >
                          Copy sign-in email
                        </button>
                      ) : null}
                      {selectedMember.emailVerificationStatus ===
                      "unverified" ? (
                        <button
                          type="button"
                          className="beast-button-secondary min-h-11"
                          disabled={pendingMemberId === selectedMember.id}
                          onClick={() =>
                            void sendVerificationReminder(selectedMember)
                          }
                        >
                          Send private verification reminder
                        </button>
                      ) : null}
                      {selectedMember.pendingEmail ||
                      selectedMember.emailVerificationStatus ===
                        "unverified" ? (
                        <button
                          type="button"
                          className="beast-button-secondary min-h-11"
                          disabled={pendingMemberId === selectedMember.id}
                          onClick={() =>
                            void resendVerification(selectedMember)
                          }
                        >
                          Resend official verification email
                        </button>
                      ) : null}
                    </div>
                  ) : null}

                  {editorOpen && selectedMemberCanBeManaged ? (
                    featureFlagsAvailable ? (
                      <BeastAdminMemberEditor
                        key={selectedMember.id}
                        member={selectedMember}
                        featureFlags={featureFlags}
                        onCancel={() => setEditorOpen(false)}
                        onSaved={(result) => {
                          setEditorOpen(false);
                          setActionSuccess(result.message);
                          setRefreshKey((current) => current + 1);
                        }}
                      />
                    ) : (
                      <p
                        role="alert"
                        className="mt-5 rounded-xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm font-bold text-amber-100"
                      >
                        Feature assignments are unavailable. Retry before
                        changing module or beta access.
                      </p>
                    )
                  ) : null}
                </DashboardCard>
              </section>

              <section id="member-management-verification">
                <DashboardCard accent="admin">
                  <SectionHeader
                    eyebrow="BA-130 · Verification policy"
                    title="Email verification outreach and history"
                    description="Supabase Auth is authoritative. A private reminder explains what to do; only the official Supabase verification flow can verify the login email."
                  />
                  <div className="mt-5 grid gap-3 md:grid-cols-3">
                    <MetricTile
                      label="Current state"
                      value={
                        selectedMember.emailVerificationStatus === "verified"
                          ? "Verified"
                          : selectedMember.emailVerificationStatus ===
                              "unverified"
                            ? "Unverified"
                            : "Not provided"
                      }
                      detail={`Joined ${formatDate(selectedMember.createdAt)}`}
                      icon="ID"
                      tone="yellow"
                    />
                    <MetricTile
                      label="Last official email"
                      value={formatDate(
                        selectedMember.lastVerificationEmailSentAt || null
                      )}
                      detail="Recorded successful provider resend"
                      icon="@"
                      tone="blue"
                    />
                    <MetricTile
                      label="Access policy"
                      value={
                        beastEmailVerificationPolicy.restrictionEnforced
                          ? "Feature-specific"
                          : "No restriction"
                      }
                      detail={getBeastEmailVerificationAccessImpact(
                        selectedMember.emailVerificationStatus === "verified"
                      )}
                      icon="✓"
                      tone="green"
                    />
                  </div>
                  <p className="mt-5 rounded-xl border border-amber-300/25 bg-amber-300/10 p-4 text-sm leading-6 text-amber-100">
                    No verification-required feature policy or temporary
                    exception has been owner-approved. BeastAdmin will not
                    restrict the platform or create an exception until an
                    approved policy exists.
                  </p>
                </DashboardCard>
                <div className="mt-4">
                  <BeastAdminAccountAuditLog
                    key={`${selectedMember.id}-${refreshKey}`}
                    members={[
                      {
                        id: selectedMember.id,
                        displayName: selectedMember.displayName,
                      },
                    ]}
                    initialMemberId={selectedMember.id}
                  />
                </div>
              </section>

              <DashboardCard accent="admin">
                <SectionHeader
                  eyebrow="Messages with Admin"
                  title="Private account and support communication"
                  description="Open this member’s durable private administrative thread. Professional conversations and AI context remain separate."
                />
                {selectedMember.accountKind === "member" &&
                selectedMember.accountStatus !== "deleted" ? (
                  <Link
                    href={`/dashboard/admin/messages?member=${encodeURIComponent(
                      selectedMember.id
                    )}`}
                    className="beast-button-secondary mt-5 inline-flex min-h-11 items-center"
                  >
                    Open Member Messages
                  </Link>
                ) : (
                  <p className="mt-5 text-sm text-[#9aa7b8]">
                    Protected and deleted accounts cannot start a member support
                    thread.
                  </p>
                )}
              </DashboardCard>

              <BeastAdminMemberAccessHistory
                key={selectedMember.id}
                memberId={selectedMember.id}
                memberName={selectedMember.displayName}
                canManage={selectedMemberCanBeManaged}
              />

              <section id="member-management-timeline">
                <DashboardCard accent="admin">
                  <SectionHeader
                    eyebrow="Recent meaningful activity"
                    title="Member timeline"
                    description="Permissioned activity metadata only. Conversation text, balances, health details, and document contents are excluded."
                  />

                  {timelineLoading ? (
                    <div className="mt-5 grid gap-3" aria-busy="true">
                      {[1, 2, 3].map((item) => (
                        <div
                          key={item}
                          className="h-20 animate-pulse rounded-xl border border-[#2a3242] bg-[#111827]"
                        />
                      ))}
                    </div>
                  ) : null}
                  {timelineError ? (
                    <p
                      role="alert"
                      className="mt-5 rounded-xl border border-red-300/30 bg-red-300/10 p-4 text-sm font-bold text-red-100"
                    >
                      {timelineError}
                    </p>
                  ) : null}
                  {!timelineLoading && timeline ? (
                    <>
                      <section
                        className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
                        aria-label="Member usage summary"
                      >
                        <MetricTile
                          label="Journey events"
                          value={String(timeline.eventCount)}
                          detail={`${timeline.events.length} loaded`}
                          icon="J"
                          tone="purple"
                        />
                        <MetricTile
                          label="Applications used"
                          value={String(timelineCounts.module)}
                          detail="First persisted activity"
                          icon="A"
                          tone="yellow"
                        />
                        <MetricTile
                          label="Most-used module"
                          value={getBeastAdminMostUsedModuleLabel(
                            selectedMember
                          )}
                          detail={`Previous ${selectedMember.usagePeriodDays} days`}
                          icon="M"
                          tone="blue"
                        />
                        <MetricTile
                          label="Latest activity"
                          value={
                            selectedMember.lastActivityAt
                              ? formatShortDate(
                                  selectedMember.lastActivityAt
                                )
                              : "No activity"
                          }
                          detail="Supported persisted sources"
                          icon="L"
                          tone="green"
                        />
                      </section>

                      <div className="mt-5 flex max-w-full gap-2 overflow-x-auto pb-2">
                        <button
                          type="button"
                          aria-pressed={timelineCategory === "all"}
                          onClick={() => setTimelineCategory("all")}
                          className="min-h-10 shrink-0 rounded-full border border-amber-300/30 px-3 py-2 text-xs font-black text-amber-100"
                        >
                          All · {timeline.events.length}
                        </button>
                        {beastAdminMemberTimelineCategories.map((category) => (
                          <button
                            key={category}
                            type="button"
                            aria-pressed={timelineCategory === category}
                            onClick={() => setTimelineCategory(category)}
                            className={`min-h-10 shrink-0 rounded-full border px-3 py-2 text-xs font-black ${
                              timelineCategory === category
                                ? categoryClasses[category]
                                : "border-[#344052] text-[#c7cfdb]"
                            }`}
                          >
                            {beastAdminMemberTimelineCategoryLabels[category]} ·{" "}
                            {timelineCounts[category]}
                          </button>
                        ))}
                      </div>

                      {visibleTimelineEvents.length ? (
                        <ol className="mt-4 grid gap-3">
                          {visibleTimelineEvents.map((event) => (
                            <li
                              key={event.id}
                              className="min-w-0 rounded-xl border border-[#2a3242] bg-[#111827] p-4"
                            >
                              <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="font-black text-white">
                                    {event.title}
                                  </p>
                                  <p className="mt-1 break-words text-sm leading-6 text-[#c7cfdb]">
                                    {event.detail}
                                  </p>
                                </div>
                                <span
                                  className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${categoryClasses[event.category]}`}
                                >
                                  {
                                    beastAdminMemberTimelineCategoryLabels[
                                      event.category
                                    ]
                                  }
                                </span>
                              </div>
                              <p className="mt-3 text-xs font-bold text-[#7f8da3]">
                                {formatDate(event.occurredAt)}
                              </p>
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <p className="mt-5 rounded-xl border border-dashed border-[#344052] p-5 text-center text-sm text-[#9aa7b8]">
                          No persisted activity matches this category.
                        </p>
                      )}
                    </>
                  ) : null}
                </DashboardCard>
              </section>

              <BeastAdminAccountAuditLog
                key={`audit-${selectedMember.id}`}
                initialMemberId={selectedMember.id}
                members={members.map((member) => ({
                  id: member.id,
                  displayName: member.displayName,
                }))}
              />

              <details className="rounded-2xl border border-[#2a3242] bg-[#0b1220]">
                <summary className="cursor-pointer px-5 py-4 font-black text-white">
                  Data source and permission map
                </summary>
                <div className="grid gap-3 border-t border-[#2a3242] p-4 md:grid-cols-2">
                  {beastAdminMemberFieldSources.map((field) => (
                    <article
                      key={field.id}
                      className="min-w-0 rounded-xl border border-[#2a3242] bg-[#111827] p-4"
                    >
                      <h3 className="font-black text-white">{field.label}</h3>
                      <p className="mt-2 text-sm font-bold text-[#dbe3ef]">
                        {field.source}
                      </p>
                      <p className="mt-1 break-words font-mono text-xs leading-5 text-[#9aa7b8]">
                        {field.columns}
                      </p>
                    </article>
                  ))}
                </div>
              </details>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
