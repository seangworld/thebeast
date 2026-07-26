"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  DashboardCard,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import {
  beastFeatureFlagRules,
  beastFeatureFlagScopeTypes,
  beastFeatureFlagStageLabels,
  beastFeatureFlagStages,
  filterBeastFeatureFlags,
  normalizeBeastFeatureFlagMembers,
  normalizeBeastFeatureFlags,
  type BeastFeatureFlag,
  type BeastFeatureFlagAssignment,
  type BeastFeatureFlagMember,
  type BeastFeatureFlagScopeType,
  type BeastFeatureFlagStage,
} from "@/lib/beastFeatureFlags";
import { USER_ROLES, type UserRole } from "@/lib/entitlements";
import {
  beastModuleRegistry,
  type BeastModuleIdentifier,
} from "@/lib/moduleRegistry";
import { createClient } from "@/lib/supabase/client";

const inputClassName =
  "min-h-11 w-full rounded-lg border border-[#344052] bg-[#0b1220] px-3 py-2 text-sm text-white outline-none transition placeholder:text-[#68768b] focus:border-amber-300/70 focus:ring-2 focus:ring-amber-300/15";

const stageClasses: Record<BeastFeatureFlagStage, string> = {
  hidden: "border-slate-300/30 bg-slate-300/10 text-slate-200",
  owner: "border-amber-300/35 bg-amber-300/10 text-amber-100",
  internal_testing: "border-purple-300/35 bg-purple-300/10 text-purple-100",
  beta: "border-indigo-300/35 bg-indigo-300/10 text-indigo-100",
  released: "border-green-300/35 bg-green-300/10 text-green-100",
  deprecated: "border-red-300/35 bg-red-300/10 text-red-100",
};

const featureFlagExamples = [
  "education.guidance-roadmap",
  "money.velocity-planner",
  "health.timeline",
  "home.maintenance",
  "admin.ceo-mode",
] as const;

const featureFlagLifecycle = [
  "hidden",
  "internal_testing",
  "beta",
  "released",
  "deprecated",
] as const satisfies readonly BeastFeatureFlagStage[];

type FlagDraft = {
  key: string;
  name: string;
  description: string;
};

type AssignmentDraft = {
  scopeType: BeastFeatureFlagScopeType;
  stage: BeastFeatureFlagStage;
  moduleId: BeastModuleIdentifier;
  roleName: UserRole;
  memberId: string;
};

const emptyFlagDraft: FlagDraft = {
  key: "",
  name: "",
  description: "",
};

const emptyAssignmentDraft: AssignmentDraft = {
  scopeType: "module",
  stage: "hidden",
  moduleId: "beastos",
  roleName: "user",
  memberId: "",
};

function formatScope(scope: BeastFeatureFlagScopeType) {
  return scope === "module"
    ? "Module"
    : scope === "role"
      ? "Role"
      : "Member";
}

function assignmentTarget(assignment: BeastFeatureFlagAssignment) {
  if (assignment.scopeType === "module") {
    return (
      beastModuleRegistry.find(
        (module) => module.id === assignment.moduleId
      )?.name || assignment.moduleId
    );
  }
  if (assignment.scopeType === "role") {
    return assignment.roleName === "admin"
      ? "Owner role"
      : `${assignment.roleName} role`;
  }
  return (
    assignment.memberName ||
    assignment.memberEmail ||
    assignment.memberId ||
    "Member"
  );
}

function humanizeFlagError(error: unknown) {
  const message =
    error && typeof error === "object" && "message" in error
      ? String(error.message)
      : "";

  if (
    /beast_admin_feature_flag|get_beast_admin_member_directory|schema cache|function .* does not exist/i.test(
      message
    )
  ) {
    return "Feature flag storage is not available yet. Apply the BA-106 Supabase migration, then retry.";
  }
  if (/duplicate key|feature_flags_flag_key_key/i.test(message)) {
    return "That feature key already exists. Use a unique, stable key.";
  }
  if (/key is invalid|name is required|scope is invalid|stage is invalid|matching target|22023/i.test(message)) {
    return "Check the feature key, name, audience, and release stage before saving.";
  }
  if (/permission|owner access|required|42501|row-level security/i.test(message)) {
    return "Feature flag management is restricted to the Beast owner.";
  }

  return "BeastAdmin could not save the feature flag change. Your draft is still available to retry.";
}

