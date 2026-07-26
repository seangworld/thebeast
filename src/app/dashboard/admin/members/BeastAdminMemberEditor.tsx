"use client";

import { useMemo, useState } from "react";
import {
  beastAdminEditableModuleIds,
  type BeastAdminEditableAccountStatus,
  type BeastAdminEditableModuleId,
  type BeastAdminMemberEditResult,
} from "@/lib/beastAdminMemberEditing";
import type { BeastAdminMemberDirectoryEntry } from "@/lib/beastAdminMemberTimeline";
import {
  beastFeatureFlagStageLabels,
  type BeastFeatureFlag,
} from "@/lib/beastFeatureFlags";
import { USER_ROLES, type UserRole } from "@/lib/entitlements";

const moduleLabels: Record<BeastAdminEditableModuleId, string> = {
  money: "BeastMoney",
  learning: "BeastEducation",
};

function readErrorMessage(value: unknown) {
  if (
    value &&
    typeof value === "object" &&
    "error" in value &&
    typeof value.error === "string"
  ) {
    return value.error;
  }
  return "The account update failed. Review the fields and try again.";
}

export function BeastAdminMemberEditor({
  member,
  featureFlags,
  onCancel,
  onSaved,
}: {
  member: BeastAdminMemberDirectoryEntry;
  featureFlags: BeastFeatureFlag[];
  onCancel: () => void;
  onSaved: (result: BeastAdminMemberEditResult) => void;
}) {
  const explicitBetaFlagIds = useMemo(
    () =>
      featureFlags
        .filter((flag) =>
          flag.assignments.some(
            (assignment) =>
              assignment.scopeType === "member" &&
              assignment.memberId === member.id &&
              assignment.stage === "beta"
          )
        )
        .map((flag) => flag.id),
    [featureFlags, member.id]
  );
  const [displayName, setDisplayName] = useState(
    member.displayName === "Not provided." ? "" : member.displayName
  );
  const [email, setEmail] = useState(member.email || "");
  const [role, setRole] = useState<UserRole>(
    USER_ROLES.includes(member.role as UserRole)
      ? (member.role as UserRole)
      : "user"
  );
  const [accountStatus, setAccountStatus] =
    useState<BeastAdminEditableAccountStatus>(
      member.accountStatus === "deleted" ? "active" : member.accountStatus
    );
  const [moduleAccess, setModuleAccess] = useState<
    BeastAdminEditableModuleId[]
  >(
    beastAdminEditableModuleIds.filter((moduleId) =>
      member.enabledModules.some((module) => module.id === moduleId)
    )
  );
  const [betaFlagIds, setBetaFlagIds] =
    useState<string[]>(explicitBetaFlagIds);
  const [confirmEmailChange, setConfirmEmailChange] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const normalizedOriginalEmail = member.email?.trim().toLowerCase() || "";
  const emailChanged = email.trim().toLowerCase() !== normalizedOriginalEmail;
  const inheritedBetaAssignments = member.betaAssignments.filter(
    (assignment) => assignment.sourceScope === "role"
  );
  const hasFinalOwnerRisk =
    member.role === "admin" &&
    (role !== "admin" || accountStatus === "suspended");

  function toggleModule(moduleId: BeastAdminEditableModuleId) {
    setModuleAccess((current) =>
      current.includes(moduleId)
        ? current.filter((item) => item !== moduleId)
        : [...current, moduleId]
    );
  }

  function toggleBetaFlag(flagId: string) {
    setBetaFlagIds((current) =>
      current.includes(flagId)
        ? current.filter((item) => item !== flagId)
        : [...current, flagId]
    );
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (emailChanged && !confirmEmailChange) {
      setError("Confirm the sign-in email change before saving.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(
        `/api/admin/members/${encodeURIComponent(member.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            displayName: displayName.trim() || null,
            email: email.trim(),
            role,
            accountStatus,
            moduleAccess,
            betaFlagIds,
            confirmEmailChange,
          }),
        }
      );
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(readErrorMessage(payload));
      }
      if (
        !payload ||
        typeof payload !== "object" ||
        !("auditEventId" in payload) ||
        typeof payload.auditEventId !== "string" ||
        !("message" in payload) ||
        typeof payload.message !== "string"
      ) {
        throw new Error("BeastAdmin could not verify the saved audit event.");
      }

      onSaved(payload as BeastAdminMemberEditResult);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "The account update failed. Review the fields and try again."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={save}
      className="mt-6 rounded-2xl border border-amber-300/25 bg-[#0b1220] p-4 sm:p-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="beast-kicker">Owner-only account editor</p>
          <h3 className="mt-2 text-xl font-black text-white">
            Edit supported account fields
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#9aa7b8]">
            Changes use their authoritative sources. Authentication changes run
            only on the server and every successful save records an owner audit
            event.
          </p>
        </div>
        <button
          type="button"
          className="beast-button-secondary min-h-11"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </button>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-bold text-[#dbe3ef]">
          Display name
          <input
            value={displayName}
            maxLength={100}
            onChange={(event) => setDisplayName(event.target.value)}
            className="beast-input"
            placeholder="Not provided."
          />
        </label>
        <label className="grid gap-2 text-sm font-bold text-[#dbe3ef]">
          Authentication email
          <input
            type="email"
            required
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setConfirmEmailChange(false);
            }}
            className="beast-input"
          />
        </label>
        <label className="grid gap-2 text-sm font-bold text-[#dbe3ef]">
          Role
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as UserRole)}
            className="beast-input"
          >
            {USER_ROLES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-bold text-[#dbe3ef]">
          Account status
          <select
            value={accountStatus}
            onChange={(event) =>
              setAccountStatus(
                event.target.value as BeastAdminEditableAccountStatus
              )
            }
            className="beast-input"
          >
            <option
              value="active"
              disabled={member.accountStatus === "invited"}
            >
              Active
            </option>
            {member.accountStatus === "invited" ? (
              <option value="invited">Invited</option>
            ) : null}
            <option
              value="suspended"
              disabled={member.accountStatus === "invited"}
            >
              Suspended
            </option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-bold text-[#7f8da3] md:col-span-2">
          Household relationship
          <input
            disabled
            value="Not provided."
            readOnly
            className="beast-input cursor-not-allowed opacity-70"
          />
          <span className="text-xs font-medium leading-5">
            Editing is unavailable until BeastOS has a persisted household
            membership source. Mock Household and Family records are never
            written from BeastAdmin.
          </span>
        </label>
      </div>

      {emailChanged ? (
        <div className="mt-5 rounded-xl border border-red-300/35 bg-red-300/10 p-4">
          <p className="font-black text-red-100">
            This changes the member&apos;s sign-in email.
          </p>
          <p className="mt-2 text-sm leading-6 text-red-100/85">
            Supabase Auth will keep the same user ID and member records, mark
            the new email unverified, and require the member to verify it before
            using it to sign in.
          </p>
          <label className="mt-3 flex items-start gap-3 text-sm font-bold text-red-50">
            <input
              type="checkbox"
              checked={confirmEmailChange}
              onChange={(event) =>
                setConfirmEmailChange(event.target.checked)
              }
              className="mt-1 h-4 w-4"
            />
            I confirm that the authoritative login email should change.
          </label>
        </div>
      ) : null}

      {hasFinalOwnerRisk ? (
        <p className="mt-5 rounded-xl border border-amber-300/35 bg-amber-300/10 p-4 text-sm font-bold leading-6 text-amber-100">
          BeastAdmin will reject this change if this is the final owner account.
        </p>
      ) : null}

      <fieldset className="mt-5">
        <legend className="font-black text-white">Member module access</legend>
        <p className="mt-1 text-xs leading-5 text-[#7f8da3]">
          BeastOS remains available to every authenticated member. BeastAdmin
          remains tied to the admin role.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {beastAdminEditableModuleIds.map((moduleId) => (
            <label
              key={moduleId}
              className="flex items-center gap-3 rounded-xl border border-[#2a3242] bg-[#111827] p-3 text-sm font-bold text-white"
            >
              <input
                type="checkbox"
                checked={moduleAccess.includes(moduleId)}
                onChange={() => toggleModule(moduleId)}
                disabled={role === "admin"}
                className="h-4 w-4"
              />
              {moduleLabels[moduleId]}
              {role === "admin" ? (
                <span className="ml-auto text-xs text-[#7f8da3]">
                  Owner access
                </span>
              ) : null}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-5">
        <legend className="font-black text-white">
          Direct member beta assignments
        </legend>
        <p className="mt-1 text-xs leading-5 text-[#7f8da3]">
          This editor adds or removes direct Beta assignments. Role and module
          assignments remain managed in Feature Flags.
        </p>
        {featureFlags.length ? (
          <div className="mt-3 grid gap-2">
            {featureFlags.map((flag) => {
              const directAssignment = flag.assignments.find(
                (assignment) =>
                  assignment.scopeType === "member" &&
                  assignment.memberId === member.id
              );
              const hasNonBetaOverride =
                directAssignment &&
                directAssignment.stage !== "beta";

              return (
                <label
                  key={flag.id}
                  className="flex items-start gap-3 rounded-xl border border-[#2a3242] bg-[#111827] p-3 text-sm text-white"
                >
                  <input
                    type="checkbox"
                    checked={betaFlagIds.includes(flag.id)}
                    onChange={() => toggleBetaFlag(flag.id)}
                    disabled={Boolean(hasNonBetaOverride)}
                    className="mt-1 h-4 w-4"
                  />
                  <span>
                    <span className="font-black">{flag.name}</span>
                    <span className="mt-1 block text-xs leading-5 text-[#7f8da3]">
                      {hasNonBetaOverride
                        ? `Direct ${beastFeatureFlagStageLabels[directAssignment.stage]} override; manage it in Feature Flags.`
                        : flag.description || flag.key}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        ) : (
          <p className="mt-3 text-sm font-bold text-[#9aa7b8]">
            No feature flags are configured.
          </p>
        )}
        {inheritedBetaAssignments.length ? (
          <p className="mt-3 rounded-lg border border-purple-300/25 bg-purple-300/10 p-3 text-xs leading-5 text-purple-100">
            {inheritedBetaAssignments.length} effective beta assignment
            {inheritedBetaAssignments.length === 1 ? " is" : "s are"} inherited
            through the member&apos;s role and remain managed in Feature Flags.
          </p>
        ) : null}
      </fieldset>

      {error ? (
        <p role="alert" className="mt-5 text-sm font-bold text-red-200">
          {error}
        </p>
      ) : null}

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          className="beast-button-secondary min-h-11"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="beast-button min-h-11"
          disabled={saving || (emailChanged && !confirmEmailChange)}
        >
          {saving ? "Saving account…" : "Save account"}
        </button>
      </div>
    </form>
  );
}
