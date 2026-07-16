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
  documentAccessGrantDatabaseTableName,
  documentCalendarLinkDatabaseTableName,
  documentCollectionDatabaseTableName,
  documentCategories,
  documentDatabaseTableName,
  documentFolderDatabaseTableName,
  documentModuleLinkDatabaseTableName,
  documentOwnershipRules,
  getActiveDocumentAccessGrants,
  getDocumentAssociations,
  getDocumentVisibilityLabel,
  loadUserDocuments,
  summarizeDocuments,
  supportedDocumentFileTypes,
} from "@/lib/platform/documents";
import { DocumentUploadDropzone } from "./DocumentUploadDropzone";

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
      folders: [],
      collections: [],
      accessGrants: [],
      goalReferences: [],
      calendarLinks: [],
      status: "unavailable",
      message: "Documents could not be loaded right now.",
    };
  }
}

export default async function UploadsPage() {
  const documentLoadResult = await getDocumentLoadResult();
  const documents = documentLoadResult.documents;
  const folders = documentLoadResult.folders;
  const collections = documentLoadResult.collections;
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
              description="Add one file to the shared BeastOS Upload Center. The workflow stores the file and records owner-scoped document metadata. AI extraction is intentionally not part of this package."
            />
            <DocumentUploadDropzone />
            <div className="mt-5 text-xs font-bold uppercase text-[#7f8da3]">
              Supported file types
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {supportedDocumentFileTypes.map((type) => (
                <span
                  key={type}
                  className="rounded-full border border-[#2a3242] bg-[#111827] px-3 py-1 text-xs font-bold text-[#dbe3ef]"
                >
                  {type}
                </span>
              ))}
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
              <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
                <div className="text-xs font-bold uppercase text-[#7f8da3]">
                  Module Links
                </div>
                <div className="mt-2 text-sm font-semibold leading-5 text-[#dbe3ef]">
                  {summary.moduleLinks} active links across{" "}
                  {summary.linkedModules.length} modules.
                </div>
              </div>
              <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
                <div className="text-xs font-bold uppercase text-[#7f8da3]">
                  Ecosystem Links
                </div>
                <div className="mt-2 text-sm font-semibold leading-5 text-[#dbe3ef]">
                  {summary.ecosystemAssociations} links: {summary.moduleLinks}{" "}
                  module, {summary.goalAssociations} goal, and{" "}
                  {summary.calendarAssociations} calendar.
                </div>
              </div>
              <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
                <div className="text-xs font-bold uppercase text-[#7f8da3]">
                  Organized
                </div>
                <div className="mt-2 text-sm font-semibold leading-5 text-[#dbe3ef]">
                  {summary.folderCount} folders, {summary.collectionCount}{" "}
                  collections, and {summary.taggedDocuments} tagged documents.
                </div>
              </div>
              <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
                <div className="text-xs font-bold uppercase text-[#7f8da3]">
                  Sharing
                </div>
                <div className="mt-2 text-sm font-semibold leading-5 text-[#dbe3ef]">
                  {summary.sharedDocuments} shared documents with{" "}
                  {summary.activeAccessGrants} active access grants.
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
                        label={getDocumentVisibilityLabel(document)}
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
                      {document.folder ? (
                        <span className="rounded-full border border-[#2a3242] px-2.5 py-1">
                          Folder: {document.folder.name}
                        </span>
                      ) : null}
                    </div>
                    {document.tags.length > 0 ||
                    document.collections.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-[#c7cfdb]">
                        {document.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full border border-[#2a3242] bg-[#0f1419] px-2.5 py-1"
                          >
                            #{tag}
                          </span>
                        ))}
                        {document.collections.map((collection) => (
                          <span
                            key={collection.id}
                            className="rounded-full border border-[#2a3242] bg-[#0f1419] px-2.5 py-1"
                          >
                            Collection: {collection.name}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <div className="mt-3 rounded-lg border border-[#2a3242] bg-[#0f1419] p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-xs font-black uppercase text-[#7f8da3]">
                          Access
                        </div>
                        <span className="text-xs font-bold text-[#c7cfdb]">
                          {document.status}
                        </span>
                      </div>
                      {getActiveDocumentAccessGrants(document).length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {getActiveDocumentAccessGrants(document).map(
                            (grant) => (
                              <span
                                key={grant.id}
                                className="rounded-full border border-[#2a3242] px-2.5 py-1 text-xs font-bold text-[#c7cfdb]"
                              >
                                {grant.scope}: {grant.permission}
                              </span>
                            )
                          )}
                        </div>
                      ) : (
                        <div className="mt-2 text-xs font-semibold text-[#9aa7b8]">
                          Private to the owner account.
                        </div>
                      )}
                    </div>
                    <div className="mt-3 rounded-lg border border-[#2a3242] bg-[#0f1419] p-3">
                      <div className="text-xs font-black uppercase text-[#7f8da3]">
                        Ecosystem Associations
                      </div>
                      {getDocumentAssociations(document).length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {getDocumentAssociations(document).map(
                            (association) => (
                              <span
                                key={association.id}
                                className="rounded-full border border-[#2a3242] px-2.5 py-1 text-xs font-bold text-[#c7cfdb]"
                              >
                                {association.type}: {association.title}
                              </span>
                            )
                          )}
                        </div>
                      ) : (
                        <div className="mt-2 text-xs font-semibold text-[#9aa7b8]">
                          No module, goal, or calendar records link to this
                          document yet.
                        </div>
                      )}
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

        <section className="grid gap-4 xl:grid-cols-3">
          <DashboardCard accent="documents">
            <SectionHeader
              eyebrow="Folders"
              title="Document folders"
              description="Folders organize your own BeastOS documents. Empty states stay empty until real folders exist."
            />
            <div className="mt-5 grid gap-3">
              {folders.length > 0 ? (
                folders.map((folder) => (
                  <div
                    key={folder.id}
                    className="rounded-xl border border-[#2a3242] bg-[#111827] p-4"
                  >
                    <div className="font-black text-white">{folder.name}</div>
                    <div className="mt-2 text-sm font-semibold leading-5 text-[#9aa7b8]">
                      {folder.description || "No description added."}
                    </div>
                    <div className="mt-3 text-xs font-bold uppercase text-[#7f8da3]">
                      {folder.documentCount} documents
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4 text-sm font-semibold leading-6 text-[#c7cfdb]">
                  No folders yet. Documents remain available by category and
                  recent activity.
                </div>
              )}
            </div>
          </DashboardCard>

          <DashboardCard accent="beastos">
            <SectionHeader
              eyebrow="Collections"
              title="Document collections"
              description="Collections group documents without moving ownership away from BeastOS."
            />
            <div className="mt-5 grid gap-3">
              {collections.length > 0 ? (
                collections.map((collection) => (
                  <div
                    key={collection.id}
                    className="rounded-xl border border-[#2a3242] bg-[#111827] p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-black text-white">
                        {collection.name}
                      </div>
                      <ModuleBadge
                        module="documents"
                        label={collection.status}
                      />
                    </div>
                    <div className="mt-2 text-sm font-semibold leading-5 text-[#9aa7b8]">
                      {collection.description || "No description added."}
                    </div>
                    <div className="mt-3 text-xs font-bold uppercase text-[#7f8da3]">
                      {collection.documentCount} documents
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4 text-sm font-semibold leading-6 text-[#c7cfdb]">
                  No collections yet. Collection membership will appear after
                  real user-owned collection records exist.
                </div>
              )}
            </div>
          </DashboardCard>

          <DashboardCard accent="blue">
            <SectionHeader
              eyebrow="Tags"
              title="Top document tags"
              description="Tags are counted only from real document metadata."
            />
            <div className="mt-5 flex flex-wrap gap-2">
              {summary.topTags.length > 0 ? (
                summary.topTags.map((tag) => (
                  <span
                    key={tag.tag}
                    className="rounded-full border border-[#2a3242] bg-[#111827] px-3 py-1 text-xs font-bold text-[#dbe3ef]"
                  >
                    #{tag.tag} ({tag.count})
                  </span>
                ))
              ) : (
                <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4 text-sm font-semibold leading-6 text-[#c7cfdb]">
                  No tags yet.
                </div>
              )}
            </div>
          </DashboardCard>
        </section>

        <DashboardCard accent="beastos">
          <SectionHeader
            eyebrow="Permissions"
            title="Ownership and sharing"
            description="Document sharing uses explicit BeastOS access grants. Household sharing is recorded only when real owner-scoped grant records exist."
          />
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
              <div className="text-xs font-bold uppercase text-[#7f8da3]">
                Private
              </div>
              <div className="mt-2 text-3xl font-black text-white">
                {summary.totalDocuments - summary.sharedDocuments}
              </div>
            </div>
            <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
              <div className="text-xs font-bold uppercase text-[#7f8da3]">
                Direct Sharing
              </div>
              <div className="mt-2 text-3xl font-black text-white">
                {summary.directSharedDocuments}
              </div>
            </div>
            <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
              <div className="text-xs font-bold uppercase text-[#7f8da3]">
                Household Sharing
              </div>
              <div className="mt-2 text-3xl font-black text-white">
                {summary.householdSharedDocuments}
              </div>
            </div>
            <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
              <div className="text-xs font-bold uppercase text-[#7f8da3]">
                Manage Grants
              </div>
              <div className="mt-2 text-3xl font-black text-white">
                {summary.manageableSharedDocuments}
              </div>
            </div>
          </div>
          {summary.activeAccessGrants === 0 ? (
            <div className="mt-5 rounded-xl border border-[#2a3242] bg-[#111827] p-4 text-sm font-semibold leading-6 text-[#c7cfdb]">
              No document sharing grants yet. Uploaded documents remain private
              until the owner explicitly grants access.
            </div>
          ) : null}
        </DashboardCard>

        <DashboardCard accent="calendar">
          <SectionHeader
            eyebrow="Associations"
            title="Module, goal, and calendar links"
            description="Documents link to ecosystem records through BeastOS-owned references instead of duplicating records inside modules."
          />
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
              <div className="text-xs font-bold uppercase text-[#7f8da3]">
                Module Links
              </div>
              <div className="mt-2 text-3xl font-black text-white">
                {summary.moduleLinks}
              </div>
            </div>
            <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
              <div className="text-xs font-bold uppercase text-[#7f8da3]">
                Goal Links
              </div>
              <div className="mt-2 text-3xl font-black text-white">
                {summary.goalAssociations}
              </div>
            </div>
            <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
              <div className="text-xs font-bold uppercase text-[#7f8da3]">
                Calendar Links
              </div>
              <div className="mt-2 text-3xl font-black text-white">
                {summary.calendarAssociations}
              </div>
            </div>
          </div>
          {summary.ecosystemAssociations === 0 ? (
            <div className="mt-5 rounded-xl border border-[#2a3242] bg-[#111827] p-4 text-sm font-semibold leading-6 text-[#c7cfdb]">
              No ecosystem associations yet. Documents can stay standalone until
              a module, goal, or calendar record needs to reference them.
            </div>
          ) : null}
        </DashboardCard>

        <DashboardCard accent="documents">
          <SectionHeader
            eyebrow="Database"
            title={documentDatabaseTableName}
            description={`The foundation stores document metadata and ownership in ${documentDatabaseTableName}. Organization uses ${documentFolderDatabaseTableName} and ${documentCollectionDatabaseTableName}. Access grants use ${documentAccessGrantDatabaseTableName}. Module reuse is tracked in ${documentModuleLinkDatabaseTableName}. Calendar associations use ${documentCalendarLinkDatabaseTableName}. Goal associations reuse BeastOS goal references. Document contents stay in storage and are not analyzed by this package.`}
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
