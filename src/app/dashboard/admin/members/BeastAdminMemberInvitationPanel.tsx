"use client";

import { useState, type FormEvent } from "react";
import { DashboardCard } from "@/app/components/design/DashboardPrimitives";
import {
  beastAdminEditableModuleIds,
  type BeastAdminEditableModuleId,
} from "@/lib/beastAdminMemberEditing";
import {
  type BeastAdminInvitationHousehold,
  type BeastAdminMemberInvitation,
  type BeastAdminMemberInvitationResult,
} from "@/lib/beastAdminMemberInvitations";
import {
  beastFeatureFlagStageLabels,
  type BeastFeatureFlag,
} from "@/lib/beastFeatureFlags";
import { USER_ROLES, type UserRole } from "@/lib/entitlements";
import {
  householdRelationshipTypes,
  type HouseholdRelationshipType,
} from "@/lib/platform/household";

const moduleLabels: Record<BeastAdminEditableModuleId, string> = {
  money: "BeastMoney",
  learning: "BeastEducation",
  home: "BeastHome",
};

const stateLabels = {
  sent: "Invitation sent",
  resent: "Invitation resent",
  accepted: "Invitation accepted",
  expired: "Invitation expired",
  revoked: "Invitation revoked",
} as const;

function readError(value: unknown, fallback: string) {
  return value &&
    typeof value === "object" &&
    "error" in value &&
    typeof value.error === "string"
    ? value.error
    : fallback;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function BeastAdminMemberInvitationPanel({
  invitations,
  households,
  featureFlags,
  onChanged,
}: {
  invitations: BeastAdminMemberInvitation[];
  households: BeastAdminInvitationHousehold[];
  featureFlags: BeastFeatureFlag[];
  onChanged: (message: string, memberId?: string) => void;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<UserRole>("user");
  const [householdId, setHouseholdId] = useState("");
  const [relationship, setRelationship] = useState<
    HouseholdRelationshipType | ""
  >("");
  const [moduleAccess, setModuleAccess] = useState<
    BeastAdminEditableModuleId[]
  >([]);
  const [betaFlagIds, setBetaFlagIds] = useState<string[]>([]);
  const [invitationMessage, setInvitationMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionId, setActionId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function toggleModule(moduleId: BeastAdminEditableModuleId) {
    setModuleAccess((current) =>
      current.includes(moduleId)
        ? current.filter((item) => item !== moduleId)
        : [...current, moduleId]
    );
  }

  function toggleFlag(flagId: string) {
    setBetaFlagIds((current) =>
      current.includes(flagId)
        ? current.filter((item) => item !== flagId)
        : [...current, flagId]
    );
  }

  function resetForm() {
    setEmail("");
    setDisplayName("");
    setRole("user");
    setHouseholdId("");
    setRelationship("");
    setModuleAccess([]);
    setBetaFlagIds([]);
    setInvitationMessage("");
  }

  async function submitInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      const response = await fetch("/api/admin/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          displayName,
          role,
          householdId: householdId || null,
          relationship: relationship || null,
          moduleAccess,
          betaFlagIds,
          invitationMessage: invitationMessage.trim() || null,
        }),
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          readError(payload, "BeastAdmin could not send this invitation.")
        );
      }
      if (
        !payload ||
        typeof payload !== "object" ||
        !("auditEventId" in payload) ||
        typeof payload.auditEventId !== "string" ||
        !("message" in payload) ||
        typeof payload.message !== "string"
      ) {
        throw new Error(
          "The invitation was sent, but BeastAdmin could not verify its audit event."
        );
      }

      const result = payload as BeastAdminMemberInvitationResult;
      setSuccess(result.message);
      setFormOpen(false);
      resetForm();
      onChanged(result.message, result.memberId);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "BeastAdmin could not send this invitation."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function runAction(
    invitation: BeastAdminMemberInvitation,
    action: "resend" | "revoke"
  ) {
    if (
      action === "revoke" &&
      !window.confirm(
        `Revoke the invitation for ${invitation.email}? The member will not be able to accept the outstanding link.`
      )
    ) {
      return;
    }

    setActionId(invitation.id);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(
        `/api/admin/invitations/${encodeURIComponent(invitation.id)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        }
      );
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          readError(payload, "BeastAdmin could not update this invitation.")
        );
      }
      if (
        !payload ||
        typeof payload !== "object" ||
        !("message" in payload) ||
        typeof payload.message !== "string"
      ) {
        throw new Error(
          "The invitation changed, but BeastAdmin could not verify the result."
        );
      }

      setSuccess(payload.message);
      onChanged(payload.message, invitation.memberId);
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "BeastAdmin could not update this invitation."
      );
    } finally {
      setActionId("");
    }
  }

  return (
    <DashboardCard accent="admin">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="beast-kicker">Controlled invitations</p>
          <h2 className="mt-2 text-2xl font-black text-white">
            Invite a Beast member
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#9aa7b8]">
            Supabase Auth creates one authoritative identity. BeastAdmin applies
            the selected profile, access, household context, beta assignments,
            and an owner audit event to that same user ID.
          </p>
        </div>
        <button
          type="button"
          className="beast-button min-h-11"
          onClick={() => {
            setFormOpen((current) => !current);
            setError("");
            setSuccess("");
          }}
        >
          {formOpen ? "Close invitation form" : "Invite member"}
        </button>
      </div>

      {success ? (
        <p
          role="status"
          className="mt-5 rounded-xl border border-green-300/30 bg-green-300/10 p-4 text-sm font-bold text-green-100"
        >
          {success}
        </p>
      ) : null}
      {error ? (
        <p
          role="alert"
          className="mt-5 rounded-xl border border-red-300/30 bg-red-300/10 p-4 text-sm font-bold text-red-100"
        >
          {error}
        </p>
      ) : null}

      {formOpen ? (
        <form
          onSubmit={submitInvitation}
          className="mt-6 rounded-2xl border border-amber-300/25 bg-[#0b1220] p-4 sm:p-5"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold text-[#dbe3ef]">
              Email
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="beast-input"
                autoComplete="off"
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-[#dbe3ef]">
              Display name
              <input
                required
                maxLength={100}
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                className="beast-input"
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-[#dbe3ef]">
              Beast role
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
              Household assignment
              <select
                value={householdId}
                onChange={(event) => {
                  setHouseholdId(event.target.value);
                  if (!event.target.value) setRelationship("");
                }}
                className="beast-input"
              >
                <option value="">No household assignment</option>
                {households.map((household) => (
                  <option key={household.id} value={household.id}>
                    {household.name}
                  </option>
                ))}
              </select>
              {!households.length ? (
                <span className="text-xs font-medium leading-5 text-[#7f8da3]">
                  No persisted BeastOS households are available. The invitation
                  remains valid without one.
                </span>
              ) : null}
            </label>
            <label className="grid gap-2 text-sm font-bold text-[#dbe3ef]">
              Relationship
              <select
                value={relationship}
                disabled={!householdId}
                onChange={(event) =>
                  setRelationship(
                    event.target.value as HouseholdRelationshipType | ""
                  )
                }
                className="beast-input disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">Not specified</option>
                {householdRelationshipTypes.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-bold text-[#dbe3ef] md:col-span-2">
              Optional invitation message
              <textarea
                value={invitationMessage}
                onChange={(event) => setInvitationMessage(event.target.value)}
                maxLength={1000}
                rows={4}
                className="beast-input resize-y"
                placeholder="Add a short personal welcome."
              />
              <span className="text-right text-xs font-medium text-[#7f8da3]">
                {invitationMessage.length}/1000
              </span>
            </label>
          </div>

          <fieldset className="mt-5">
            <legend className="font-black text-white">
              Initial module access
            </legend>
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
              Initial beta assignments
            </legend>
            {featureFlags.length ? (
              <div className="mt-3 grid gap-2">
                {featureFlags.map((flag) => (
                  <label
                    key={flag.id}
                    className="flex items-start gap-3 rounded-xl border border-[#2a3242] bg-[#111827] p-3 text-sm text-white"
                  >
                    <input
                      type="checkbox"
                      checked={betaFlagIds.includes(flag.id)}
                      onChange={() => toggleFlag(flag.id)}
                      className="mt-1 h-4 w-4"
                    />
                    <span>
                      <span className="font-black">{flag.name}</span>
                      <span className="mt-1 block text-xs leading-5 text-[#7f8da3]">
                        Direct{" "}
                        {beastFeatureFlagStageLabels.beta} assignment
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm font-bold text-[#9aa7b8]">
                No feature flags are configured.
              </p>
            )}
          </fieldset>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="beast-button-secondary min-h-11"
              onClick={() => setFormOpen(false)}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="beast-button min-h-11"
              disabled={submitting}
            >
              {submitting ? "Sending invitation…" : "Send invitation"}
            </button>
          </div>
        </form>
      ) : null}

      <div className="mt-6">
        <h3 className="text-sm font-black text-white">Invitation lifecycle</h3>
        {invitations.length ? (
          <div className="mt-3 grid gap-3">
            {invitations.map((invitation) => {
              const actionable = ["sent", "resent", "expired"].includes(
                invitation.state
              );
              return (
                <article
                  key={invitation.id}
                  className="rounded-xl border border-[#2a3242] bg-[#111827] p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-black text-white">
                        {invitation.displayName}
                      </p>
                      <p className="mt-1 break-all text-sm text-[#9aa7b8]">
                        {invitation.email}
                      </p>
                      <p className="mt-2 text-xs font-bold text-[#7f8da3]">
                        Sent {formatDate(invitation.sentAt)} · Expires{" "}
                        {formatDate(invitation.expiresAt)}
                      </p>
                      {invitation.householdName ? (
                        <p className="mt-2 text-xs text-[#9aa7b8]">
                          {invitation.householdName}
                          {invitation.relationship
                            ? ` · ${invitation.relationship}`
                            : ""}
                        </p>
                      ) : null}
                    </div>
                    <span className="w-fit rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1.5 text-xs font-black text-amber-100">
                      {stateLabels[invitation.state]}
                    </span>
                  </div>
                  {actionable ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="beast-button-secondary min-h-10"
                        disabled={actionId === invitation.id}
                        onClick={() => void runAction(invitation, "resend")}
                      >
                        {actionId === invitation.id
                          ? "Working…"
                          : "Resend invitation"}
                      </button>
                      <button
                        type="button"
                        className="min-h-10 rounded-lg border border-red-300/35 px-4 py-2 text-sm font-black text-red-100 transition hover:bg-red-300/10 disabled:opacity-60"
                        disabled={actionId === invitation.id}
                        onClick={() => void runAction(invitation, "revoke")}
                      >
                        Revoke invitation
                      </button>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : (
          <p className="mt-3 rounded-xl border border-dashed border-[#344052] p-4 text-sm leading-6 text-[#9aa7b8]">
            No controlled invitations have been sent.
          </p>
        )}
      </div>
    </DashboardCard>
  );
}
