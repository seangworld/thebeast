"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  DashboardCard,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import {
  beastAdminPromptDomainLabels,
  beastAdminPromptDomains,
  beastAdminPromptGovernanceRules,
  beastAdminPromptStatusLabels,
  beastAdminPromptStatuses,
  buildBeastAdminPromptStatusCounts,
  filterBeastAdminPromptAssets,
  getLatestReleasedPromptVersion,
  isBeastAdminPromptVersion,
  normalizeBeastAdminPromptAssets,
  type BeastAdminPromptAsset,
  type BeastAdminPromptDomain,
  type BeastAdminPromptStatus,
  type BeastAdminPromptVersion,
} from "@/lib/beastAdminPromptLibrary";
import { createClient } from "@/lib/supabase/client";

const inputClassName =
  "min-h-11 w-full rounded-lg border border-[#344052] bg-[#0b1220] px-3 py-2 text-sm text-white outline-none transition placeholder:text-[#68768b] focus:border-amber-300/70 focus:ring-2 focus:ring-amber-300/15";

const statusClasses: Record<BeastAdminPromptStatus, string> = {
  draft: "border-slate-300/30 bg-slate-300/10 text-slate-200",
  in_review: "border-purple-300/35 bg-purple-300/10 text-purple-100",
  approved: "border-sky-300/35 bg-sky-300/10 text-sky-100",
  released: "border-green-300/35 bg-green-300/10 text-green-100",
  archived: "border-amber-300/30 bg-amber-300/10 text-amber-100",
};

type AssetDraft = {
  key: string;
  name: string;
  domain: BeastAdminPromptDomain;
  description: string;
};

type VersionDraft = {
  version: string;
  systemPrompt: string;
  constraints: string;
  variables: string;
  changeSummary: string;
  rollbackOfVersionId: string | null;
};

const emptyAssetDraft: AssetDraft = {
  key: "",
  name: "",
  domain: "shared",
  description: "",
};

const emptyVersionDraft: VersionDraft = {
  version: "",
  systemPrompt: "",
  constraints: "",
  variables: "",
  changeSummary: "",
  rollbackOfVersionId: null,
};

