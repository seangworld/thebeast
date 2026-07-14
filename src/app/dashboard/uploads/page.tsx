import {
  DashboardCard,
  ModuleBadge,
  SectionHeader,
  moduleAccents,
  type ModuleKey,
} from "@/app/components/design/DashboardPrimitives";
import {
  PlatformServiceHero,
  PrivacyMessageCard,
} from "@/app/dashboard/platformServices";
import { createRouteClient } from "@/lib/supabase/server";
import {
  type BeastDocumentDataClient,
  type DocumentLoadResult,
  documentCategories,
  documentDatabaseTableName,
  documentOwnershipRules,
  loadUserDocuments,
  summarizeDocuments,
  supportedDocumentFileTypes,
} from "@/lib/platform/documents";

const uploadCategories: {
  label: string;
  module: ModuleKey;
  description: string;
}[] = [
  {
    label: "Money",
    module: "money",
    description: "Statements, receipts, bills, tax files, and payoff documents.",
  },
  {
    label: "Learning",
    module: "learning",
    description: "Notes, PDFs, course files, summaries, and references.",
  },
];

async function getDocumentLoadResult(): Promise<DocumentLoadResult> {
  try {
    return await loadUserDocuments(
      createRouteClient() as unknown as BeastDocumentDataClient
    );
  } catch {
    return {
      documents: [],
      status: "unavailable",
      message: "Documents could not be loaded right now.",
    };
  }
}

export default async function UploadsPage() {
  const documentLoadResult = await getDocumentLoadResult();
  const documents = documentLoadResult.documents;
  const summary = summarizeDocuments(documents);

  return (
    <main className="beast-page">
      <div className="beast-container space-y-8">
        <PlatformServiceHero
          module="documents"
          eyebrow="BeastOS Shared Service"
          title="Documents"
          description="Documents are shared Personal Hub records owned by BeastOS. Modules can reference files without owning the document."
          action={<ModuleBadge module="beastos" label="BeastOS Owned" />}
        />

        <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <DashboardCard accent="documents">
            <SectionHeader
              eyebrow="Upload"
              title="Add a document"
              description="The foundation captures file metadata, category, storage location, and account ownership before deeper document intelligence is added."
            />
            <div className="mt-6 rounded-2xl border border-dashed border-[#94a3b8]/50 bg-[#0f1419] p-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[#94a3b8]/40 bg-slate-300/10 text-2xl font-black text-slate-100">
                DOC
              </div>
              <h2 className="mt-5 text-2xl font-black text-white">
                Upload foundation ready
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#c7cfdb]">
                Files are recorded as BeastOS document metadata with category,
                owner, storage bucket, storage path, file type, and size. AI
                extraction is intentionally not part of this package.
              </p>
              <div className="mt-5 text-xs font-bold uppercase text-[#7f8da3]">
                Supported file types
              </div>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {supportedDocumentFileTypes.map((type) => (
                  <span
                    key={type}
                    className="rounded-full border border-[#2a3242] bg-[#111827] px-3 py-1 text-xs font-bold text-[#dbe3ef]"
                  >
                    {type}
                  </span>
                ))}
              </div>
            </div>
          </DashboardCard>

          <PrivacyMessageCard />
        </section>

        <DashboardCard accent="beastos">
          <SectionHeader
            eyebrow="Categories"
            title="Document categories"
            description="Categories are shared BeastOS metadata. Money and Learning may reference documents through BeastOS-owned records."
          />
          <div className="mt-5 flex flex-wrap gap-2">
            {documentCategories.map((category) => (
              <span
                key={category}
                className="rounded-full border border-[#2a3242] bg-[#111827] px-3 py-1 text-xs font-bold text-[#dbe3ef]"
              >
                {category} ({summary.categoryCounts[category]})
              </span>
            ))}
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {uploadCategories.map((category) => {
              const accent = moduleAccents[category.module];

              return (
                <div
                  key={category.label}
                  className="rounded-2xl border border-[#2a3242] bg-[#111827] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-lg font-black text-white">
                        {category.label}
                      </div>
                      <p className="mt-2 text-sm leading-5 text-[#9aa7b8]">
                        {category.description}
                      </p>
                    </div>
                    <span
                      className="mt-1 h-3 w-3 shrink-0 rounded-full"
                      style={{ background: accent.color }}
                    />
                  </div>
                  <div className="mt-4">
                    <ModuleBadge
                      module={category.module}
                      label="Reference"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </DashboardCard>

        <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
          <DashboardCard accent="blue">
            <SectionHeader
              eyebrow="Storage"
              title="Storage summary"
              description="Storage summary uses BeastOS document metadata. It does not inspect or analyze document contents."
            />
            <div className="mt-6 space-y-4">
              <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
                <div className="text-xs font-bold uppercase text-[#7f8da3]">
                  Used
                </div>
                <div className="mt-2 text-3xl font-black text-white">
                  {(summary.storageBytes / 1000 / 1000).toFixed(2)} MB
                </div>
              </div>
              <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
                <div className="text-xs font-bold uppercase text-[#7f8da3]">
                  Active Documents
                </div>
                <div className="mt-2 text-sm font-semibold leading-5 text-[#dbe3ef]">
                  {summary.activeDocuments} of {summary.totalDocuments} documents
                  are active.
                </div>
              </div>
              <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
                <div className="text-xs font-bold uppercase text-[#7f8da3]">
                  Account Scope
                </div>
                <div className="mt-2 text-sm font-semibold leading-5 text-[#dbe3ef]">
                  Files remain tied to the signed-in BeastOS account.
                </div>
              </div>
            </div>
          </DashboardCard>

          <DashboardCard accent="documents">
            <SectionHeader
              eyebrow="Recent Uploads"
              title="Document activity"
              description="Recent files show shared metadata only. Advanced previews, extraction, and summaries are later work."
            />
            <div className="mt-5 grid gap-3">
              {documents.length > 0 ? (
                documents.map((document) => (
                  <div
                    key={document.id}
                    className="rounded-xl border border-[#2a3242] bg-[#111827] p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-black text-white">{document.title}</div>
                      <ModuleBadge
                        module={document.sourceModule || "documents"}
                        label={document.status}
                      />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-[#c7cfdb]">
                      <span className="rounded-full border border-[#2a3242] px-2.5 py-1">
                        {document.category}
                      </span>
                      <span className="rounded-full border border-[#2a3242] px-2.5 py-1">
                        {document.storage.fileName}
                      </span>
                      <span className="rounded-full border border-[#2a3242] px-2.5 py-1">
                        {(document.storage.sizeBytes / 1000).toFixed(1)} KB
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-5">
                  <h2 className="text-lg font-black text-white">
                    No documents yet
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[#c7cfdb]">
                    {documentLoadResult.message ||
                      "Your BeastOS document metadata will appear here after real user-owned uploads exist."}
                  </p>
                </div>
              )}
            </div>
          </DashboardCard>
        </section>

        <DashboardCard accent="documents">
          <SectionHeader
            eyebrow="Database"
            title={documentDatabaseTableName}
            description="The foundation stores document metadata and ownership. Document contents stay in storage and are not analyzed by this package."
          />
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {documentOwnershipRules.map((rule) => (
              <div
                key={rule}
                className="rounded-xl border border-[#2a3242] bg-[#111827] p-4 text-sm font-semibold leading-6 text-[#dbe3ef]"
              >
                {rule}
              </div>
            ))}
          </div>
        </DashboardCard>
      </div>
    </main>
  );
}
