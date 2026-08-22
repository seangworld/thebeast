"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  DashboardCard,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import {
  beastAdminDeploymentStatusLabels,
  beastAdminDeploymentStatuses,
  beastAdminReleaseProductLabels,
  beastAdminReleaseProducts,
  beastAdminValidationStatusLabels,
  beastAdminValidationStatuses,
  buildBeastAdminReleaseSummary,
  filterBeastAdminReleaseRecords,
  normalizeBeastAdminReleaseRecords,
  type BeastAdminDeploymentStatus,
  type BeastAdminReleaseProduct,
  type BeastAdminReleaseRecord,
  type BeastAdminValidationStatus,
} from "@/lib/beastAdminReleaseCenter";
import { createClient } from "@/lib/supabase/client";

const inputClassName =
  "min-h-11 w-full rounded-lg border border-[#344052] bg-[#0b1220] px-3 py-2 text-sm text-white outline-none transition placeholder:text-[#68768b] focus:border-amber-300/70 focus:ring-2 focus:ring-amber-300/15";

const validationClasses: Record<BeastAdminValidationStatus, string> = {
  not_started: "border-slate-300/30 bg-slate-300/10 text-slate-200",
  in_progress: "border-purple-300/35 bg-purple-300/10 text-purple-100",
  passed: "border-green-300/35 bg-green-300/10 text-green-100",
  passed_with_limits: "border-amber-300/35 bg-amber-300/10 text-amber-100",
  failed: "border-red-300/35 bg-red-300/10 text-red-100",
};

const deploymentClasses: Record<BeastAdminDeploymentStatus, string> = {
  not_deployed: "border-slate-300/30 bg-slate-300/10 text-slate-200",
  scheduled: "border-sky-300/35 bg-sky-300/10 text-sky-100",
  deploying: "border-purple-300/35 bg-purple-300/10 text-purple-100",
  deployed: "border-green-300/35 bg-green-300/10 text-green-100",
  failed: "border-red-300/35 bg-red-300/10 text-red-100",
  rolled_back: "border-amber-300/35 bg-amber-300/10 text-amber-100",
};

type ReleaseDraft = {
  product: BeastAdminReleaseProduct;
  version: string;
  releaseDate: string;
  title: string;
  summary: string;
  modulesIncluded: BeastAdminReleaseProduct[];
  bugFixes: string;
  features: string;
  databaseMigrations: string;
  validationStatus: BeastAdminValidationStatus;
  validationChecks: string;
  validationNotes: string;
  deploymentStatus: BeastAdminDeploymentStatus;
  deploymentReference: string;
  deploymentNotes: string;
};

const emptyReleaseDraft: ReleaseDraft = {
  product: "platform",
  version: "",
  releaseDate: "",
  title: "",
  summary: "",
  modulesIncluded: ["platform"],
  bugFixes: "",
  features: "",
  databaseMigrations: "",
  validationStatus: "not_started",
  validationChecks: "",
  validationNotes: "",
  deploymentStatus: "not_deployed",
  deploymentReference: "",
  deploymentNotes: "",
};

