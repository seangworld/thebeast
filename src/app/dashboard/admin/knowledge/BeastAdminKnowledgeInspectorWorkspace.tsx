"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DashboardCard,
  MetricTile,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import {
  buildBeastAdminKnowledgeInspector,
  filterBeastAdminKnowledgeInspector,
  formatProfessionalName,
  normalizeBeastAdminKnowledgeSourceSnapshot,
  type BeastAdminKnowledgeConfidence,
  type BeastAdminKnowledgeInspector,
  type BeastAdminKnowledgeItem,
  type BeastAdminKnowledgeMemory,
} from "@/lib/beastAdminKnowledgeInspector";
import {
  normalizeBeastAdminMemberDirectory,
  type BeastAdminMemberDirectoryEntry,
} from "@/lib/beastAdminMemberTimeline";
import { createClient } from "@/lib/supabase/client";

const confidenceClasses: Record<BeastAdminKnowledgeConfidence, string> = {
  high: "border-green-300/35 bg-green-300/10 text-green-100",
  medium: "border-amber-300/35 bg-amber-300/10 text-amber-100",
  low: "border-orange-300/35 bg-orange-300/10 text-orange-100",
  unknown: "border-slate-300/30 bg-slate-300/10 text-slate-200",
  "not-recorded": "border-slate-300/30 bg-slate-300/10 text-slate-200",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function humanizeKnowledgeError(error: unknown) {
  const message =
    error && typeof error === "object" && "message" in error
      ? String(error.message)
      : "";
  if (
    /get_beast_admin_knowledge_inspector|schema cache|function .* does not exist/i.test(
      message
    )
  ) {
    return "Knowledge inspection is not available yet. Apply the BA-112 Supabase migration, then retry.";
  }
  if (/permission|owner access|required|42501/i.test(message)) {
    return "Knowledge Inspector is restricted to the Beast owner.";
  }
  if (/not available|P0002/i.test(message)) {
    return "That member is no longer available in the owner directory.";
  }
  return "BeastAdmin could not load persisted professional understanding. No knowledge was inferred.";
}

function EmptySection({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-[#344052] bg-[#0b1220] p-5 text-sm leading-6 text-[#9aa7b8]">
      {children}
    </p>
  );
}

function KnowledgeItemCard({ item }: { item: BeastAdminKnowledgeItem }) {
  return (
    <article className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wide text-[#7f8da3]">
            {formatProfessionalName(item.professionalId)}
          </p>
          <h3 className="mt-1 text-lg font-black text-white">{item.label}</h3>
        </div>
        <span
          className={`rounded-full border px-2.5 py-1 text-xs font-black capitalize ${confidenceClasses[item.confidence]}`}
        >
          {item.confidence.replace("-", " ")} confidence
        </span>
      </div>
      <p className="mt-3 break-words text-sm font-semibold leading-6 text-[#dbe3ef]">
        {item.value}
      </p>
      <div className="mt-4 border-t border-[#2a3242] pt-3 text-xs leading-5 text-[#7f8da3]">
        <p>Basis: {item.confidenceBasis}</p>
        <p className="mt-1">
          Source:{" "}
          {item.source === "education-profile"
            ? "Structured Education understanding"
            : "Durable professional memory"}
        </p>
        <p className="mt-1">Updated {formatDate(item.updatedAt)}</p>
      </div>
    </article>
  );
}

function MemoryRecord({ memory }: { memory: BeastAdminKnowledgeMemory }) {
  return (
    <details className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
      <summary className="cursor-pointer list-none">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wide text-[#7f8da3]">
              {formatProfessionalName(memory.professionalId)}
            </p>
            <h3 className="mt-1 break-words font-black text-white">
              {memory.key}
            </h3>
            <p className="mt-2 text-xs text-[#68768b]">
              Updated {formatDate(memory.updatedAt)}
            </p>
          </div>
          <span className="rounded-full border border-purple-300/35 bg-purple-300/10 px-2.5 py-1 text-xs font-black uppercase text-purple-100">
            {memory.scope} scope
          </span>
        </div>
      </summary>
      <div className="mt-4 grid gap-4 border-t border-[#2a3242] pt-4">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-[#7f8da3]">
            Purpose
          </p>
          <p className="mt-2 text-sm leading-6 text-[#dbe3ef]">
            {memory.purpose}
          </p>
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-[#7f8da3]">
            Stored value
          </p>
          <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-[#2a3242] bg-[#080d15] p-3 text-xs leading-5 text-[#c7cfdb]">
            {JSON.stringify(memory.value, null, 2)}
          </pre>
        </div>
        <dl className="grid gap-3 text-xs sm:grid-cols-2">
          <div>
            <dt className="font-black uppercase tracking-wide text-[#7f8da3]">
              Evidence references
            </dt>
            <dd className="mt-1 text-[#dbe3ef]">{memory.evidence.length}</dd>
          </div>
          <div>
            <dt className="font-black uppercase tracking-wide text-[#7f8da3]">
              Created
            </dt>
            <dd className="mt-1 text-[#dbe3ef]">
              {formatDate(memory.createdAt)}
            </dd>
          </div>
          <div>
            <dt className="font-black uppercase tracking-wide text-[#7f8da3]">
              Source conversation
            </dt>
            <dd className="mt-1 break-all text-[#dbe3ef]">
              {memory.sourceConversationId || "Not recorded"}
            </dd>
          </div>
          <div>
            <dt className="font-black uppercase tracking-wide text-[#7f8da3]">
              Expires
            </dt>
            <dd className="mt-1 text-[#dbe3ef]">
              {memory.expiresAt
                ? formatDate(memory.expiresAt)
                : "No expiration recorded"}
            </dd>
          </div>
        </dl>
      </div>
    </details>
  );
}

function InspectorLoadingState() {
  return (
    <DashboardCard accent="admin">
      <SectionHeader
        eyebrow="Knowledge Inspector"
        title="Reading persisted understanding"
        description="BeastAdmin is loading owner-authorized profile, memory, confidence, and follow-up records."
      />
      <div
        className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        aria-busy="true"
      >
        {Array.from({ length: 8 }, (_, index) => (
          <div
            key={index}
            className="h-28 animate-pulse rounded-xl border border-[#2a3242] bg-[#111827]"
          />
        ))}
      </div>
    </DashboardCard>
  );
}

export function BeastAdminKnowledgeInspectorWorkspace() {
  const [members, setMembers] = useState<BeastAdminMemberDirectoryEntry[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [inspector, setInspector] =
    useState<BeastAdminKnowledgeInspector | null>(null);
  const [professionalId, setProfessionalId] = useState("all");
  const [query, setQuery] = useState("");
  const [directoryLoading, setDirectoryLoading] = useState(true);
  const [inspectorLoading, setInspectorLoading] = useState(false);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadDirectory() {
      setDirectoryLoading(true);
      setError("");
      try {
        const { data, error: directoryError } = await createClient().rpc(
          "get_beast_admin_member_directory"
        );
        if (directoryError) throw directoryError;
        const nextMembers = normalizeBeastAdminMemberDirectory(data);
        if (!nextMembers) throw new Error("Member directory data was invalid.");
        if (!active) return;
        setMembers(nextMembers);
        setSelectedMemberId((current) =>
          current && nextMembers.some((member) => member.id === current)
            ? current
            : nextMembers[0]?.id || ""
        );
      } catch (directoryError) {
        if (active) {
          setMembers([]);
          setSelectedMemberId("");
          setInspector(null);
          setError(humanizeKnowledgeError(directoryError));
        }
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

    async function loadInspector() {
      if (!selectedMemberId) {
        setInspector(null);
        return;
      }
      setInspectorLoading(true);
      setError("");
      setProfessionalId("all");
      try {
        const { data, error: inspectorError } = await createClient().rpc(
          "get_beast_admin_knowledge_inspector",
          { selected_member_id: selectedMemberId }
        );
        if (inspectorError) throw inspectorError;
        const source = normalizeBeastAdminKnowledgeSourceSnapshot(data);
        if (!source) throw new Error("Knowledge Inspector data was invalid.");
        if (active) setInspector(buildBeastAdminKnowledgeInspector(source));
      } catch (inspectorError) {
        if (active) {
          setInspector(null);
          setError(humanizeKnowledgeError(inspectorError));
        }
      } finally {
        if (active) setInspectorLoading(false);
      }
    }

    void loadInspector();
    return () => {
      active = false;
    };
  }, [refreshKey, selectedMemberId]);

  const filteredMembers = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return members;
    return members.filter((member) =>
      [member.displayName, member.email || "", member.role].some((value) =>
        value.toLocaleLowerCase().includes(normalizedQuery)
      )
    );
  }, [members, query]);
  const visibleInspector = useMemo(
    () =>
      inspector
        ? filterBeastAdminKnowledgeInspector(inspector, professionalId)
        : null,
    [inspector, professionalId]
  );

  if (directoryLoading) return <InspectorLoadingState />;

  if (!members.length) {
    return (
      <DashboardCard accent={error ? "red" : "admin"}>
        <SectionHeader
          eyebrow="Knowledge Inspector"
          title={error ? "Persisted understanding unavailable" : "No members to inspect"}
          description={
            error ||
            "Knowledge inspection begins after an authenticated member profile is created. BeastAdmin does not generate sample understanding."
          }
        />
        {error ? (
          <button
            type="button"
            className="beast-button mt-5"
            onClick={() => setRefreshKey((current) => current + 1)}
          >
            Retry
          </button>
        ) : null}
      </DashboardCard>
    );
  }

  return (
    <div className="grid min-w-0 gap-6 xl:grid-cols-[20rem_minmax(0,1fr)]">
      <aside className="min-w-0 xl:sticky xl:top-6 xl:self-start">
        <DashboardCard accent="admin">
          <SectionHeader
            eyebrow="Members"
            title={`${members.length} registered`}
            description="Choose whose persisted professional understanding to inspect."
          />
          <label className="mt-4 grid gap-2 text-sm font-bold text-[#dbe3ef]">
            Search members
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Name, email, or role"
              className="min-h-11 w-full rounded-lg border border-[#344052] bg-[#0b1220] px-3 py-2 text-sm text-white outline-none placeholder:text-[#68768b] focus:border-amber-300/70 focus:ring-2 focus:ring-amber-300/15"
            />
          </label>
          <div className="mt-4 grid max-h-[34rem] gap-2 overflow-y-auto pr-1">
            {filteredMembers.map((member) => (
              <button
                key={member.id}
                type="button"
                aria-pressed={selectedMemberId === member.id}
                onClick={() => setSelectedMemberId(member.id)}
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
                  {member.email || "No email available"}
                </p>
              </button>
            ))}
            {!filteredMembers.length ? (
              <EmptySection>No members match this search.</EmptySection>
            ) : null}
          </div>
        </DashboardCard>
      </aside>

      <div className="min-w-0 space-y-6">
        {inspectorLoading ? (
          <InspectorLoadingState />
        ) : error || !inspector || !visibleInspector ? (
          <DashboardCard accent="red">
            <SectionHeader
              eyebrow="Knowledge Inspector"
              title="Persisted understanding unavailable"
              description={error || "No valid inspector snapshot was returned."}
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
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="beast-kicker">Read-only inspection</p>
                  <h2 className="mt-2 text-3xl font-black text-white">
                    {inspector.member.displayName}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[#9aa7b8]">
                    Stored evidence only. This view does not generate facts,
                    edit memory, or expose raw conversation messages.
                  </p>
                </div>
                <button
                  type="button"
                  className="beast-button"
                  onClick={() => setRefreshKey((current) => current + 1)}
                >
                  Refresh
                </button>
              </div>
              <div
                className="mt-5 flex gap-2 overflow-x-auto pb-1"
                aria-label="Filter knowledge by professional"
              >
                {["all", ...inspector.professionals].map((id) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={professionalId === id}
                    onClick={() => setProfessionalId(id)}
                    className={`shrink-0 rounded-full border px-3 py-2 text-xs font-black transition ${
                      professionalId === id
                        ? "border-amber-200 bg-amber-200/20 text-amber-100"
                        : "border-[#344052] bg-[#111827] text-[#9aa7b8] hover:border-amber-200/60"
                    }`}
                  >
                    {id === "all" ? "All professionals" : formatProfessionalName(id)}
                  </button>
                ))}
              </div>
            </DashboardCard>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricTile
                label="Known facts"
                value={String(visibleInspector.knownFacts.length)}
                detail="High-confidence, directly supported understanding."
                icon="✓"
                tone="green"
              />
              <MetricTile
                label="Working hypotheses"
                value={String(visibleInspector.workingHypotheses.length)}
                detail="Tentative understanding kept separate from fact."
                icon="≈"
                tone="yellow"
              />
              <MetricTile
                label="Outstanding questions"
                value={String(visibleInspector.outstandingQuestions.length)}
                detail="Explicit gaps and saved follow-ups."
                icon="?"
                tone="blue"
              />
              <MetricTile
                label="Memory records"
                value={String(visibleInspector.memoryHistory.length)}
                detail="Durable records retained by professionals."
                icon="◫"
                tone="purple"
              />
            </section>

            <DashboardCard accent="green">
              <SectionHeader
                eyebrow="Known facts"
                title="What professionals have evidence for"
                description="Only structured profile facts and durable memories with recorded high confidence appear here."
              />
              <div className="mt-5 grid gap-3 lg:grid-cols-2">
                {visibleInspector.knownFacts.map((item) => (
                  <KnowledgeItemCard key={item.id} item={item} />
                ))}
                {!visibleInspector.knownFacts.length ? (
                  <EmptySection>
                    No known facts match this professional filter. BeastAdmin
                    will not turn missing or unclassified memory into facts.
                  </EmptySection>
                ) : null}
              </div>
            </DashboardCard>

            <DashboardCard accent="yellow">
              <SectionHeader
                eyebrow="Working hypotheses"
                title="What professionals currently think"
                description="Tentative interpretations remain visibly separate from confirmed member facts."
              />
              <div className="mt-5 grid gap-3 lg:grid-cols-2">
                {visibleInspector.workingHypotheses.map((item) => (
                  <KnowledgeItemCard key={item.id} item={item} />
                ))}
                {!visibleInspector.workingHypotheses.length ? (
                  <EmptySection>
                    No evidence-backed working hypotheses match this filter.
                  </EmptySection>
                ) : null}
              </div>
            </DashboardCard>

            <DashboardCard accent="blue">
              <SectionHeader
                eyebrow="Outstanding questions"
                title="What professionals still need"
                description="Questions come from explicit Education intake gaps or persisted conversation follow-ups."
              />
              <div className="mt-5 grid gap-3">
                {visibleInspector.outstandingQuestions.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-xl border border-[#2a3242] bg-[#111827] p-4"
                  >
                    <p className="text-xs font-black uppercase tracking-wide text-[#7f8da3]">
                      {formatProfessionalName(item.professionalId)}
                    </p>
                    <p className="mt-2 font-semibold leading-6 text-white">
                      {item.question}
                    </p>
                    <p className="mt-3 text-xs text-[#68768b]">
                      {item.source === "education-intake"
                        ? "Structured intake gap"
                        : "Saved conversation follow-up"}
                      {item.updatedAt
                        ? ` · Updated ${formatDate(item.updatedAt)}`
                        : ""}
                    </p>
                  </article>
                ))}
                {!visibleInspector.outstandingQuestions.length ? (
                  <EmptySection>
                    No explicit outstanding questions match this filter.
                  </EmptySection>
                ) : null}
              </div>
            </DashboardCard>

            <DashboardCard accent="purple">
              <SectionHeader
                eyebrow="Cross-module context"
                title="User-scoped professional context"
                description="This inventory shows persisted user-scope memory by owning professional. It does not claim that unpersisted shared understanding exists."
              />
              <div className="mt-5 grid gap-3 lg:grid-cols-2">
                {visibleInspector.crossModuleContext.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-xl border border-[#2a3242] bg-[#111827] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-black uppercase tracking-wide text-[#7f8da3]">
                          {formatProfessionalName(item.professionalId)}
                        </p>
                        <h3 className="mt-1 font-black text-white">
                          {item.label}
                        </h3>
                      </div>
                      <span className="rounded-full border border-purple-300/35 bg-purple-300/10 px-2.5 py-1 text-xs font-black text-purple-100">
                        User scope
                      </span>
                    </div>
                    <p className="mt-3 break-words text-sm leading-6 text-[#dbe3ef]">
                      {item.value}
                    </p>
                    <p className="mt-3 text-xs leading-5 text-[#68768b]">
                      {item.purpose}
                    </p>
                  </article>
                ))}
                {!visibleInspector.crossModuleContext.length ? (
                  <EmptySection>
                    No user-scoped professional context is persisted for this
                    selection. Module-local records are not presented as shared
                    understanding.
                  </EmptySection>
                ) : null}
              </div>
            </DashboardCard>

            <DashboardCard accent="admin">
              <SectionHeader
                eyebrow="Memory history"
                title="Durable professional records"
                description="Expand a record to inspect its stored value, purpose, evidence count, scope, and source metadata."
              />
              <div className="mt-5 grid gap-3">
                {visibleInspector.memoryHistory.map((memory) => (
                  <MemoryRecord key={memory.id} memory={memory} />
                ))}
                {!visibleInspector.memoryHistory.length ? (
                  <EmptySection>
                    No durable professional memory records match this filter.
                  </EmptySection>
                ) : null}
              </div>
            </DashboardCard>

            <DashboardCard accent="admin">
              <SectionHeader
                eyebrow="Source coverage"
                title="What this inspector can verify"
                description="Confidence reflects stored labels and direct structured evidence. It is never estimated from conversation volume."
              />
              <dl className="mt-5 grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
                  <dt className="text-xs font-black uppercase tracking-wide text-[#7f8da3]">
                    Education profile
                  </dt>
                  <dd className="mt-2 font-black capitalize text-white">
                    {inspector.coverage.educationProfile}
                  </dd>
                </div>
                <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
                  <dt className="text-xs font-black uppercase tracking-wide text-[#7f8da3]">
                    Professional memory
                  </dt>
                  <dd className="mt-2 font-black capitalize text-white">
                    {inspector.coverage.professionalMemory}
                  </dd>
                </div>
                <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
                  <dt className="text-xs font-black uppercase tracking-wide text-[#7f8da3]">
                    Shared understanding
                  </dt>
                  <dd className="mt-2 font-black text-white">
                    Persisted memory only
                  </dd>
                </div>
              </dl>
            </DashboardCard>
          </>
        )}
      </div>
    </div>
  );
}