export function BeastAdminFeatureFlagsWorkspace() {
  const [flags, setFlags] = useState<BeastFeatureFlag[]>([]);
  const [members, setMembers] = useState<BeastFeatureFlagMember[]>([]);
  const [selectedFlagId, setSelectedFlagId] = useState("");
  const [flagDraft, setFlagDraft] = useState<FlagDraft>(emptyFlagDraft);
  const [assignmentDraft, setAssignmentDraft] =
    useState<AssignmentDraft>(emptyAssignmentDraft);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingFlag, setSavingFlag] = useState(false);
  const [savingAssignmentId, setSavingAssignmentId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  async function loadFlags(preferredFlagId = "") {
    const supabase = createClient();
    const [flagsResult, membersResult] = await Promise.all([
      supabase.rpc("get_beast_admin_feature_flags"),
      supabase.rpc("get_beast_admin_feature_flag_members"),
    ]);
    if (flagsResult.error) throw flagsResult.error;
    if (membersResult.error) throw membersResult.error;

    const nextFlags = normalizeBeastFeatureFlags(flagsResult.data);
    const nextMembers = normalizeBeastFeatureFlagMembers(membersResult.data);
    if (!nextFlags || !nextMembers) {
      throw new Error("Feature flag data was invalid.");
    }

    setFlags(nextFlags);
    setMembers(nextMembers);
    setAssignmentDraft((current) => ({
      ...current,
      memberId:
        current.memberId &&
        nextMembers.some((member) => member.id === current.memberId)
          ? current.memberId
          : nextMembers[0]?.id || "",
    }));
    setSelectedFlagId((current) => {
      if (
        preferredFlagId &&
        nextFlags.some((flag) => flag.id === preferredFlagId)
      ) {
        return preferredFlagId;
      }
      if (current && nextFlags.some((flag) => flag.id === current)) {
        return current;
      }
      return nextFlags[0]?.id || "";
    });
  }

  useEffect(() => {
    let active = true;

    async function loadWorkspace() {
      setLoading(true);
      setError("");
      try {
        await loadFlags();
      } catch (loadError) {
        if (active) setError(humanizeFlagError(loadError));
      } finally {
        if (active) setLoading(false);
      }
    }

    loadWorkspace();
    return () => {
      active = false;
    };
  }, [refreshKey]);

  const selectedFlag =
    flags.find((flag) => flag.id === selectedFlagId) || null;

  useEffect(() => {
    if (!selectedFlag) {
      setFlagDraft(emptyFlagDraft);
      return;
    }
    setFlagDraft({
      key: selectedFlag.key,
      name: selectedFlag.name,
      description: selectedFlag.description,
    });
  }, [selectedFlag]);

  const visibleFlags = useMemo(
    () => filterBeastFeatureFlags(flags, query),
    [flags, query]
  );
  const stageCounts = useMemo(
    () =>
      beastFeatureFlagStages.reduce<Record<BeastFeatureFlagStage, number>>(
        (counts, stage) => {
          counts[stage] = flags.reduce(
            (total, flag) =>
              total +
              flag.assignments.filter(
                (assignment) => assignment.stage === stage
              ).length,
            0
          );
          return counts;
        },
        {
          hidden: 0,
          owner: 0,
          internal_testing: 0,
          beta: 0,
          released: 0,
          deprecated: 0,
        }
      ),
    [flags]
  );

  function beginNewFlag() {
    setSelectedFlagId("");
    setFlagDraft(emptyFlagDraft);
    setNotice("");
    setError("");
  }

  async function saveFlag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!/^[a-z][a-z0-9_.-]{2,79}$/.test(flagDraft.key.trim())) {
      setError(
        "Use a stable lowercase key with at least three characters. Letters, numbers, dots, dashes, and underscores are supported."
      );
      return;
    }
    if (!flagDraft.name.trim()) {
      setError("Give the feature flag a clear owner-facing name.");
      return;
    }

    setSavingFlag(true);
    try {
      const supabase = createClient();
      const { data, error: saveError } = await supabase.rpc(
        "save_beast_admin_feature_flag",
        {
          selected_flag_id: selectedFlag?.id || null,
          selected_flag_key: flagDraft.key.trim(),
          selected_name: flagDraft.name.trim(),
          selected_description: flagDraft.description.trim(),
        }
      );
      if (saveError) throw saveError;
      if (typeof data !== "string") {
        throw new Error("Saved feature flag id was invalid.");
      }

      await loadFlags(data);
      setNotice(
        selectedFlag
          ? `Saved “${flagDraft.name.trim()}”.`
          : `Created “${flagDraft.name.trim()}” with fail-closed visibility.`
      );
    } catch (saveError) {
      setError(humanizeFlagError(saveError));
    } finally {
      setSavingFlag(false);
    }
  }

  async function saveAssignment({
    assignment,
    stage,
  }: {
    assignment?: BeastFeatureFlagAssignment;
    stage?: BeastFeatureFlagStage;
  } = {}) {
    if (!selectedFlag) return;
    setError("");
    setNotice("");

    const scopeType = assignment?.scopeType || assignmentDraft.scopeType;
    const nextStage = stage || assignment?.stage || assignmentDraft.stage;
    const moduleId =
      scopeType === "module"
        ? assignment?.moduleId || assignmentDraft.moduleId
        : null;
    const roleName =
      scopeType === "role"
        ? assignment?.roleName || assignmentDraft.roleName
        : null;
    const memberId =
      scopeType === "member"
        ? assignment?.memberId || assignmentDraft.memberId
        : null;

    if (scopeType === "member" && !memberId) {
      setError("No authenticated member is available for this assignment.");
      return;
    }

    const savingKey = assignment?.id || "new";
    setSavingAssignmentId(savingKey);
    try {
      const supabase = createClient();
      const { error: saveError } = await supabase.rpc(
        "save_beast_admin_feature_flag_assignment",
        {
          selected_assignment_id: assignment?.id || null,
          selected_flag_id: selectedFlag.id,
          selected_scope_type: scopeType,
          selected_stage: nextStage,
          selected_module_id: moduleId,
          selected_role_name: roleName,
          selected_member_id: memberId,
        }
      );
      if (saveError) throw saveError;

      await loadFlags(selectedFlag.id);
      setNotice(
        `${formatScope(scopeType)} visibility saved as ${beastFeatureFlagStageLabels[nextStage]}.`
      );
    } catch (saveError) {
      setError(humanizeFlagError(saveError));
    } finally {
      setSavingAssignmentId("");
    }
  }

  async function removeAssignment(assignment: BeastFeatureFlagAssignment) {
    if (!selectedFlag) return;
    const confirmed = window.confirm(
      `Remove the ${formatScope(assignment.scopeType).toLowerCase()} assignment for ${assignmentTarget(assignment)}? The next matching rule will take over, or visibility will become Hidden.`
    );
    if (!confirmed) return;

    setError("");
    setNotice("");
    setSavingAssignmentId(assignment.id);
    try {
      const supabase = createClient();
      const { error: removeError } = await supabase.rpc(
        "remove_beast_admin_feature_flag_assignment",
        {
          selected_assignment_id: assignment.id,
        }
      );
      if (removeError) throw removeError;

      await loadFlags(selectedFlag.id);
      setNotice("Assignment removed. Runtime precedence will resolve again.");
    } catch (removeError) {
      setError(humanizeFlagError(removeError));
    } finally {
      setSavingAssignmentId("");
    }
  }

  if (loading) {
    return (
      <DashboardCard accent="admin">
        <SectionHeader
          eyebrow="Feature Flags"
          title="Loading controlled releases"
          description="BeastAdmin is retrieving owner-managed feature definitions and audience assignments."
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

  return (
    <div className="space-y-6">
      <section
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
        aria-label="Feature flag stage summary"
      >
        {beastFeatureFlagStages.map((stage) => (
          <div
            key={stage}
            className="rounded-xl border border-[#2a3242] bg-[#111827] p-4"
          >
            <p className="text-xs font-black uppercase tracking-wide text-[#9aa7b8]">
              {beastFeatureFlagStageLabels[stage]}
            </p>
            <p className="mt-2 text-3xl font-black text-white">
              {stageCounts[stage]}
            </p>
            <p className="mt-1 text-xs text-[#7f8da3]">assignments</p>
          </div>
        ))}
      </section>

      <DashboardCard accent="admin">
        <SectionHeader
          eyebrow="Release Policy"
          title="Specific audiences win"
          description="A member rule overrides a role rule, which overrides the module fallback. A feature without a matching assignment stays Hidden."
        />
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {beastFeatureFlagRules.map((rule) => (
            <p
              key={rule}
              className="rounded-xl border border-[#2a3242] bg-[#111827] p-4 text-sm leading-6 text-[#c7cfdb]"
            >
              {rule}
            </p>
          ))}
        </div>
      </DashboardCard>

      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-red-300/35 bg-red-300/10 px-4 py-3 text-sm font-bold text-red-100"
        >
          {error}
        </p>
      ) : null}
      {notice ? (
        <p
          role="status"
          className="rounded-xl border border-green-300/35 bg-green-300/10 px-4 py-3 text-sm font-bold text-green-100"
        >
          {notice}
        </p>
      ) : null}

      <div className="grid min-w-0 gap-6 xl:grid-cols-[20rem_minmax(0,1fr)]">
        <aside className="min-w-0 xl:sticky xl:top-6 xl:self-start">
          <DashboardCard accent="admin">
            <SectionHeader
              eyebrow="Feature Registry"
              title={`${flags.length} configured`}
              description="Create a stable key, then add only the audiences that should see it."
            />
            <label className="mt-4 grid gap-2 text-sm font-bold text-[#dbe3ef]">
              Search flags
              <input
                type="search"
                className={inputClassName}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Key, name, or purpose"
              />
            </label>
            <button
              type="button"
              className="beast-button mt-4 w-full"
              onClick={beginNewFlag}
            >
              New feature flag
            </button>
            <div className="mt-4 grid max-h-[34rem] gap-2 overflow-y-auto pr-1">
              {visibleFlags.map((flag) => (
                <button
                  key={flag.id}
                  type="button"
                  aria-pressed={selectedFlagId === flag.id}
                  onClick={() => setSelectedFlagId(flag.id)}
                  className={`rounded-xl border p-3 text-left transition ${
                    selectedFlagId === flag.id
                      ? "border-amber-200 bg-amber-200/15"
                      : "border-[#2a3242] bg-[#111827] hover:border-amber-200/60"
                  }`}
                >
                  <p className="truncate font-black text-white">{flag.name}</p>
                  <p className="mt-1 truncate font-mono text-xs text-[#9aa7b8]">
                    {flag.key}
                  </p>
                  <p className="mt-2 text-xs font-bold text-[#7f8da3]">
                    {flag.assignments.length} assignments
                  </p>
                </button>
              ))}
              {!visibleFlags.length ? (
                flags.length ? (
                  <p className="rounded-xl border border-dashed border-[#2a3242] p-4 text-sm leading-6 text-[#9aa7b8]">
                    No flags match this search.
                  </p>
                ) : (
                  <div className="rounded-xl border border-dashed border-[#344052] bg-[#0b1220] p-4">
                    <p className="text-sm leading-6 text-[#c7cfdb]">
                      No feature flags are configured. Use a stable,
                      domain-first key so its owner and purpose remain clear.
                    </p>

                    <div className="mt-5">
                      <p className="text-xs font-black uppercase tracking-wide text-[#9aa7b8]">
                        Example keys
                      </p>
                      <ul className="mt-3 grid gap-2">
                        {featureFlagExamples.map((example) => (
                          <li
                            key={example}
                            className="min-w-0 rounded-lg border border-[#2a3242] bg-[#111827] px-3 py-2"
                          >
                            <code className="break-all font-mono text-xs text-amber-100">
                              {example}
                            </code>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-5">
                      <p className="text-xs font-black uppercase tracking-wide text-[#9aa7b8]">
                        Current lifecycle
                      </p>
                      <ol
                        className="mt-3 grid gap-1.5"
                        aria-label="Feature flag lifecycle"
                      >
                        {featureFlagLifecycle.map((stage, index) => (
                          <li key={stage}>
                            {index > 0 ? (
                              <span
                                aria-hidden="true"
                                className="block pl-4 text-sm font-black text-[#68768b]"
                              >
                                ↓
                              </span>
                            ) : null}
                            <span
                              className={`inline-flex max-w-full rounded-full border px-3 py-1.5 text-xs font-black ${stageClasses[stage]}`}
                            >
                              {beastFeatureFlagStageLabels[stage]}
                            </span>
                          </li>
                        ))}
                      </ol>
                      <p className="mt-3 text-xs leading-5 text-[#7f8da3]">
                        Owner remains available for owner-only previews and is
                        not a lifecycle milestone.
                      </p>
                    </div>
                  </div>
                )
              ) : null}
            </div>
          </DashboardCard>
        </aside>

        <div className="min-w-0 space-y-6">
          <DashboardCard accent="admin">
            <SectionHeader
              eyebrow={selectedFlag ? "Feature Definition" : "New Feature"}
              title={
                selectedFlag
                  ? "Keep the contract stable"
                  : "Create a fail-closed flag"
              }
              description="The key is consumed by application code. Names and descriptions help owners understand the release decision."
            />
            <form onSubmit={saveFlag} className="mt-5 grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-bold text-[#dbe3ef]">
                  Feature key
                  <input
                    className={inputClassName}
                    value={flagDraft.key}
                    maxLength={80}
                    onChange={(event) =>
                      setFlagDraft((current) => ({
                        ...current,
                        key: event.target.value.toLocaleLowerCase(),
                      }))
                    }
                    placeholder="education.guidance-roadmap"
                  />
                </label>
                <label className="grid gap-2 text-sm font-bold text-[#dbe3ef]">
                  Feature name
                  <input
                    className={inputClassName}
                    value={flagDraft.name}
                    maxLength={160}
                    onChange={(event) =>
                      setFlagDraft((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Guidance roadmap workspace"
                  />
                </label>
              </div>
              <label className="grid gap-2 text-sm font-bold text-[#dbe3ef]">
                Purpose
                <textarea
                  className={`${inputClassName} min-h-24 resize-y`}
                  value={flagDraft.description}
                  maxLength={600}
                  onChange={(event) =>
                    setFlagDraft((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Explain what this controls and what should be verified before broader release."
                />
              </label>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="beast-button"
                  disabled={savingFlag}
                >
                  {savingFlag
                    ? "Saving…"
                    : selectedFlag
                      ? "Save definition"
                      : "Create flag"}
                </button>
              </div>
            </form>
          </DashboardCard>

          {selectedFlag ? (
            <>
              <DashboardCard accent="admin">
                <SectionHeader
                  eyebrow="Add Assignment"
                  title="Choose one audience"
                  description="Saving an existing module, role, or member target updates its stage instead of creating a duplicate rule."
                />
                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <label className="grid gap-2 text-sm font-bold text-[#dbe3ef]">
                    Audience
                    <select
                      className={inputClassName}
                      value={assignmentDraft.scopeType}
                      onChange={(event) =>
                        setAssignmentDraft((current) => ({
                          ...current,
                          scopeType: event.target
                            .value as BeastFeatureFlagScopeType,
                        }))
                      }
                    >
                      {beastFeatureFlagScopeTypes.map((scope) => (
                        <option key={scope} value={scope}>
                          {formatScope(scope)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-2 text-sm font-bold text-[#dbe3ef]">
                    Target
                    {assignmentDraft.scopeType === "module" ? (
                      <select
                        className={inputClassName}
                        value={assignmentDraft.moduleId}
                        onChange={(event) =>
                          setAssignmentDraft((current) => ({
                            ...current,
                            moduleId: event.target
                              .value as BeastModuleIdentifier,
                          }))
                        }
                      >
                        {beastModuleRegistry.map((module) => (
                          <option key={module.id} value={module.id}>
                            {module.name}
                          </option>
                        ))}
                      </select>
                    ) : assignmentDraft.scopeType === "role" ? (
                      <select
                        className={inputClassName}
                        value={assignmentDraft.roleName}
                        onChange={(event) =>
                          setAssignmentDraft((current) => ({
                            ...current,
                            roleName: event.target.value as UserRole,
                          }))
                        }
                      >
                        {USER_ROLES.map((role) => (
                          <option key={role} value={role}>
                            {role === "admin" ? "Owner" : role}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <select
                        className={inputClassName}
                        value={assignmentDraft.memberId}
                        onChange={(event) =>
                          setAssignmentDraft((current) => ({
                            ...current,
                            memberId: event.target.value,
                          }))
                        }
                        disabled={!members.length}
                      >
                        {!members.length ? (
                          <option value="">No authenticated members</option>
                        ) : null}
                        {members.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.displayName}
                            {member.email ? ` — ${member.email}` : ""}
                          </option>
                        ))}
                      </select>
                    )}
                  </label>
                  <label className="grid gap-2 text-sm font-bold text-[#dbe3ef]">
                    Release stage
                    <select
                      className={inputClassName}
                      value={assignmentDraft.stage}
                      onChange={(event) =>
                        setAssignmentDraft((current) => ({
                          ...current,
                          stage: event.target.value as BeastFeatureFlagStage,
                        }))
                      }
                    >
                      {beastFeatureFlagStages.map((stage) => (
                        <option key={stage} value={stage}>
                          {beastFeatureFlagStageLabels[stage]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="beast-button self-end"
                    disabled={savingAssignmentId === "new"}
                    onClick={() => saveAssignment()}
                  >
                    {savingAssignmentId === "new"
                      ? "Saving…"
                      : "Save assignment"}
                  </button>
                </div>
              </DashboardCard>

              <DashboardCard accent="admin">
                <SectionHeader
                  eyebrow="Active Assignments"
                  title={`${selectedFlag.assignments.length} visibility rules`}
                  description="Remove a specific rule to fall back to the next audience level. If nothing matches, the feature becomes Hidden."
                />
                <div className="mt-5 grid gap-3">
                  {selectedFlag.assignments.map((assignment) => (
                    <article
                      key={assignment.id}
                      className="grid gap-4 rounded-xl border border-[#2a3242] bg-[#111827] p-4 lg:grid-cols-[minmax(0,1fr)_14rem_auto]"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-[#344052] px-2.5 py-1 text-xs font-black text-[#c7cfdb]">
                            {formatScope(assignment.scopeType)}
                          </span>
                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-black ${stageClasses[assignment.stage]}`}
                          >
                            {beastFeatureFlagStageLabels[assignment.stage]}
                          </span>
                        </div>
                        <h3 className="mt-3 truncate font-black text-white">
                          {assignmentTarget(assignment)}
                        </h3>
                        {assignment.memberEmail ? (
                          <p className="mt-1 truncate text-xs text-[#7f8da3]">
                            {assignment.memberEmail}
                          </p>
                        ) : null}
                      </div>
                      <label className="grid gap-2 text-sm font-bold text-[#dbe3ef]">
                        Change stage
                        <select
                          className={inputClassName}
                          value={assignment.stage}
                          disabled={savingAssignmentId === assignment.id}
                          onChange={(event) =>
                            saveAssignment({
                              assignment,
                              stage: event.target
                                .value as BeastFeatureFlagStage,
                            })
                          }
                        >
                          {beastFeatureFlagStages.map((stage) => (
                            <option key={stage} value={stage}>
                              {beastFeatureFlagStageLabels[stage]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        type="button"
                        className="rounded-lg border border-red-300/35 px-3 py-2 text-sm font-black text-red-100 transition hover:bg-red-300/10 lg:self-end"
                        disabled={savingAssignmentId === assignment.id}
                        onClick={() => removeAssignment(assignment)}
                      >
                        Remove
                      </button>
                    </article>
                  ))}
                  {!selectedFlag.assignments.length ? (
                    <div className="rounded-xl border border-dashed border-[#2a3242] p-5 text-sm leading-6 text-[#9aa7b8]">
                      This feature is Hidden for everyone because it has no
                      assignments. Add a module fallback, then narrow or expand
                      access with role and member overrides.
                    </div>
                  ) : null}
                </div>
              </DashboardCard>
            </>
          ) : (
            <DashboardCard accent="admin">
              <div className="py-8 text-center">
                <p className="beast-kicker">Controlled release</p>
                <h2 className="mt-2 text-2xl font-black text-white">
                  Create or select a feature flag
                </h2>
                <p className="mx-auto mt-3 max-w-2xl leading-7 text-[#9aa7b8]">
                  Flag definitions never expose a feature by themselves.
                  Visibility begins only after the owner adds an explicit
                  audience assignment.
                </p>
              </div>
            </DashboardCard>
          )}
        </div>
      </div>

      <p className="text-xs leading-5 text-[#7f8da3]">
        The owner member directory supplies authenticated accounts for
        member-specific assignments. Feature flags do not replace membership,
        module ownership, RLS, or entitlement checks; consuming features must
        satisfy every applicable permission boundary.
      </p>
    </div>
  );
}