function lines(value: string) {
  return value
    .split(/\r?\n/)
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

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function releaseToDraft(release: BeastAdminReleaseRecord): ReleaseDraft {
  return {
    product: release.product,
    version: release.version,
    releaseDate: release.releaseDate,
    title: release.title,
    summary: release.summary,
    modulesIncluded: release.modulesIncluded,
    bugFixes: release.bugFixes.join("\n"),
    features: release.features.join("\n"),
    databaseMigrations: release.databaseMigrations.join("\n"),
    validationStatus: release.validationStatus,
    validationChecks: release.validationChecks.join("\n"),
    validationNotes: release.validationNotes,
    deploymentStatus: release.deploymentStatus,
    deploymentReference: release.deploymentReference,
    deploymentNotes: release.deploymentNotes,
  };
}

function humanizeReleaseError(error: unknown) {
  const message =
    error && typeof error === "object" && "message" in error
      ? String(error.message)
      : "";

  if (
    /beast_admin_release|get_beast_admin_release_records|schema cache|function .* does not exist/i.test(
      message
    )
  ) {
    return "Release Center storage is not available yet. Verify BA-REL-101 using 20260726000600_add_beast_admin_release_center.sql, then retry.";
  }
  if (/duplicate key|owner_version_unique/i.test(message)) {
    return "That product version is already recorded. Select the existing release to update it.";
  }
  if (/deployment requires passing|production reference/i.test(message)) {
    return "A production deployment requires passing validation and a production reference.";
  }
  if (/invalid|required|22023/i.test(message)) {
    return "Review the release identity, included modules, validation, and deployment details before saving.";
  }
  if (/permission|owner access|42501|row-level security/i.test(message)) {
    return "Release Center is restricted to the Beast owner.";
  }
  return "BeastAdmin could not save this release. Your edits remain available to retry.";
}

export function BeastAdminReleaseNotesWorkspace() {
  const [releases, setReleases] = useState<BeastAdminReleaseRecord[]>([]);
  const [selectedReleaseId, setSelectedReleaseId] = useState("");
  const [draft, setDraft] = useState<ReleaseDraft>(emptyReleaseDraft);
  const [query, setQuery] = useState("");
  const [productFilter, setProductFilter] = useState<
    BeastAdminReleaseProduct | "all"
  >("all");
  const [validationFilter, setValidationFilter] = useState<
    BeastAdminValidationStatus | "all"
  >("all");
  const [deploymentFilter, setDeploymentFilter] = useState<
    BeastAdminDeploymentStatus | "all"
  >("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadReleases(preferredReleaseId = "") {
    const supabase = createClient();
    const { data, error: loadError } = await supabase.rpc(
      "get_beast_admin_release_records"
    );
    if (loadError) throw loadError;
    const normalized = normalizeBeastAdminReleaseRecords(data);
    if (!normalized) throw new Error("Release Center data was invalid.");

    setReleases(normalized);
    setSelectedReleaseId((current) => {
      if (
        preferredReleaseId &&
        normalized.some((release) => release.id === preferredReleaseId)
      ) {
        return preferredReleaseId;
      }
      if (current && normalized.some((release) => release.id === current)) {
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
        await loadReleases();
      } catch (loadError) {
        if (active) setError(humanizeReleaseError(loadError));
      } finally {
        if (active) setLoading(false);
      }
    }
    loadWorkspace();
    return () => {
      active = false;
    };
  }, []);

  const selectedRelease =
    releases.find((release) => release.id === selectedReleaseId) || null;

  useEffect(() => {
    setDraft(
      selectedRelease ? releaseToDraft(selectedRelease) : emptyReleaseDraft
    );
  }, [selectedRelease]);

  const visibleReleases = useMemo(
    () =>
      filterBeastAdminReleaseRecords(releases, {
        query,
        product: productFilter,
        validationStatus: validationFilter,
        deploymentStatus: deploymentFilter,
      }),
    [
      deploymentFilter,
      productFilter,
      query,
      releases,
      validationFilter,
    ]
  );
  const summary = useMemo(
    () => buildBeastAdminReleaseSummary(releases),
    [releases]
  );

  function beginNewRelease() {
    setSelectedReleaseId("");
    setDraft(emptyReleaseDraft);
    setError("");
    setNotice("");
  }

  function toggleModule(module: BeastAdminReleaseProduct) {
    setNotice("");
    setDraft((current) => ({
      ...current,
      modulesIncluded: current.modulesIncluded.includes(module)
        ? current.modulesIncluded.filter((item) => item !== module)
        : [...current.modulesIncluded, module],
    }));
  }

  async function saveRelease(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!draft.version.trim() || !draft.title.trim() || !draft.releaseDate) {
      setError("Version, date, and release title are required.");
      return;
    }
    if (!draft.modulesIncluded.length) {
      setError("Select at least one included module or product.");
      return;
    }
    if (
      draft.deploymentStatus === "deployed" &&
      !["passed", "passed_with_limits"].includes(draft.validationStatus)
    ) {
      setError("Production deployment requires passing validation.");
      return;
    }
    if (
      draft.deploymentStatus === "deployed" &&
      !draft.deploymentReference.trim()
    ) {
      setError("Add the production URL, build, or commit reference.");
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const { data, error: saveError } = await supabase.rpc(
        "save_beast_admin_release_record",
        {
          selected_release_id: selectedRelease?.id || null,
          selected_product: draft.product,
          selected_version: draft.version.trim(),
          selected_release_date: draft.releaseDate,
          selected_title: draft.title.trim(),
          selected_summary: draft.summary.trim(),
          selected_modules_included: draft.modulesIncluded,
          selected_bug_fixes: lines(draft.bugFixes),
          selected_features: lines(draft.features),
          selected_database_migrations: lines(draft.databaseMigrations),
          selected_validation_status: draft.validationStatus,
          selected_validation_checks: lines(draft.validationChecks),
          selected_validation_notes: draft.validationNotes.trim(),
          selected_validated_at: selectedRelease?.validatedAt || null,
          selected_deployment_status: draft.deploymentStatus,
          selected_deployment_reference:
            draft.deploymentReference.trim(),
          selected_deployment_notes: draft.deploymentNotes.trim(),
          selected_deployed_at: selectedRelease?.deployedAt || null,
        }
      );
      if (saveError) throw saveError;
      if (typeof data !== "string") {
        throw new Error("Saved release id was invalid.");
      }

      await loadReleases(data);
      setNotice(
        selectedRelease
          ? `Updated ${draft.title.trim()} v${draft.version.trim()}.`
          : `Recorded ${draft.title.trim()} v${draft.version.trim()}.`
      );
    } catch (saveError) {
      setError(humanizeReleaseError(saveError));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <DashboardCard accent="admin">
        <SectionHeader
          eyebrow="Non-canonical operational annotations"
          title="Loading owner release notes"
          description="BeastAdmin is retrieving owner-maintained operational notes. These records cannot change canonical release truth."
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

  const metrics = [
    ["Releases", summary.releases],
    ["Production", summary.deployed],
    ["Validated", summary.validationPassed],
    ["With migrations", summary.withMigrations],
    ["Needs attention", summary.needsAttention],
  ] as const;

  return (
    <div className="space-y-6">
      <DashboardCard accent="admin">
        <SectionHeader
          eyebrow="Non-canonical boundary"
          title="Operational release annotations"
          description="These owner-maintained records supplement canonical BeastFusion releases. They do not validate, release, deploy, or override governed state."
          action={
            <Link href="/dashboard/admin/releases" className="beast-button">
              Canonical Release Center
            </Link>
          }
        />
      </DashboardCard>
      <section
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
        aria-label="Release history summary"
      >
        {metrics.map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-[#2a3242] bg-[#111827] p-4"
          >
            <p className="text-xs font-black uppercase tracking-wide text-[#9aa7b8]">
              {label}
            </p>
            <p className="mt-2 text-3xl font-black text-white">{value}</p>
          </div>
        ))}
      </section>

      <DashboardCard accent="admin">
        <SectionHeader
          eyebrow="Operational note boundary"
          title="Record observations without creating governance truth"
          description="Generated versions, public notes, and owner annotations remain supplemental evidence. Canonical BeastFusion projection truth always wins."
          action={
            <div className="flex flex-wrap gap-2">
              <Link
                href="/dashboard/releases"
                className="rounded-lg border border-[#344052] px-3 py-2 text-sm font-black text-[#dbe3ef]"
              >
                Registered versions
              </Link>
              <Link
                href="/release-notes"
                className="rounded-lg border border-[#344052] px-3 py-2 text-sm font-black text-[#dbe3ef]"
              >
                Public notes
              </Link>
            </div>
          }
        />
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

      <div className="grid min-w-0 gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]">
        <aside className="min-w-0 xl:sticky xl:top-6 xl:self-start">
          <DashboardCard accent="admin">
            <SectionHeader
              eyebrow="Release History"
              title={`${releases.length} recorded`}
              description="Filter the complete owner record, then select a release to inspect or update."
            />
            <div className="mt-4 grid gap-3">
              <label className="grid gap-2 text-sm font-bold text-[#dbe3ef]">
                Search releases
                <input
                  type="search"
                  className={inputClassName}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Version, feature, migration, or build"
                />
              </label>
              <label className="grid gap-2 text-xs font-bold text-[#dbe3ef]">
                Product
                <select
                  className={inputClassName}
                  value={productFilter}
                  onChange={(event) =>
                    setProductFilter(
                      event.target.value as
                        | BeastAdminReleaseProduct
                        | "all"
                    )
                  }
                >
                  <option value="all">All products</option>
                  {beastAdminReleaseProducts.map((product) => (
                    <option key={product} value={product}>
                      {beastAdminReleaseProductLabels[product]}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-2 text-xs font-bold text-[#dbe3ef]">
                  Validation
                  <select
                    className={inputClassName}
                    value={validationFilter}
                    onChange={(event) =>
                      setValidationFilter(
                        event.target.value as
                          | BeastAdminValidationStatus
                          | "all"
                      )
                    }
                  >
                    <option value="all">All</option>
                    {beastAdminValidationStatuses.map((status) => (
                      <option key={status} value={status}>
                        {beastAdminValidationStatusLabels[status]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-xs font-bold text-[#dbe3ef]">
                  Deployment
                  <select
                    className={inputClassName}
                    value={deploymentFilter}
                    onChange={(event) =>
                      setDeploymentFilter(
                        event.target.value as
                          | BeastAdminDeploymentStatus
                          | "all"
                      )
                    }
                  >
                    <option value="all">All</option>
                    {beastAdminDeploymentStatuses.map((status) => (
                      <option key={status} value={status}>
                        {beastAdminDeploymentStatusLabels[status]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
            <button
              type="button"
              className="beast-button mt-4 w-full"
              onClick={beginNewRelease}
            >
              Record release
            </button>
            <div className="mt-4 grid max-h-[38rem] gap-2 overflow-y-auto pr-1">
              {visibleReleases.map((release) => (
                <button
                  key={release.id}
                  type="button"
                  aria-pressed={selectedReleaseId === release.id}
                  onClick={() => setSelectedReleaseId(release.id)}
                  className={`rounded-xl border p-3 text-left transition ${
                    selectedReleaseId === release.id
                      ? "border-amber-200 bg-amber-200/15"
                      : "border-[#2a3242] bg-[#111827] hover:border-amber-200/60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 truncate font-black text-white">
                      {release.title}
                    </p>
                    <span className="shrink-0 text-xs font-bold text-amber-100">
                      v{release.version}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[#9aa7b8]">
                    {beastAdminReleaseProductLabels[release.product]} ·{" "}
                    {formatDate(release.releaseDate)}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-black ${validationClasses[release.validationStatus]}`}
                    >
                      {beastAdminValidationStatusLabels[
                        release.validationStatus
                      ]}
                    </span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-black ${deploymentClasses[release.deploymentStatus]}`}
                    >
                      {beastAdminDeploymentStatusLabels[
                        release.deploymentStatus
                      ]}
                    </span>
                  </div>
                </button>
              ))}
              {!visibleReleases.length ? (
                <p className="rounded-xl border border-dashed border-[#2a3242] p-4 text-sm leading-6 text-[#9aa7b8]">
                  {releases.length
                    ? "No releases match these filters."
                    : "No complete release records exist yet. Existing version identities remain available as references, but missing evidence is not inferred."}
                </p>
              ) : null}
            </div>
          </DashboardCard>
        </aside>

        <DashboardCard accent="admin">
          <SectionHeader
            eyebrow={selectedRelease ? "Release Record" : "New Release"}
            title={
              selectedRelease
                ? `${selectedRelease.title} v${selectedRelease.version}`
                : "Record verified release evidence"
            }
            description="Keep product identity, scope, database changes, validation, and production deployment together."
          />
          <form onSubmit={saveRelease} className="mt-5 grid gap-6">
            <section className="grid gap-4">
              <h3 className="text-lg font-black text-white">
                Release identity
              </h3>
              <div className="grid gap-4 md:grid-cols-3">
                <label className="grid gap-2 text-sm font-bold text-[#dbe3ef]">
                  Product
                  <select
                    className={inputClassName}
                    value={draft.product}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        product: event.target
                          .value as BeastAdminReleaseProduct,
                      }))
                    }
                  >
                    {beastAdminReleaseProducts.map((product) => (
                      <option key={product} value={product}>
                        {beastAdminReleaseProductLabels[product]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-bold text-[#dbe3ef]">
                  Version
                  <input
                    className={inputClassName}
                    value={draft.version}
                    maxLength={80}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        version: event.target.value,
                      }))
                    }
                    placeholder="2.5.0"
                  />
                </label>
                <label className="grid gap-2 text-sm font-bold text-[#dbe3ef]">
                  Date
                  <input
                    type="date"
                    className={inputClassName}
                    value={draft.releaseDate}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        releaseDate: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>
              <label className="grid gap-2 text-sm font-bold text-[#dbe3ef]">
                Release title
                <input
                  className={inputClassName}
                  value={draft.title}
                  maxLength={200}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  placeholder="BeastAdmin release controls"
                />
              </label>
              <label className="grid gap-2 text-sm font-bold text-[#dbe3ef]">
                Summary
                <textarea
                  className={`${inputClassName} min-h-24 resize-y`}
                  value={draft.summary}
                  maxLength={1600}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      summary: event.target.value,
                    }))
                  }
                  placeholder="Summarize what this release accomplished."
                />
              </label>
            </section>

            <section className="grid gap-4 border-t border-[#2a3242] pt-6">
              <div>
                <h3 className="text-lg font-black text-white">
                  Modules included
                </h3>
                <p className="mt-1 text-sm text-[#9aa7b8]">
                  Select every product or shared platform area changed by this
                  release.
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {beastAdminReleaseProducts.map((product) => (
                  <label
                    key={product}
                    className="flex min-h-11 items-center gap-3 rounded-lg border border-[#344052] bg-[#0b1220] px-3 py-2 text-sm font-bold text-[#dbe3ef]"
                  >
                    <input
                      type="checkbox"
                      checked={draft.modulesIncluded.includes(product)}
                      onChange={() => toggleModule(product)}
                    />
                    {beastAdminReleaseProductLabels[product]}
                  </label>
                ))}
              </div>
            </section>

            <section className="grid gap-4 border-t border-[#2a3242] pt-6 lg:grid-cols-2">
              <label className="grid gap-2 text-sm font-bold text-[#dbe3ef]">
                Features
                <textarea
                  className={`${inputClassName} min-h-36 resize-y`}
                  value={draft.features}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      features: event.target.value,
                    }))
                  }
                  placeholder="One shipped feature per line"
                />
              </label>
              <label className="grid gap-2 text-sm font-bold text-[#dbe3ef]">
                Bug fixes
                <textarea
                  className={`${inputClassName} min-h-36 resize-y`}
                  value={draft.bugFixes}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      bugFixes: event.target.value,
                    }))
                  }
                  placeholder="One verified fix per line"
                />
              </label>
              <label className="grid gap-2 text-sm font-bold text-[#dbe3ef] lg:col-span-2">
                Database migrations
                <textarea
                  className={`${inputClassName} min-h-28 resize-y font-mono`}
                  value={draft.databaseMigrations}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      databaseMigrations: event.target.value,
                    }))
                  }
                  placeholder="One migration filename per line; leave blank only when none were required"
                />
              </label>
            </section>

            <section className="grid gap-4 border-t border-[#2a3242] pt-6">
              <h3 className="text-lg font-black text-white">
                Validation status
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-bold text-[#dbe3ef]">
                  Status
                  <select
                    className={inputClassName}
                    value={draft.validationStatus}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        validationStatus: event.target
                          .value as BeastAdminValidationStatus,
                      }))
                    }
                  >
                    {beastAdminValidationStatuses.map((status) => (
                      <option key={status} value={status}>
                        {beastAdminValidationStatusLabels[status]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-bold text-[#dbe3ef]">
                  Checks completed
                  <textarea
                    className={`${inputClassName} min-h-28 resize-y`}
                    value={draft.validationChecks}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        validationChecks: event.target.value,
                      }))
                    }
                    placeholder={"TypeScript\nESLint\nProduction build\nFull suite\ngit diff --check"}
                  />
                </label>
              </div>
              <label className="grid gap-2 text-sm font-bold text-[#dbe3ef]">
                Validation notes
                <textarea
                  className={`${inputClassName} min-h-24 resize-y`}
                  value={draft.validationNotes}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      validationNotes: event.target.value,
                    }))
                  }
                  placeholder="Record limitations, skipped checks, or the passing test count."
                />
              </label>
              {selectedRelease?.validatedAt ? (
                <p className="text-xs text-[#7f8da3]">
                  Last validation recorded{" "}
                  {formatTimestamp(selectedRelease.validatedAt)}
                </p>
              ) : null}
            </section>

            <section className="grid gap-4 border-t border-[#2a3242] pt-6">
              <h3 className="text-lg font-black text-white">
                Production deployment
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-bold text-[#dbe3ef]">
                  Status
                  <select
                    className={inputClassName}
                    value={draft.deploymentStatus}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        deploymentStatus: event.target
                          .value as BeastAdminDeploymentStatus,
                      }))
                    }
                  >
                    {beastAdminDeploymentStatuses.map((status) => (
                      <option key={status} value={status}>
                        {beastAdminDeploymentStatusLabels[status]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-bold text-[#dbe3ef]">
                  Production reference
                  <input
                    className={inputClassName}
                    value={draft.deploymentReference}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        deploymentReference: event.target.value,
                      }))
                    }
                    placeholder="Production URL, build ID, or commit SHA"
                  />
                </label>
              </div>
              <label className="grid gap-2 text-sm font-bold text-[#dbe3ef]">
                Deployment notes
                <textarea
                  className={`${inputClassName} min-h-24 resize-y`}
                  value={draft.deploymentNotes}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      deploymentNotes: event.target.value,
                    }))
                  }
                  placeholder="Record deployment verification, rollback, or environment details."
                />
              </label>
              {selectedRelease?.deployedAt ? (
                <p className="text-xs text-[#7f8da3]">
                  Production deployment recorded{" "}
                  {formatTimestamp(selectedRelease.deployedAt)}
                </p>
              ) : null}
            </section>

            <div className="flex justify-end border-t border-[#2a3242] pt-6">
              <button
                type="submit"
                className="beast-button"
                disabled={saving}
              >
                {saving
                  ? "Saving…"
                  : selectedRelease
                    ? "Save release"
                    : "Record release"}
              </button>
            </div>
          </form>
        </DashboardCard>
      </div>

      <p className="text-xs leading-5 text-[#7f8da3]">
        Release Center is owner-only. Saving a production deployment records
        evidence; it does not execute a deployment or apply database
        migrations.
      </p>
    </div>
  );
}
