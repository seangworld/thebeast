"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DashboardCard,
  MetricTile,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import {
  beastAdminMemberAccountStatuses,
  beastAdminMemberTimelineCategories,
  beastAdminMemberTimelineCategoryLabels,
  buildBeastAdminMemberTimelineCounts,
  filterBeastAdminMemberDirectory,
  filterBeastAdminMemberTimelineEvents,
  mergeBeastAdminMemberEmailStatuses,
  normalizeBeastAdminMemberDirectory,
  normalizeBeastAdminMemberEmailStatuses,
  normalizeBeastAdminMemberTimeline,
  type BeastAdminMemberAccountStatus,
  type BeastAdminMemberDirectoryEntry,
  type BeastAdminMemberTimelineCategory,
  type BeastAdminMemberTimelineSnapshot,
} from "@/lib/beastAdminMemberTimeline";
import { beastAdminMemberFieldSources } from "@/lib/beastAdminMemberDataAudit";
import {
  beastModuleRegistry,
  type BeastModuleIdentifier,
} from "@/lib/moduleRegistry";
import {
  normalizeBeastFeatureFlags,
  type BeastFeatureFlag,
} from "@/lib/beastFeatureFlags";
import { createClient } from "@/lib/supabase/client";
import { BeastAdminMemberEditor } from "./BeastAdminMemberEditor";

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

const MISSING_VALUE = "Not provided.";

const accountStatusLabels: Record<BeastAdminMemberAccountStatus, string> = {
  active: "Active",
  invited: "Invited",
  suspended: "Suspended",
  deleted: "Deleted",
};

const emailVerificationLabels = {
  verified: "Verified",
  unverified: "Not verified",
  not_provided: MISSING_VALUE,
} as const;

function humanizeTimelineError(error: unknown) {
  const message =
    error && typeof error === "object" && "message" in error
      ? String(error.message)
      : "";

  if (
    /get_beast_admin_member_|schema cache|function .* does not exist/i.test(
      message
    )
  ) {
    return "The authoritative member directory is not available yet. Apply the BA-102, BA-103, and BA-107 Supabase migrations in order, then retry.";
  }
  if (/permission|owner access|required|42501/i.test(message)) {
    return "Member timelines are restricted to the Beast owner.";
  }
  if (/not available|P0002/i.test(message)) {
    return "That member is no longer available in the owner directory.";
  }

  return "BeastAdmin could not load the member timeline. No journey events were estimated.";
}

function formatTimelineDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatOptionalDate(value: string | null) {
  return value ? formatTimelineDate(value) : MISSING_VALUE;
}

function DirectoryField({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
      <dt className="text-xs font-black uppercase tracking-[0.16em] text-[#7f8da3]">
        {label}
      </dt>
      <dd className="mt-2 break-words text-sm font-bold text-white">{value}</dd>
    </div>
  );
}

function TimelineLoadingState({ title }: { title: string }) {
  return (
    <DashboardCard accent="admin">
      <SectionHeader
        eyebrow="Member Timeline"
        title={title}
        description="BeastAdmin is assembling permissioned journey metadata from each source application."
      />
      <div className="mt-5 grid gap-3" aria-busy="true">
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="h-24 animate-pulse rounded-xl border border-[#2a3242] bg-[#111827]"
          />
        ))}
      </div>
    </DashboardCard>
  );
}