function lines(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function variableNames(value: string) {
  return value
    .split(/[,\r\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function humanizePromptError(error: unknown) {
  const message =
    error && typeof error === "object" && "message" in error
      ? String(error.message)
      : "";

  if (
    /beast_admin_prompt|get_beast_admin_prompt_library|schema cache|function .* does not exist/i.test(
      message
    )
  ) {
    return "Prompt Library storage is not available yet. Apply the BA-107 Supabase migration, then retry.";
  }
  if (/duplicate key|owner_key_unique|prompt_version_unique/i.test(message)) {
    return "That prompt key or version already exists. Use a unique value.";
  }
  if (/status transition|release date|semantic prompt|22023/i.test(message)) {
    return "The prompt version or lifecycle change is not valid. Review the version, required content, and release date.";
  }
  if (/permission|owner access|required|42501|row-level security/i.test(message)) {
    return "Prompt management is restricted to the Beast owner.";
  }
  return "BeastAdmin could not save this prompt change. Your draft remains available to retry.";
}

function versionActions(status: BeastAdminPromptStatus) {
  if (status === "draft") {
    return [
      ["in_review", "Send to review"],
      ["archived", "Archive"],
    ] as const;
  }
  if (status === "in_review") {
    return [
      ["draft", "Return to draft"],
      ["approved", "Approve"],
      ["archived", "Archive"],
    ] as const;
  }
  if (status === "approved") {
    return [
      ["in_review", "Return to review"],
      ["released", "Release"],
      ["archived", "Archive"],
    ] as const;
  }
  if (status === "released") {
    return [["archived", "Archive"]] as const;
  }
  return [] as const;
}

export function BeastAdminPromptLibraryWorkspace() {
  const [assets, setAssets] = useState<BeastAdminPromptAsset[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [assetDraft, setAssetDraft] =
    useState<AssetDraft>(emptyAssetDraft);
  const [versionDraft, setVersionDraft] =
    useState<VersionDraft>(emptyVersionDraft);
  const [query, setQuery] = useState("");
  const [domainFilter, setDomainFilter] = useState<
    BeastAdminPromptDomain | "all"
  >("all");
  const [statusFilter, setStatusFilter] = useState<
    BeastAdminPromptStatus | "all"
  >("all");
  const [releaseDates, setReleaseDates] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingAsset, setSavingAsset] = useState(false);
  const [savingVersion, setSavingVersion] = useState(false);
  const [transitioningId, setTransitioningId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadLibrary(preferredAssetId = "") {
    const supabase = createClient();
    const { data, error: loadError } = await supabase.rpc(
      "get_beast_admin_prompt_library"
    );
    if (loadError) throw loadError;
    const normalized = normalizeBeastAdminPromptAssets(data);
    if (!normalized) throw new Error("Prompt Library data was invalid.");

    setAssets(normalized);
    setSelectedAssetId((current) => {
      if (
        preferredAssetId &&
        normalized.some((asset) => asset.id === preferredAssetId)
      ) {
        return preferredAssetId;
      }
      if (current && normalized.some((asset) => asset.id === current)) {
        return current;
      }
      return normalized[0]?.id || "";
    });
  }

  useEffect(() => {
    let active = true;
    async function loadWorkspace() {
      setLoading(true);
      setError("");
      try {
        await loadLibrary();
      } catch (loadError) {
        if (active) setError(humanizePromptError(loadError));
      } finally {
        if (active) setLoading(false);
      }
    }
    loadWorkspace();
    return () => {
      active = false;
    };
  }, []);

  const selectedAsset =
    assets.find((asset) => asset.id === selectedAssetId) || null;

  useEffect(() => {
    if (!selectedAsset) {
      setAssetDraft(emptyAssetDraft);
      return;
    }
    setAssetDraft({
      key: selectedAsset.key,
      name: selectedAsset.name,
      domain: selectedAsset.domain,
      description: selectedAsset.description,
    });
  }, [selectedAsset]);

  const visibleAssets = useMemo(
    () =>
      filterBeastAdminPromptAssets(assets, {
        query,
        domain: domainFilter,
        status: statusFilter,
      }),
    [assets, domainFilter, query, statusFilter]
  );
  const statusCounts = useMemo(
    () => buildBeastAdminPromptStatusCounts(assets),
    [assets]
  );

  function beginNewAsset() {
    setSelectedAssetId("");
    setAssetDraft(emptyAssetDraft);
    setVersionDraft(emptyVersionDraft);
    setError("");
    setNotice("");
  }

  async function saveAsset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!/^[a-z][a-z0-9_.-]{2,119}$/.test(assetDraft.key.trim())) {
      setError(
        "Use a stable lowercase key with letters, numbers, dots, dashes, or underscores."
      );
      return;
    }
    if (!assetDraft.name.trim()) {
      setError("Give the prompt asset a clear name.");
      return;
    }

    setSavingAsset(true);
    try {
      const supabase = createClient();
      const { data, error: saveError } = await supabase.rpc(
        "save_beast_admin_prompt_asset",
        {
          selected_prompt_id: selectedAsset?.id || null,
          selected_prompt_key: assetDraft.key.trim(),
          selected_name: assetDraft.name.trim(),
          selected_domain: assetDraft.domain,
          selected_description: assetDraft.description.trim(),
        }
      );
      if (saveError) throw saveError;
      if (typeof data !== "string") {
        throw new Error("Saved prompt asset id was invalid.");
      }
      await loadLibrary(data);
      setNotice(
        selectedAsset
          ? `Saved “${assetDraft.name.trim()}”.`
          : `Created “${assetDraft.name.trim()}”. Add its first immutable version when ready.`
      );
    } catch (saveError) {
      setError(humanizePromptError(saveError));
    } finally {
      setSavingAsset(false);
    }
  }

  async function createVersion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedAsset) return;
    setError("");
    setNotice("");

    if (!isBeastAdminPromptVersion(versionDraft.version)) {
      setError("Use a semantic version such as 1.0.0 or 1.1.0-beta.");
      return;
    }
    if (!versionDraft.systemPrompt.trim()) {
      setError("Enter the system prompt for this version.");
      return;
    }
    if (!versionDraft.changeSummary.trim()) {
      setError("Explain what changed in this version.");
      return;
    }

    setSavingVersion(true);
    try {
      const supabase = createClient();
      const { error: saveError } = await supabase.rpc(
        "create_beast_admin_prompt_version",
        {
          selected_prompt_id: selectedAsset.id,
          selected_version: versionDraft.version.trim(),
          selected_system_prompt: versionDraft.systemPrompt.trim(),
          selected_constraints: lines(versionDraft.constraints),
          selected_variables: variableNames(versionDraft.variables),
          selected_change_summary: versionDraft.changeSummary.trim(),
          selected_supersedes_version_id:
            selectedAsset.versions[0]?.id || null,
          selected_rollback_of_version_id:
            versionDraft.rollbackOfVersionId,
        }
      );
      if (saveError) throw saveError;
      await loadLibrary(selectedAsset.id);
      setVersionDraft(emptyVersionDraft);
      setNotice(
        `Created ${selectedAsset.name} v${versionDraft.version.trim()} as a Draft.`
      );
    } catch (saveError) {
      setError(humanizePromptError(saveError));
    } finally {
      setSavingVersion(false);
    }
  }

  async function transitionVersion(
    version: BeastAdminPromptVersion,
    nextStatus: BeastAdminPromptStatus
  ) {
    setError("");
    setNotice("");
    const releaseDate =
      nextStatus === "released"
        ? releaseDates[version.id] ||
          new Date().toLocaleDateString("en-CA")
        : null;

    setTransitioningId(version.id);
    try {
      const supabase = createClient();
      const { error: transitionError } = await supabase.rpc(
        "transition_beast_admin_prompt_version",
        {
          selected_version_id: version.id,
          selected_status: nextStatus,
          selected_release_date: releaseDate,
        }
      );
      if (transitionError) throw transitionError;
      await loadLibrary(selectedAsset?.id || "");
      setNotice(
        `Version ${version.version} is now ${beastAdminPromptStatusLabels[nextStatus]}.`
      );
    } catch (transitionError) {
      setError(humanizePromptError(transitionError));
    } finally {
      setTransitioningId("");
    }
  }

  function prepareRollback(version: BeastAdminPromptVersion) {
    setVersionDraft({
      version: "",
      systemPrompt: version.systemPrompt,
      constraints: version.constraints.join("\n"),
      variables: version.variables.join(", "),
      changeSummary: `Rollback based on v${version.version}.`,
      rollbackOfVersionId: version.id,
    });
    setError("");
    setNotice(
      `Historical content from v${version.version} is ready as a new Draft. Enter a new semantic version before saving.`
    );
    document
      .getElementById("prompt-version-editor")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (loading) {
    return (
      <DashboardCard accent="admin">
        <SectionHeader
          eyebrow="Prompt Library"
          title="Loading managed prompts"
          description="BeastAdmin is retrieving prompt assets and immutable version history."
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
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
        aria-label="Prompt version status summary"
      >
        {beastAdminPromptStatuses.map((status) => (
          <div
            key={status}
            className="rounded-xl border border-[#2a3242] bg-[#111827] p-4"
          >
            <p className="text-xs font-black uppercase tracking-wide text-[#9aa7b8]">
              {beastAdminPromptStatusLabels[status]}
            </p>
            <p className="mt-2 text-3xl font-black text-white">
              {statusCounts[status]}
            </p>
            <p className="mt-1 text-xs text-[#7f8da3]">versions</p>
          </div>
        ))}
      </section>

      <DashboardCard accent="admin">
        <SectionHeader
          eyebrow="Prompt Governance"
          title="History is permanent; releases are deliberate"
          description="Managed prompts use stable identities, immutable content versions, and an owner-controlled review path."
        />
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {beastAdminPromptGovernanceRules.map((rule) => (
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

      <div className="grid min-w-0 gap-6 xl:grid-cols-[21rem_minmax(0,1fr)]">
        <aside className="min-w-0 xl:sticky xl:top-6 xl:self-start">
          <DashboardCard accent="admin">
            <SectionHeader
              eyebrow="Asset Registry"
              title={`${assets.length} managed prompts`}
              description="Search the ecosystem, then inspect its complete version history."
            />
            <div className="mt-4 grid gap-3">
              <label className="grid gap-2 text-sm font-bold text-[#dbe3ef]">
                Search prompts
                <input
                  type="search"
                  className={inputClassName}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Key, name, changes, or author"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-2 text-xs font-bold text-[#dbe3ef]">
                  Area
                  <select
                    className={inputClassName}
                    value={domainFilter}
                    onChange={(event) =>
                      setDomainFilter(
                        event.target.value as BeastAdminPromptDomain | "all"
                      )
                    }
                  >
                    <option value="all">All areas</option>
                    {beastAdminPromptDomains.map((domain) => (
                      <option key={domain} value={domain}>
                        {beastAdminPromptDomainLabels[domain]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-xs font-bold text-[#dbe3ef]">
                  Status
                  <select
                    className={inputClassName}
                    value={statusFilter}
                    onChange={(event) =>
                      setStatusFilter(
                        event.target.value as BeastAdminPromptStatus | "all"
                      )
                    }
                  >
                    <option value="all">All statuses</option>
                    {beastAdminPromptStatuses.map((status) => (
                      <option key={status} value={status}>
                        {beastAdminPromptStatusLabels[status]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
            <button
              type="button"
              className="beast-button mt-4 w-full"
              onClick={beginNewAsset}
            >
              New prompt asset
            </button>
            <div className="mt-4 grid max-h-[36rem] gap-2 overflow-y-auto pr-1">
              {visibleAssets.map((asset) => {
                const release = getLatestReleasedPromptVersion(asset);
                return (
                  <button
                    key={asset.id}
                    type="button"
                    aria-pressed={selectedAssetId === asset.id}
                    onClick={() => setSelectedAssetId(asset.id)}
                    className={`rounded-xl border p-3 text-left transition ${
                      selectedAssetId === asset.id
                        ? "border-amber-200 bg-amber-200/15"
                        : "border-[#2a3242] bg-[#111827] hover:border-amber-200/60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 truncate font-black text-white">
                        {asset.name}
                      </p>
                      <span className="shrink-0 text-xs font-bold text-amber-100">
                        {release ? `v${release.version}` : "Unreleased"}
                      </span>
                    </div>
                    <p className="mt-1 truncate font-mono text-xs text-[#9aa7b8]">
                      {asset.key}
                    </p>
                    <p className="mt-2 text-xs text-[#7f8da3]">
                      {beastAdminPromptDomainLabels[asset.domain]} ·{" "}
                      {asset.versions.length} versions
                    </p>
                  </button>
                );
              })}
              {!visibleAssets.length ? (
                <p className="rounded-xl border border-dashed border-[#2a3242] p-4 text-sm leading-6 text-[#9aa7b8]">
                  {assets.length
                    ? "No prompt assets match these filters."
                    : "No managed prompts exist yet. Create a prompt asset without changing any live AI behavior."}
                </p>
              ) : null}
            </div>
          </DashboardCard>
        </aside>

        <div className="min-w-0 space-y-6">
          <DashboardCard accent="admin">
            <SectionHeader
              eyebrow={selectedAsset ? "Prompt Definition" : "New Prompt"}
              title={
                selectedAsset
                  ? "Manage the stable identity"
                  : "Create a managed prompt asset"
              }
              description="The prompt key identifies the asset. Each content change belongs in a new version."
            />
            <form onSubmit={saveAsset} className="mt-5 grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-bold text-[#dbe3ef]">
                  Prompt key
                  <input
                    className={inputClassName}
                    value={assetDraft.key}
                    maxLength={120}
                    onChange={(event) =>
                      setAssetDraft((current) => ({
                        ...current,
                        key: event.target.value.toLocaleLowerCase(),
                      }))
                    }
                    placeholder="money.coach.system"
                  />
                </label>
                <label className="grid gap-2 text-sm font-bold text-[#dbe3ef]">
                  Name
                  <input
                    className={inputClassName}
                    value={assetDraft.name}
                    maxLength={160}
                    onChange={(event) =>
                      setAssetDraft((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Money Coach system prompt"
                  />
                </label>
              </div>
              <label className="grid gap-2 text-sm font-bold text-[#dbe3ef]">
                Area
                <select
                  className={inputClassName}
                  value={assetDraft.domain}
                  onChange={(event) =>
                    setAssetDraft((current) => ({
                      ...current,
                      domain: event.target.value as BeastAdminPromptDomain,
                    }))
                  }
                >
                  {beastAdminPromptDomains.map((domain) => (
                    <option key={domain} value={domain}>
                      {beastAdminPromptDomainLabels[domain]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-bold text-[#dbe3ef]">
                Purpose
                <textarea
                  className={`${inputClassName} min-h-24 resize-y`}
                  value={assetDraft.description}
                  maxLength={800}
                  onChange={(event) =>
                    setAssetDraft((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Explain where this prompt belongs and what it governs."
                />
              </label>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="beast-button"
                  disabled={savingAsset}
                >
                  {savingAsset
                    ? "Saving…"
                    : selectedAsset
                      ? "Save definition"
                      : "Create prompt"}
                </button>
              </div>
            </form>
          </DashboardCard>

          {selectedAsset ? (
            <>
              <DashboardCard accent="admin">
                <div id="prompt-version-editor" className="scroll-mt-6">
                  <SectionHeader
                    eyebrow={
                      versionDraft.rollbackOfVersionId
                        ? "Rollback Draft"
                        : "New Version"
                    }
                    title="Record the next immutable version"
                    description="New versions always begin as Draft. Review and release happen through the lifecycle below."
                  />
                </div>
                <form onSubmit={createVersion} className="mt-5 grid gap-4">
                  {versionDraft.rollbackOfVersionId ? (
                    <p className="rounded-xl border border-amber-300/35 bg-amber-300/10 px-4 py-3 text-sm font-bold text-amber-100">
                      Historical content has been copied into this rollback
                      draft. It will be saved as a new version; the original
                      history remains unchanged.
                    </p>
                  ) : null}
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="grid gap-2 text-sm font-bold text-[#dbe3ef]">
                      Version
                      <input
                        className={inputClassName}
                        value={versionDraft.version}
                        maxLength={40}
                        onChange={(event) =>
                          setVersionDraft((current) => ({
                            ...current,
                            version: event.target.value,
                          }))
                        }
                        placeholder="1.0.0"
                      />
                    </label>
                    <label className="grid gap-2 text-sm font-bold text-[#dbe3ef]">
                      Variables
                      <input
                        className={inputClassName}
                        value={versionDraft.variables}
                        onChange={(event) =>
                          setVersionDraft((current) => ({
                            ...current,
                            variables: event.target.value,
                          }))
                        }
                        placeholder="memberName, currentContext"
                      />
                    </label>
                  </div>
                  <label className="grid gap-2 text-sm font-bold text-[#dbe3ef]">
                    System prompt
                    <textarea
                      className={`${inputClassName} min-h-56 resize-y font-mono leading-6`}
                      value={versionDraft.systemPrompt}
                      onChange={(event) =>
                        setVersionDraft((current) => ({
                          ...current,
                          systemPrompt: event.target.value,
                        }))
                      }
                      placeholder="Enter the complete managed system prompt."
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-bold text-[#dbe3ef]">
                    Constraints
                    <textarea
                      className={`${inputClassName} min-h-32 resize-y`}
                      value={versionDraft.constraints}
                      onChange={(event) =>
                        setVersionDraft((current) => ({
                          ...current,
                          constraints: event.target.value,
                        }))
                      }
                      placeholder={"One constraint per line\nNever invent member facts."}
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-bold text-[#dbe3ef]">
                    What changed
                    <textarea
                      className={`${inputClassName} min-h-24 resize-y`}
                      value={versionDraft.changeSummary}
                      maxLength={1200}
                      onChange={(event) =>
                        setVersionDraft((current) => ({
                          ...current,
                          changeSummary: event.target.value,
                        }))
                      }
                      placeholder="Describe the behavioral or governance change."
                    />
                  </label>
                  <div className="flex flex-wrap justify-end gap-3">
                    {versionDraft.rollbackOfVersionId ? (
                      <button
                        type="button"
                        className="rounded-lg border border-[#344052] px-4 py-2 text-sm font-black text-[#dbe3ef]"
                        onClick={() => setVersionDraft(emptyVersionDraft)}
                      >
                        Cancel rollback
                      </button>
                    ) : null}
                    <button
                      type="submit"
                      className="beast-button"
                      disabled={savingVersion}
                    >
                      {savingVersion ? "Saving… " : "Create Draft version"}
                    </button>
                  </div>
                </form>
              </DashboardCard>

              <DashboardCard accent="admin">
                <SectionHeader
                  eyebrow="Version History"
                  title={`${selectedAsset.versions.length} immutable versions`}
                  description="Author, changes, release date, status, and rollback lineage remain available for every version."
                />
                <div className="mt-5 grid gap-4">
                  {selectedAsset.versions.map((version) => (
                    <article
                      key={version.id}
                      className="rounded-xl border border-[#2a3242] bg-[#111827] p-4 sm:p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-black text-white">
                              Version {version.version}
                            </h3>
                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs font-black ${statusClasses[version.status]}`}
                            >
                              {beastAdminPromptStatusLabels[version.status]}
                            </span>
                            {version.rollbackOfVersionId ? (
                              <span className="rounded-full border border-amber-300/35 bg-amber-300/10 px-2.5 py-1 text-xs font-black text-amber-100">
                                Rollback version
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-2 text-sm text-[#9aa7b8]">
                            By {version.authorName} ·{" "}
                            {version.releaseDate
                              ? `Released ${formatDate(version.releaseDate)}`
                              : "Not released"}
                          </p>
                        </div>
                        {version.status === "approved" ? (
                          <label className="grid gap-1 text-xs font-bold text-[#dbe3ef]">
                            Release date
                            <input
                              type="date"
                              className={inputClassName}
                              value={releaseDates[version.id] || ""}
                              onChange={(event) =>
                                setReleaseDates((current) => ({
                                  ...current,
                                  [version.id]: event.target.value,
                                }))
                              }
                            />
                          </label>
                        ) : null}
                      </div>
                      <div className="mt-4 grid gap-4 lg:grid-cols-2">
                        <div>
                          <p className="text-xs font-black uppercase tracking-wide text-[#7f8da3]">
                            Changes
                          </p>
                          <p className="mt-2 text-sm leading-6 text-[#dbe3ef]">
                            {version.changeSummary}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-black uppercase tracking-wide text-[#7f8da3]">
                            Managed content
                          </p>
                          <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm leading-6 text-[#9aa7b8]">
                            {version.systemPrompt}
                          </p>
                          <p className="mt-2 text-xs text-[#7f8da3]">
                            {version.constraints.length} constraints ·{" "}
                            {version.variables.length} variables
                          </p>
                        </div>
                      </div>
                      <div className="mt-5 flex flex-wrap gap-2">
                        {versionActions(version.status).map(
                          ([nextStatus, label]) => (
                            <button
                              key={nextStatus}
                              type="button"
                              className="rounded-lg border border-[#344052] px-3 py-2 text-sm font-black text-[#dbe3ef] transition hover:border-amber-200/60"
                              disabled={transitioningId === version.id}
                              onClick={() =>
                                transitionVersion(version, nextStatus)
                              }
                            >
                              {transitioningId === version.id
                                ? "Saving…"
                                : label}
                            </button>
                          )
                        )}
                        {version.status === "released" ||
                        version.status === "archived" ? (
                          <button
                            type="button"
                            className="rounded-lg border border-amber-300/35 px-3 py-2 text-sm font-black text-amber-100 transition hover:bg-amber-300/10"
                            onClick={() => prepareRollback(version)}
                          >
                            Prepare rollback
                          </button>
                        ) : null}
                      </div>
                    </article>
                  ))}
                  {!selectedAsset.versions.length ? (
                    <div className="rounded-xl border border-dashed border-[#2a3242] p-5 text-sm leading-6 text-[#9aa7b8]">
                      This prompt has no versions. Add the first Draft to begin
                      its managed history; live AI behavior remains unchanged.
                    </div>
                  ) : null}
                </div>
              </DashboardCard>
            </>
          ) : (
            <DashboardCard accent="admin">
              <div className="py-8 text-center">
                <p className="beast-kicker">Managed AI assets</p>
                <h2 className="mt-2 text-2xl font-black text-white">
                  Create or select a prompt
                </h2>
                <p className="mx-auto mt-3 max-w-2xl leading-7 text-[#9aa7b8]">
                  A prompt definition creates no runtime override. Content
                  becomes eligible for adoption only after its version completes
                  review and reaches Released.
                </p>
              </div>
            </DashboardCard>
          )}
        </div>
      </div>

      <p className="text-xs leading-5 text-[#7f8da3]">
        Prompt Library records are owner-only. The current Beast Agent prompt
        framework and governed playbooks remain authoritative until an explicit
        integration selects a released managed version.
      </p>
    </div>
  );
}