export function BeastAdminMemberTimelineWorkspace() {
  const [members, setMembers] = useState<BeastAdminMemberDirectoryEntry[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [timeline, setTimeline] =
    useState<BeastAdminMemberTimelineSnapshot | null>(null);
  const [directoryLoading, setDirectoryLoading] = useState(true);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [accountStatusFilter, setAccountStatusFilter] = useState<
    BeastAdminMemberAccountStatus | "all"
  >("all");
  const [betaStatusFilter, setBetaStatusFilter] = useState<
    "all" | "assigned" | "not_assigned"
  >("all");
  const [moduleFilter, setModuleFilter] = useState<
    BeastModuleIdentifier | "all"
  >("all");
  const [category, setCategory] = useState<
    BeastAdminMemberTimelineCategory | "all"
  >("all");
  const [featureFlags, setFeatureFlags] = useState<BeastFeatureFlag[]>([]);
  const [featureFlagsAvailable, setFeatureFlagsAvailable] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editSuccess, setEditSuccess] = useState("");
  const [verificationMessage, setVerificationMessage] = useState("");
  const [verificationSending, setVerificationSending] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadDirectory() {
      setDirectoryLoading(true);
      setError("");

      try {
        const supabase = createClient();
        const [directoryResult, emailStatusResult, featureFlagResult] =
          await Promise.all([
          supabase.rpc("get_beast_admin_member_directory"),
          supabase.rpc("get_beast_admin_member_email_statuses"),
          supabase.rpc("get_beast_admin_feature_flags"),
          ]);
        const { data, error: directoryError } = directoryResult;
        if (directoryError) throw directoryError;
        if (emailStatusResult.error) throw emailStatusResult.error;

        const normalizedMembers = normalizeBeastAdminMemberDirectory(data);
        const emailStatuses = normalizeBeastAdminMemberEmailStatuses(
          emailStatusResult.data
        );
        if (!normalizedMembers || !emailStatuses) {
          throw new Error("Member directory data was invalid.");
        }
        const nextMembers = mergeBeastAdminMemberEmailStatuses(
          normalizedMembers,
          emailStatuses
        );
        const nextFeatureFlags = featureFlagResult.error
          ? null
          : normalizeBeastFeatureFlags(featureFlagResult.data);
        if (!active) return;

        setMembers(nextMembers);
        setFeatureFlags(nextFeatureFlags || []);
        setFeatureFlagsAvailable(Boolean(nextFeatureFlags));
        setSelectedMemberId((current) => {
          if (current && nextMembers.some((member) => member.id === current)) {
            return current;
          }
          return nextMembers[0]?.id || "";
        });
      } catch (directoryError) {
        if (active) {
          setMembers([]);
          setFeatureFlags([]);
          setFeatureFlagsAvailable(false);
          setSelectedMemberId("");
          setTimeline(null);
          setError(humanizeTimelineError(directoryError));
        }
      } finally {
        if (active) setDirectoryLoading(false);
      }
    }

    loadDirectory();

    return () => {
      active = false;
    };
  }, [refreshKey]);

  useEffect(() => {
    let active = true;

    async function loadTimeline() {
      if (!selectedMemberId) {
        setTimeline(null);
        return;
      }

      setTimelineLoading(true);
      setError("");
      setCategory("all");

      try {
        const supabase = createClient();
        const { data, error: timelineError } = await supabase.rpc(
          "get_beast_admin_member_timeline",
          {
            selected_member_id: selectedMemberId,
            event_limit: 200,
          }
        );
        if (timelineError) throw timelineError;

        const nextTimeline = normalizeBeastAdminMemberTimeline(data);
        if (!nextTimeline) throw new Error("Member timeline data was invalid.");
        if (active) setTimeline(nextTimeline);
      } catch (timelineError) {
        if (active) {
          setTimeline(null);
          setError(humanizeTimelineError(timelineError));
        }
      } finally {
        if (active) setTimelineLoading(false);
      }
    }

    loadTimeline();

    return () => {
      active = false;
    };
  }, [selectedMemberId]);

  const filteredMembers = useMemo(() => {
    return filterBeastAdminMemberDirectory(members, {
      query,
      role: roleFilter,
      accountStatus: accountStatusFilter,
      betaStatus: betaStatusFilter,
      moduleId: moduleFilter,
    });
  }, [
    accountStatusFilter,
    betaStatusFilter,
    members,
    moduleFilter,
    query,
    roleFilter,
  ]);
  const roleOptions = useMemo(
    () => Array.from(new Set(members.map((member) => member.role))).sort(),
    [members]
  );
  const visibleEvents = useMemo(
    () =>
      timeline
        ? filterBeastAdminMemberTimelineEvents(timeline.events, category)
        : [],
    [category, timeline]
  );
  const categoryCounts = useMemo(
    () =>
      buildBeastAdminMemberTimelineCounts(timeline?.events || []),
    [timeline]
  );
  const selectedDirectoryMember = members.find(
    (member) => member.id === selectedMemberId
  );
  const selectedMemberCanBeEdited =
    selectedDirectoryMember?.accountKind === "member" &&
    selectedDirectoryMember.accountStatus !== "deleted" &&
    Boolean(selectedDirectoryMember.email);
  const selectedMemberReadOnlyReason =
    selectedDirectoryMember?.accountKind === "system" ||
    selectedDirectoryMember?.accountKind === "demo"
      ? "This account is explicitly marked as a protected system or demo account."
      : selectedDirectoryMember?.accountKind === "unmanaged"
        ? "This Auth account has no managed public profile, so BeastAdmin will not guess where to write changes."
        : selectedDirectoryMember?.accountStatus === "deleted"
          ? "Deleted Auth accounts are read-only."
          : selectedDirectoryMember && !selectedDirectoryMember.email
            ? "This account has no authoritative Auth email and cannot be edited safely here."
            : "";
  const canResendVerification = Boolean(
    selectedDirectoryMember &&
      selectedDirectoryMember.accountKind === "member" &&
      selectedDirectoryMember.accountStatus !== "deleted" &&
      selectedDirectoryMember.email &&
      (selectedDirectoryMember.pendingEmail ||
        selectedDirectoryMember.emailVerificationStatus === "unverified")
  );

  async function resendMemberVerification() {
    if (!selectedDirectoryMember || !canResendVerification) return;

    setVerificationSending(true);
    setVerificationMessage("");
    setError("");
    try {
      const response = await fetch(
        `/api/admin/members/${encodeURIComponent(
          selectedDirectoryMember.id
        )}/email-verification`,
        { method: "POST" }
      );
      const payload: unknown = await response.json().catch(() => null);
      if (
        !response.ok ||
        !payload ||
        typeof payload !== "object" ||
        !("message" in payload) ||
        typeof payload.message !== "string"
      ) {
        const message =
          payload &&
          typeof payload === "object" &&
          "error" in payload &&
          typeof payload.error === "string"
            ? payload.error
            : "BeastAdmin could not resend this verification email.";
        throw new Error(message);
      }

      setVerificationMessage(payload.message);
      setRefreshKey((current) => current + 1);
    } catch (resendError) {
      setError(
        resendError instanceof Error
          ? resendError.message
          : "BeastAdmin could not resend this verification email."
      );
    } finally {
      setVerificationSending(false);
    }
  }

  if (directoryLoading) {
    return <TimelineLoadingState title="Loading owner member directory" />;
  }

  if (error && !members.length) {
    return (
      <DashboardCard accent="red">
        <SectionHeader
          eyebrow="Member Timeline"
          title="Member journeys unavailable"
          description={error}
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
        <div className="py-6 text-center">
          <p className="beast-kicker">Owner member directory</p>
          <h2 className="mt-2 text-2xl font-black text-white">
            No authenticated accounts found
          </h2>
          <p className="mx-auto mt-3 max-w-2xl leading-7 text-[#9aa7b8]">
            BeastAdmin reads this directory from Supabase Auth and does not
            display configured sample members here.
          </p>
        </div>
      </DashboardCard>
    );
  }

  return (
    <div className="grid min-w-0 gap-6 xl:grid-cols-[24rem_minmax(0,1fr)]">
      <aside className="min-w-0 xl:sticky xl:top-6 xl:self-start">
        <DashboardCard accent="admin">
          <SectionHeader
            eyebrow="Owner directory"
            title={`${members.length} account profile${members.length === 1 ? "" : "s"}`}
            description="Auth owns account identity. Public profiles and persisted access assignments are joined by user ID."
          />
          <label className="mt-4 grid gap-2 text-sm font-bold text-[#dbe3ef]">
            Search members
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Name, Auth email, role, or beta"
              className="min-h-11 w-full rounded-lg border border-[#344052] bg-[#0b1220] px-3 py-2 text-sm text-white outline-none placeholder:text-[#68768b] focus:border-amber-300/70 focus:ring-2 focus:ring-amber-300/15"
            />
          </label>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.12em] text-[#9aa7b8]">
              Role
              <select
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
                className="min-h-11 rounded-lg border border-[#344052] bg-[#0b1220] px-3 py-2 text-sm font-bold normal-case tracking-normal text-white outline-none focus:border-amber-300/70"
              >
                <option value="all">All roles</option>
                {roleOptions.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.12em] text-[#9aa7b8]">
              Account status
              <select
                value={accountStatusFilter}
                onChange={(event) =>
                  setAccountStatusFilter(
                    event.target.value as
                      | BeastAdminMemberAccountStatus
                      | "all"
                  )
                }
                className="min-h-11 rounded-lg border border-[#344052] bg-[#0b1220] px-3 py-2 text-sm font-bold normal-case tracking-normal text-white outline-none focus:border-amber-300/70"
              >
                <option value="all">All account statuses</option>
                {beastAdminMemberAccountStatuses.map((status) => (
                  <option key={status} value={status}>
                    {accountStatusLabels[status]}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.12em] text-[#9aa7b8]">
              Beta status
              <select
                value={betaStatusFilter}
                onChange={(event) =>
                  setBetaStatusFilter(
                    event.target.value as
                      | "all"
                      | "assigned"
                      | "not_assigned"
                  )
                }
                className="min-h-11 rounded-lg border border-[#344052] bg-[#0b1220] px-3 py-2 text-sm font-bold normal-case tracking-normal text-white outline-none focus:border-amber-300/70"
              >
                <option value="all">All beta statuses</option>
                <option value="assigned">Assigned</option>
                <option value="not_assigned">Not assigned</option>
              </select>
            </label>
            <label className="grid gap-1.5 text-xs font-black uppercase tracking-[0.12em] text-[#9aa7b8]">
              Module access
              <select
                value={moduleFilter}
                onChange={(event) =>
                  setModuleFilter(
                    event.target.value as BeastModuleIdentifier | "all"
                  )
                }
                className="min-h-11 rounded-lg border border-[#344052] bg-[#0b1220] px-3 py-2 text-sm font-bold normal-case tracking-normal text-white outline-none focus:border-amber-300/70"
              >
                <option value="all">All enabled modules</option>
                {beastModuleRegistry
                  .filter((module) => module.enabled)
                  .map((module) => (
                    <option key={module.identifier} value={module.identifier}>
                      {module.name}
                    </option>
                  ))}
              </select>
            </label>
          </div>
          <p className="mt-4 text-xs font-bold text-[#7f8da3]">
            {filteredMembers.length} of {members.length} shown
          </p>
          <div className="mt-4 grid max-h-[34rem] gap-2 overflow-y-auto pr-1">
            {filteredMembers.map((member) => (
              <button
                key={member.id}
                type="button"
                aria-pressed={selectedMemberId === member.id}
                onClick={() => {
                  setSelectedMemberId(member.id);
                  setEditorOpen(false);
                  setEditSuccess("");
                  setVerificationMessage("");
                }}
                className={`rounded-xl border p-3 text-left transition ${
                  selectedMemberId === member.id
                    ? "border-amber-200 bg-amber-200/15"
                    : "border-[#2a3242] bg-[#111827] hover:border-amber-200/60"
                }`}
              >
                <p className="truncate font-black text-white">
                  {member.displayName}
                </p>
                <p className="mt-1 truncate text-xs text-[#9aa7b8]">
                  Auth email: {member.email || MISSING_VALUE}
                </p>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-[#7f8da3]">
                  <span>{accountStatusLabels[member.accountStatus]}</span>
                  <span title="Latest permissioned application activity">
                    {member.lastActivityAt
                      ? formatShortDate(member.lastActivityAt)
                      : "No activity"}
                  </span>
                </div>
              </button>
            ))}
            {!filteredMembers.length ? (
              <p className="rounded-xl border border-dashed border-[#344052] p-4 text-center text-sm text-[#9aa7b8]">
                No members match these filters.
              </p>
            ) : null}
          </div>
        </DashboardCard>
      </aside>

      <div className="min-w-0 space-y-6">
        {selectedDirectoryMember ? (
          <DashboardCard accent="admin">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <p className="beast-kicker">Authoritative account</p>
                <h2 className="mt-2 break-words text-3xl font-black text-white">
                  {selectedDirectoryMember.displayName}
                </h2>
                <p className="mt-2 break-all text-sm text-[#9aa7b8]">
                  Auth email: {selectedDirectoryMember.email || MISSING_VALUE}
                </p>
              </div>
              <button
                type="button"
                className="beast-button-secondary min-h-11"
                onClick={() => {
                  setEditorOpen(false);
                  setEditSuccess("");
                  setVerificationMessage("");
                  setRefreshKey((current) => current + 1);
                }}
              >
                Refresh account
              </button>
            </div>

            <div className="mt-5 flex flex-col gap-3 rounded-xl border border-[#2a3242] bg-[#111827] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-black text-white">
                  Account management
                </p>
                <p className="mt-1 text-xs leading-5 text-[#9aa7b8]">
                  Account kind: {selectedDirectoryMember.accountKind}
                </p>
              </div>
              {selectedMemberCanBeEdited ? (
                <button
                  type="button"
                  className="beast-button min-h-11"
                  onClick={() => {
                    setEditorOpen((current) => !current);
                    setEditSuccess("");
                  }}
                >
                  {editorOpen ? "Close account editor" : "Edit account"}
                </button>
              ) : (
                <p className="max-w-xl text-sm font-bold leading-6 text-amber-100">
                  {selectedMemberReadOnlyReason}
                </p>
              )}
            </div>

            {editSuccess ? (
              <p
                role="status"
                className="mt-4 rounded-xl border border-green-300/30 bg-green-300/10 p-4 text-sm font-bold text-green-100"
              >
                {editSuccess}
              </p>
            ) : null}

            {verificationMessage ? (
              <p
                role="status"
                className="mt-4 rounded-xl border border-green-300/30 bg-green-300/10 p-4 text-sm font-bold text-green-100"
              >
                {verificationMessage}
              </p>
            ) : null}

            <dl className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <DirectoryField
                label="Display name"
                value={selectedDirectoryMember.displayName}
              />
              <DirectoryField
                label="Authentication email"
                value={selectedDirectoryMember.email || MISSING_VALUE}
              />
              <DirectoryField
                label="Email verification"
                value={
                  emailVerificationLabels[
                    selectedDirectoryMember.emailVerificationStatus
                  ]
                }
              />
              <DirectoryField
                label="Pending email change"
                value={selectedDirectoryMember.pendingEmail || MISSING_VALUE}
              />
              <DirectoryField
                label="Email change requested"
                value={formatOptionalDate(
                  selectedDirectoryMember.emailChangeSentAt || null
                )}
              />
              <DirectoryField
                label="Account status"
                value={
                  accountStatusLabels[selectedDirectoryMember.accountStatus]
                }
              />
              <DirectoryField
                label="Profile role"
                value={selectedDirectoryMember.role || MISSING_VALUE}
              />
              <DirectoryField
                label="Household role"
                value={selectedDirectoryMember.householdRole || MISSING_VALUE}
              />
              <DirectoryField
                label="Account created"
                value={formatTimelineDate(selectedDirectoryMember.createdAt)}
              />
              <DirectoryField
                label="Last sign-in"
                value={formatOptionalDate(
                  selectedDirectoryMember.lastSignInAt
                )}
              />
              <DirectoryField
                label="Last active"
                value={formatOptionalDate(
                  selectedDirectoryMember.lastActivityAt
                )}
              />
            </dl>

            {canResendVerification ? (
              <div className="mt-5 rounded-xl border border-sky-300/25 bg-sky-300/10 p-4">
                <p className="text-sm font-black text-sky-100">
                  Verification action available
                </p>
                <p className="mt-2 text-sm leading-6 text-sky-100/80">
                  {selectedDirectoryMember.pendingEmail
                    ? "The member has a pending Auth email change. Resending uses the pending address and does not change either email."
                    : "The authoritative Auth email is not verified. Resending does not alter the member account."}
                </p>
                <button
                  type="button"
                  onClick={resendMemberVerification}
                  disabled={verificationSending}
                  className="beast-button-secondary mt-3 min-h-11 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {verificationSending
                    ? "Sending verification…"
                    : "Resend verification"}
                </button>
              </div>
            ) : null}

            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <section>
                <h3 className="text-sm font-black text-white">
                  Enabled modules
                </h3>
                <p className="mt-1 text-xs leading-5 text-[#7f8da3]">
                  Effective application access from the canonical module
                  registry and profile role.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedDirectoryMember.enabledModules.length ? (
                    selectedDirectoryMember.enabledModules.map((module) => (
                      <span
                        key={module.id}
                        className="rounded-full border border-sky-300/30 bg-sky-300/10 px-3 py-1.5 text-xs font-black text-sky-100"
                      >
                        {module.label}
                      </span>
                    ))
                  ) : (
                    <p className="text-sm font-bold text-[#9aa7b8]">
                      No enabled modules.
                    </p>
                  )}
                </div>
              </section>

              <section>
                <h3 className="text-sm font-black text-white">
                  Beta assignments
                </h3>
                <p className="mt-1 text-xs leading-5 text-[#7f8da3]">
                  Effective internal-testing or beta feature assignments only.
                </p>
                <div className="mt-3 grid gap-2">
                  {selectedDirectoryMember.betaAssignments.length ? (
                    selectedDirectoryMember.betaAssignments.map(
                      (assignment) => (
                        <div
                          key={assignment.id}
                          className="rounded-lg border border-purple-300/25 bg-purple-300/10 px-3 py-2"
                        >
                          <p className="text-sm font-black text-purple-100">
                            {assignment.name}
                          </p>
                          <p className="mt-1 text-xs text-purple-100/70">
                            {assignment.stage === "internal_testing"
                              ? "Internal testing"
                              : "Beta"}{" "}
                            · {assignment.sourceScope} assignment
                          </p>
                        </div>
                      )
                    )
                  ) : (
                    <p className="text-sm font-bold text-[#9aa7b8]">
                      None assigned.
                    </p>
                  )}
                </div>
              </section>
            </div>

            <p className="mt-5 border-t border-[#2a3242] pt-4 text-xs leading-5 text-[#7f8da3]">
              Household role is shown as “Not provided.” until Beast has a
              persisted household membership source. BeastAdmin does not infer
              it from profile names, family UI, or document access.
            </p>

            {editorOpen && selectedMemberCanBeEdited ? (
              <>
                {!featureFlagsAvailable ? (
                  <p
                    role="alert"
                    className="mt-5 rounded-xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm font-bold leading-6 text-amber-100"
                  >
                    Feature assignments could not be loaded. Close the editor
                    and retry before changing beta access.
                  </p>
                ) : null}
                {featureFlagsAvailable ? (
                  <BeastAdminMemberEditor
                    key={selectedDirectoryMember.id}
                    member={selectedDirectoryMember}
                    featureFlags={featureFlags}
                    onCancel={() => setEditorOpen(false)}
                    onSaved={(result) => {
                      setEditorOpen(false);
                      setEditSuccess(result.message);
                      setRefreshKey((current) => current + 1);
                    }}
                  />
                ) : null}
              </>
            ) : null}
          </DashboardCard>
        ) : null}

        {timelineLoading ? (
          <TimelineLoadingState
            title={`Loading ${selectedDirectoryMember?.displayName || "member"}’s journey`}
          />
        ) : error || !timeline ? (
          <DashboardCard accent="red">
            <SectionHeader
              eyebrow="Member Timeline"
              title="Journey unavailable"
              description={
                error ||
                "BeastAdmin did not receive a valid member timeline."
              }
            />
            <button
              type="button"
              className="beast-button mt-5"
              onClick={() => setRefreshKey((current) => current + 1)}
            >
              Retry
            </button>
          </DashboardCard>
        ) : (
          <>
            <DashboardCard accent="admin">
              <SectionHeader
                eyebrow="Member data provenance"
                title="Where every displayed field comes from"
                description="BeastAdmin resolves identity at read time. It does not copy Auth email into the public profile or treat household and beta assignments as account roles."
              />
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {beastAdminMemberFieldSources.map((field) => (
                  <article
                    key={field.id}
                    className="rounded-xl border border-[#2a3242] bg-[#111827] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h3 className="font-black text-white">{field.label}</h3>
                      <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2.5 py-1 text-[11px] font-black uppercase text-amber-100">
                        {field.kind}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-bold text-[#dbe3ef]">
                      {field.source}
                    </p>
                    <p className="mt-1 break-words font-mono text-xs leading-5 text-[#9aa7b8]">
                      {field.columns}
                    </p>
                    <details className="mt-3 text-sm text-[#c7cfdb]">
                      <summary className="cursor-pointer font-black text-amber-100">
                        Authority, editing, and access
                      </summary>
                      <dl className="mt-3 grid gap-3 text-xs leading-5">
                        <div>
                          <dt className="font-black text-white">Authority</dt>
                          <dd>{field.authoritativeSource}</dd>
                        </div>
                        <div>
                          <dt className="font-black text-white">Editable</dt>
                          <dd>{field.editable}</dd>
                        </div>
                        <div>
                          <dt className="font-black text-white">
                            Synchronization
                          </dt>
                          <dd>{field.synchronization}</dd>
                        </div>
                        <div>
                          <dt className="font-black text-white">Access</dt>
                          <dd>{field.accessBoundary}</dd>
                        </div>
                      </dl>
                    </details>
                  </article>
                ))}
              </div>
            </DashboardCard>

            <section
              className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
              aria-label="Member journey summary"
            >
              <MetricTile
                label="Profile Created"
                value={formatShortDate(timeline.member.registeredAt)}
                detail="public.profiles.created_at"
                icon="R"
                tone="blue"
              />
              <MetricTile
                label="Journey Events"
                value={String(timeline.eventCount)}
                detail={`${timeline.events.length} loaded in this view`}
                icon="J"
                tone="purple"
              />
              <MetricTile
                label="Applications Used"
                value={String(categoryCounts.module)}
                detail="Based on first persisted activity"
                icon="A"
                tone="yellow"
              />
              <MetricTile
                label="Latest Journey Event"
                value={formatShortDate(
                  timeline.events[0]?.occurredAt ||
                    timeline.member.registeredAt
                )}
                detail="Includes the profile-created event"
                icon="L"
                tone="green"
              />
            </section>

            <DashboardCard accent="admin">
              <SectionHeader
                eyebrow="Timeline"
                title="From profile creation to today"
                description={`${visibleEvents.length} event${visibleEvents.length === 1 ? "" : "s"} shown. Select a category to focus the journey.`}
              />
              <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
                <button
                  type="button"
                  aria-pressed={category === "all"}
                  onClick={() => setCategory("all")}
                  className={`min-h-10 shrink-0 rounded-full border px-3 py-2 text-xs font-black ${
                    category === "all"
                      ? "border-amber-200 bg-amber-200/20 text-amber-100"
                      : "border-[#344052] text-[#c7cfdb]"
                  }`}
                >
                  All · {timeline.events.length}
                </button>
                {beastAdminMemberTimelineCategories.map((item) => (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={category === item}
                    onClick={() => setCategory(item)}
                    className={`min-h-10 shrink-0 rounded-full border px-3 py-2 text-xs font-black ${
                      category === item
                        ? categoryClasses[item]
                        : "border-[#344052] text-[#c7cfdb]"
                    }`}
                  >
                    {beastAdminMemberTimelineCategoryLabels[item]} ·{" "}
                    {categoryCounts[item]}
                  </button>
                ))}
              </div>

              {visibleEvents.length ? (
                <ol className="relative mt-5 grid gap-4 before:absolute before:bottom-6 before:left-[1.15rem] before:top-6 before:w-px before:bg-[#344052]">
                  {visibleEvents.map((event) => (
                    <li
                      key={event.id}
                      className="relative grid grid-cols-[2.4rem_minmax(0,1fr)] gap-3"
                    >
                      <div
                        className={`z-10 flex h-9 w-9 items-center justify-center rounded-full border text-xs font-black uppercase ${categoryClasses[event.category]}`}
                        aria-hidden="true"
                      >
                        {
                          beastAdminMemberTimelineCategoryLabels[
                            event.category
                          ][0]
                        }
                      </div>
                      <article className="min-w-0 rounded-xl border border-[#2a3242] bg-[#111827] p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-black text-white">{event.title}</p>
                            <p className="mt-1 text-sm leading-6 text-[#c7cfdb]">
                              {event.detail}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-black ${categoryClasses[event.category]}`}
                          >
                            {
                              beastAdminMemberTimelineCategoryLabels[
                                event.category
                              ]
                            }
                          </span>
                        </div>
                        <p className="mt-3 text-xs font-bold text-[#7f8da3]">
                          {formatTimelineDate(event.occurredAt)}
                        </p>
                      </article>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="mt-5 rounded-xl border border-dashed border-[#344052] p-6 text-center">
                  <p className="font-black text-white">
                    No {category === "all" ? "" : beastAdminMemberTimelineCategoryLabels[category].toLowerCase()} events
                  </p>
                  <p className="mt-2 text-sm text-[#9aa7b8]">
                    BeastAdmin will not create a timeline event without a
                    persisted source record.
                  </p>
                </div>
              )}

              {timeline.hasMore ? (
                <p className="mt-5 rounded-xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm text-amber-100">
                  This member has more than 200 journey events. The newest 200
                  are shown.
                </p>
              ) : null}
            </DashboardCard>

            <DashboardCard accent="admin">
              <SectionHeader
                eyebrow="Permission and Source Coverage"
                title="What this timeline can confirm"
                description="Every category names its evidence boundary so incomplete coverage is not mistaken for inactivity."
              />
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {timeline.coverage.map((item) => (
                  <article
                    key={item.category}
                    className="rounded-xl border border-[#2a3242] bg-[#111827] p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-black text-white">
                        {
                          beastAdminMemberTimelineCategoryLabels[
                            item.category
                          ]
                        }
                      </h3>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-black uppercase ${
                          item.state === "available"
                            ? "border-green-300/35 bg-green-300/10 text-green-100"
                            : "border-amber-300/35 bg-amber-300/10 text-amber-100"
                        }`}
                      >
                        {item.state}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[#9aa7b8]">
                      {item.detail}
                    </p>
                  </article>
                ))}
              </div>
              <p className="mt-5 border-t border-[#2a3242] pt-4 text-xs leading-5 text-[#7f8da3]">
                Owner-only boundary: raw conversation content, financial
                balances and amounts, clinical details, and document contents
                are excluded from this workspace.
              </p>
            </DashboardCard>
          </>
        )}
      </div>
    </div>
  );
}
