import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildDocument,
  buildDocumentStoragePath,
  documentAccessGrantDatabaseColumns,
  documentAccessGrantDatabaseTableName,
  documentAccessPermissions,
  documentAccessScopes,
  documentAccessStatuses,
  documentAssociationTypes,
  documentCalendarLinkDatabaseColumns,
  documentCalendarLinkDatabaseTableName,
  documentCalendarLinkStatuses,
  documentCategories,
  documentCollectionDatabaseColumns,
  documentCollectionDatabaseTableName,
  documentCollectionItemDatabaseColumns,
  documentCollectionItemDatabaseTableName,
  documentCollectionItemStatuses,
  documentCollectionStatuses,
  documentDatabaseColumns,
  documentDatabaseTableName,
  documentFolderDatabaseColumns,
  documentFolderDatabaseTableName,
  documentGoalReferenceDatabaseTableName,
  documentModuleLinkDatabaseColumns,
  documentModuleLinkDatabaseTableName,
  documentModuleLinkStatuses,
  documentOwnershipRules,
  documentStatuses,
  documentStorageBucketName,
  documentUploadMaxFileSizeBytes,
  formatDocumentFileSize,
  getActiveDocumentAccessGrants,
  getActiveDocumentCalendarLinks,
  getDocumentAssociations,
  getDocumentVisibilityLabel,
  getDocumentUploadAcceptValue,
  getDocumentUploadValidationError,
  loadUserDocuments,
  type BeastDocumentDataClient,
  mockDocuments,
  sanitizeDocumentFileName,
  summarizeDocuments,
  supportedDocumentFileTypes,
  supportedDocumentUploadExtensions,
  supportedDocumentUploadMimeTypes,
} from "../src/lib/platform/documents";
import { sharedNavigation } from "../src/lib/moduleNavigation";
import type {
  BeastDocument,
  BeastDocumentAccessGrant,
  BeastDocumentCalendarLink,
  BeastDocumentCollection,
  BeastDocumentCollectionItem,
  BeastDocumentFolder,
  BeastGoalReference,
  BeastDocumentModuleLink,
} from "../src/lib/types/database";

test("BD-001 creates a BeastOS-owned Document model and database contract", () => {
  assert.equal(documentDatabaseTableName, "beast_documents");
  assert.equal(documentStorageBucketName, "beast-documents");
  assert.deepEqual(documentStatuses, [
    "Uploaded",
    "Ready",
    "Archived",
    "Deleted",
  ]);
  assert.deepEqual(documentCategories, [
    "Money",
    "Learning",
    "Identity",
    "Household",
    "Tax",
    "Legal",
    "Health",
    "Home",
    "Vehicle",
    "Other",
  ]);
  assert.deepEqual(supportedDocumentFileTypes, [
    "PDF",
    "Images",
    "CSV",
    "Spreadsheets",
    "Documents",
    "Text",
  ]);
  assert.equal(
    documentModuleLinkDatabaseTableName,
    "beast_document_module_links"
  );
  assert.equal(documentFolderDatabaseTableName, "beast_document_folders");
  assert.equal(
    documentCollectionDatabaseTableName,
    "beast_document_collections"
  );
  assert.equal(
    documentCollectionItemDatabaseTableName,
    "beast_document_collection_items"
  );
  assert.equal(
    documentAccessGrantDatabaseTableName,
    "beast_document_access_grants"
  );
  assert.equal(
    documentCalendarLinkDatabaseTableName,
    "beast_document_calendar_links"
  );
  assert.deepEqual(documentModuleLinkStatuses, ["Active", "Archived"]);
  assert.deepEqual(documentCollectionStatuses, ["Active", "Archived"]);
  assert.deepEqual(documentCollectionItemStatuses, ["Active", "Archived"]);
  assert.deepEqual(documentAccessPermissions, ["None", "View", "Manage"]);
  assert.deepEqual(documentAccessScopes, ["Member", "Household"]);
  assert.deepEqual(documentAccessStatuses, ["Active", "Revoked"]);
  assert.deepEqual(documentCalendarLinkStatuses, ["Active", "Archived"]);
  assert.deepEqual(documentAssociationTypes, ["Module", "Goal", "Calendar"]);
  assert.deepEqual(
    documentDatabaseColumns.map((column) => [column.name, column.required]),
    [
      ["id", true],
      ["owner_id", true],
      ["title", true],
      ["description", false],
      ["category", true],
      ["status", true],
      ["storage_bucket", true],
      ["storage_path", true],
      ["file_name", true],
      ["mime_type", true],
      ["size_bytes", true],
      ["checksum", false],
      ["tags", true],
      ["folder_id", false],
      ["metadata", true],
      ["source_module", false],
      ["created_at", true],
      ["updated_at", true],
    ]
  );
  assert.deepEqual(
    documentModuleLinkDatabaseColumns.map((column) => [
      column.name,
      column.required,
    ]),
    [
      ["id", true],
      ["owner_id", true],
      ["document_id", true],
      ["source_module", true],
      ["module_record_id", false],
      ["title", true],
      ["summary", false],
      ["status", true],
      ["created_at", true],
      ["updated_at", true],
    ]
  );
  assert.deepEqual(
    documentFolderDatabaseColumns.map((column) => [
      column.name,
      column.required,
    ]),
    [
      ["id", true],
      ["owner_id", true],
      ["parent_folder_id", false],
      ["name", true],
      ["description", false],
      ["sort_order", true],
      ["created_at", true],
      ["updated_at", true],
    ]
  );
  assert.deepEqual(
    documentCollectionDatabaseColumns.map((column) => [
      column.name,
      column.required,
    ]),
    [
      ["id", true],
      ["owner_id", true],
      ["name", true],
      ["description", false],
      ["status", true],
      ["sort_order", true],
      ["created_at", true],
      ["updated_at", true],
    ]
  );
  assert.deepEqual(
    documentCollectionItemDatabaseColumns.map((column) => [
      column.name,
      column.required,
    ]),
    [
      ["id", true],
      ["owner_id", true],
      ["collection_id", true],
      ["document_id", true],
      ["status", true],
      ["sort_order", true],
      ["created_at", true],
      ["updated_at", true],
    ]
  );
  assert.deepEqual(
    documentAccessGrantDatabaseColumns.map((column) => [
      column.name,
      column.required,
    ]),
    [
      ["id", true],
      ["owner_id", true],
      ["document_id", true],
      ["scope", true],
      ["permission", true],
      ["status", true],
      ["grantee_user_id", false],
      ["household_id", false],
      ["family_member_id", false],
      ["note", false],
      ["created_at", true],
      ["updated_at", true],
      ["revoked_at", false],
    ]
  );
  assert.deepEqual(
    documentCalendarLinkDatabaseColumns.map((column) => [
      column.name,
      column.required,
    ]),
    [
      ["id", true],
      ["owner_id", true],
      ["document_id", true],
      ["calendar_item_id", false],
      ["title", true],
      ["summary", false],
      ["status", true],
      ["reference_date", true],
      ["start_time", false],
      ["end_time", false],
      ["source_module", false],
      ["created_at", true],
      ["updated_at", true],
    ]
  );
  assert.equal(
    documentOwnershipRules[0],
    "Documents belong to BeastOS as shared Personal Hub data."
  );
  assert.match(
    documentOwnershipRules[3],
    /linked to multiple module records/
  );
  assert.match(documentOwnershipRules[4], /Folders, collections, tags/);
  assert.match(documentOwnershipRules[5], /access grants/);
  assert.equal(
    documentOwnershipRules.some((rule) =>
      /Goal references reuse BeastOS goal reference records/.test(rule)
    ),
    true
  );
  assert.equal(
    documentOwnershipRules.some((rule) =>
      /Calendar associations use BeastOS-owned document calendar links/.test(rule)
    ),
    true
  );
  assert.match(
    documentOwnershipRules[documentOwnershipRules.length - 1],
    /BeastDocuments remains superseded/
  );
});

test("BD-001 Documents overview route stays BeastOS-owned", () => {
  const documentsPage = readFileSync("src/app/dashboard/uploads/page.tsx", "utf8");
  const migration = readFileSync(
    "migrations/20260714_add_beast_documents.sql",
    "utf8"
  );
  const moduleLinkMigration = readFileSync(
    "migrations/20260715_add_beast_document_module_links.sql",
    "utf8"
  );
  const summary = summarizeDocuments(mockDocuments);

  assert.equal(summary.totalDocuments, 2);
  assert.equal(summary.activeDocuments, 2);
  assert.equal(summary.moduleLinks, 0);
  assert.equal(summary.categoryCounts.Money, 1);
  assert.equal(summary.categoryCounts.Learning, 1);
  assert.equal(summary.taggedDocuments, 2);
  assert.equal(summary.sharedDocuments, 0);
  assert.equal(summary.activeAccessGrants, 0);
  assert.equal(summary.ecosystemAssociations, 0);
  assert.equal(summary.goalAssociations, 0);
  assert.equal(summary.calendarAssociations, 0);
  assert.deepEqual(summary.topTags[0], { tag: "monthly", count: 1 });
  assert.equal(
    sharedNavigation.some(
      (item) => item.label === "Documents" && item.href === "/dashboard/uploads"
    ),
    true
  );
  assert.match(documentsPage, /BeastOS Shared Service/);
  assert.match(documentsPage, /BeastOS Owned/);
  assert.match(documentsPage, /documentDatabaseTableName/);
  assert.match(documentsPage, /documentModuleLinkDatabaseTableName/);
  assert.match(documentsPage, /Ecosystem Associations/);
  assert.match(
    documentsPage,
    /AI\s+extraction is intentionally not part/
  );
  assert.doesNotMatch(documentsPage, /mockDocuments/);
  assert.doesNotMatch(documentsPage, /statement\.pdf/);
  assert.doesNotMatch(documentsPage, /notes\.txt/);
  assert.match(migration, /create table if not exists public\.beast_documents/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /auth\.uid\(\) = owner_id/);
  assert.match(
    moduleLinkMigration,
    /create table if not exists public\.beast_document_module_links/
  );
  assert.match(
    moduleLinkMigration,
    /foreign key \(document_id, owner_id\)\s+references public\.beast_documents \(id, owner_id\) on delete cascade/
  );
  assert.match(moduleLinkMigration, /status in \('Active', 'Archived'\)/);
  assert.match(moduleLinkMigration, /enable row level security/);
  assert.match(moduleLinkMigration, /auth\.uid\(\) = owner_id/);
  assert.throws(
    () =>
      buildDocument({
        ...mockDocuments[0],
        storage: {
          ...mockDocuments[0].storage,
          sizeBytes: -1,
        },
      }),
    /Document size cannot be negative/
  );
});

function createDocumentClient(
  rows: BeastDocument[] | null,
  options: {
    userId?: string;
    authError?: boolean;
    queryError?: boolean;
    moduleLinkRows?: BeastDocumentModuleLink[] | null;
    moduleLinkQueryError?: boolean;
    folderRows?: BeastDocumentFolder[] | null;
    folderQueryError?: boolean;
    collectionRows?: BeastDocumentCollection[] | null;
    collectionQueryError?: boolean;
    collectionItemRows?: BeastDocumentCollectionItem[] | null;
    collectionItemQueryError?: boolean;
    accessGrantRows?: BeastDocumentAccessGrant[] | null;
    accessGrantQueryError?: boolean;
    goalReferenceRows?: BeastGoalReference[] | null;
    goalReferenceQueryError?: boolean;
    calendarLinkRows?: BeastDocumentCalendarLink[] | null;
    calendarLinkQueryError?: boolean;
  } = {}
): BeastDocumentDataClient {
  return {
    auth: {
      async getUser() {
        return {
          data: { user: options.userId ? { id: options.userId } : null },
          error: options.authError ? { message: "Auth unavailable" } : null,
        };
      },
    },
    from(table) {
      assert.ok(
        table === documentDatabaseTableName ||
          table === documentModuleLinkDatabaseTableName ||
          table === documentFolderDatabaseTableName ||
          table === documentCollectionDatabaseTableName ||
          table === documentCollectionItemDatabaseTableName ||
          table === documentAccessGrantDatabaseTableName ||
          table === documentGoalReferenceDatabaseTableName ||
          table === documentCalendarLinkDatabaseTableName
      );

      return {
        select() {
          return {
            eq(column, value) {
              assert.equal(column, "owner_id");
              assert.equal(value, options.userId);

              return {
                async order(columnName, orderOptions) {
                  assert.equal(columnName, "created_at");
                  assert.deepEqual(orderOptions, { ascending: false });

                  return {
                    data: (() => {
                      if (table === documentDatabaseTableName) return rows;
                      if (table === documentModuleLinkDatabaseTableName) {
                        return options.moduleLinkRows ?? [];
                      }
                      if (table === documentFolderDatabaseTableName) {
                        return options.folderRows ?? [];
                      }
                      if (table === documentCollectionDatabaseTableName) {
                        return options.collectionRows ?? [];
                      }
                      if (table === documentCollectionItemDatabaseTableName) {
                        return options.collectionItemRows ?? [];
                      }
                      if (table === documentGoalReferenceDatabaseTableName) {
                        return options.goalReferenceRows ?? [];
                      }
                      if (table === documentCalendarLinkDatabaseTableName) {
                        return options.calendarLinkRows ?? [];
                      }
                      return options.accessGrantRows ?? [];
                    })(),
                    error: (() => {
                      if (table === documentDatabaseTableName) {
                        return options.queryError
                          ? { message: "Table unavailable" }
                          : null;
                      }
                      if (table === documentModuleLinkDatabaseTableName) {
                        return options.moduleLinkQueryError
                          ? { message: "Links unavailable" }
                          : null;
                      }
                      if (table === documentFolderDatabaseTableName) {
                        return options.folderQueryError
                          ? { message: "Folders unavailable" }
                          : null;
                      }
                      if (table === documentCollectionDatabaseTableName) {
                        return options.collectionQueryError
                          ? { message: "Collections unavailable" }
                          : null;
                      }
                      if (table === documentCollectionItemDatabaseTableName) {
                        return options.collectionItemQueryError
                          ? { message: "Collection items unavailable" }
                          : null;
                      }
                      if (table === documentGoalReferenceDatabaseTableName) {
                        return options.goalReferenceQueryError
                          ? { message: "Goal references unavailable" }
                          : null;
                      }
                      if (table === documentCalendarLinkDatabaseTableName) {
                        return options.calendarLinkQueryError
                          ? { message: "Calendar links unavailable" }
                          : null;
                      }
                      return options.accessGrantQueryError
                        ? { message: "Access grants unavailable" }
                        : null;
                    })(),
                  };
                },
              };
            },
          };
        },
      };
    },
  };
}

test("BD-001 Documents loader uses only signed-in user metadata", async () => {
  const result = await loadUserDocuments(
    createDocumentClient(
      [
        {
          id: "real-document",
          owner_id: "member-real",
          title: "Real tax record",
          description: "Real user-owned metadata",
          category: "Tax",
          status: "Uploaded",
          storage_bucket: "beast-documents",
          storage_path: "member-real/tax/record.pdf",
          file_name: "record.pdf",
          mime_type: "application/pdf",
          size_bytes: 1000,
          checksum: null,
          tags: ["tax", "2026", "tax"],
          folder_id: "folder-tax",
          metadata: { year: 2026 },
          source_module: null,
          created_at: "2026-07-14T00:00:00.000Z",
          updated_at: "2026-07-14T00:00:00.000Z",
        },
      ],
      {
        userId: "member-real",
        moduleLinkRows: [
          {
            id: "real-document-money-link",
            owner_id: "member-real",
            document_id: "real-document",
            source_module: "money",
            module_record_id: "bill-1",
            title: "Linked to a bill",
            summary: "BeastMoney can reuse this document without owning it.",
            status: "Active",
            created_at: "2026-07-15T01:00:00.000Z",
            updated_at: "2026-07-15T01:00:00.000Z",
          },
          {
            id: "real-document-learning-link",
            owner_id: "member-real",
            document_id: "real-document",
            source_module: "learning",
            module_record_id: "goal-1",
            title: "Linked to a learning goal",
            summary:
              "BeastLearning can reference the same BeastOS document record.",
            status: "Active",
            created_at: "2026-07-15T00:30:00.000Z",
            updated_at: "2026-07-15T00:30:00.000Z",
          },
        ],
        folderRows: [
          {
            id: "folder-tax",
            owner_id: "member-real",
            parent_folder_id: null,
            name: "Taxes",
            description: "Tax documents",
            sort_order: 0,
            created_at: "2026-07-14T00:00:00.000Z",
            updated_at: "2026-07-14T00:00:00.000Z",
          },
        ],
        collectionRows: [
          {
            id: "collection-annual",
            owner_id: "member-real",
            name: "Annual records",
            description: "Records for this year",
            status: "Active",
            sort_order: 0,
            created_at: "2026-07-14T00:00:00.000Z",
            updated_at: "2026-07-14T00:00:00.000Z",
          },
        ],
        collectionItemRows: [
          {
            id: "collection-item-1",
            owner_id: "member-real",
            collection_id: "collection-annual",
            document_id: "real-document",
            status: "Active",
            sort_order: 0,
            created_at: "2026-07-14T00:00:00.000Z",
            updated_at: "2026-07-14T00:00:00.000Z",
          },
        ],
        accessGrantRows: [
          {
            id: "grant-household-view",
            owner_id: "member-real",
            document_id: "real-document",
            scope: "Household",
            permission: "View",
            status: "Active",
            grantee_user_id: null,
            household_id: "household-1",
            family_member_id: null,
            note: "Share tax record with household.",
            created_at: "2026-07-15T02:00:00.000Z",
            updated_at: "2026-07-15T02:00:00.000Z",
            revoked_at: null,
          },
          {
            id: "grant-revoked-member",
            owner_id: "member-real",
            document_id: "real-document",
            scope: "Member",
            permission: "View",
            status: "Revoked",
            grantee_user_id: "member-other",
            household_id: null,
            family_member_id: null,
            note: "Old direct share.",
            created_at: "2026-07-15T01:30:00.000Z",
            updated_at: "2026-07-15T01:40:00.000Z",
            revoked_at: "2026-07-15T01:40:00.000Z",
          },
        ],
        goalReferenceRows: [
          {
            id: "goal-reference-document",
            owner_id: "member-real",
            goal_id: "goal-tax-ready",
            reference_type: "Document",
            title: "Tax readiness goal evidence",
            status: "Active",
            summary: "This document supports the tax readiness goal.",
            url: "/dashboard/goals",
            reference_id: "real-document",
            reference_date: "2026-07-15",
            source_module: "goals",
            created_at: "2026-07-15T03:00:00.000Z",
            updated_at: "2026-07-15T03:00:00.000Z",
          },
        ],
        calendarLinkRows: [
          {
            id: "calendar-link-document",
            owner_id: "member-real",
            document_id: "real-document",
            calendar_item_id: "calendar-tax-review",
            title: "Tax document review",
            summary: "Review this file before the appointment.",
            status: "Active",
            reference_date: "2026-07-20",
            start_time: "2026-07-20T14:00:00.000Z",
            end_time: "2026-07-20T14:30:00.000Z",
            source_module: "calendar",
            created_at: "2026-07-15T04:00:00.000Z",
            updated_at: "2026-07-15T04:00:00.000Z",
          },
        ],
      }
    )
  );

  assert.equal(result.status, "ready");
  assert.equal(result.documents.length, 1);
  assert.equal(result.documents[0].title, "Real tax record");
  assert.equal(result.documents[0].storage.fileName, "record.pdf");
  assert.deepEqual(result.documents[0].tags, ["2026", "tax"]);
  assert.equal(result.documents[0].folder?.name, "Taxes");
  assert.equal(result.documents[0].collections[0].name, "Annual records");
  assert.equal(result.documents[0].accessGrants.length, 2);
  assert.equal(getActiveDocumentAccessGrants(result.documents[0]).length, 1);
  assert.equal(getDocumentVisibilityLabel(result.documents[0]), "Household View");
  assert.equal(result.folders[0].documentCount, 1);
  assert.equal(result.collections[0].documentCount, 1);
  assert.equal(result.documents[0].moduleLinks.length, 2);
  assert.equal(result.documents[0].goalReferences.length, 1);
  assert.equal(result.documents[0].calendarLinks.length, 1);
  assert.equal(getActiveDocumentCalendarLinks(result.documents[0]).length, 1);
  assert.equal(getDocumentAssociations(result.documents[0]).length, 4);
  assert.equal(result.documents[0].moduleLinks[0].title, "Linked to a bill");
  assert.equal(
    result.documents[0].moduleLinks[1].title,
    "Linked to a learning goal"
  );
  assert.equal(summarizeDocuments(result.documents).moduleLinks, 2);
  assert.equal(summarizeDocuments(result.documents).goalAssociations, 1);
  assert.equal(summarizeDocuments(result.documents).calendarAssociations, 1);
  assert.equal(summarizeDocuments(result.documents).ecosystemAssociations, 4);
  assert.equal(summarizeDocuments(result.documents).sharedDocuments, 1);
  assert.equal(summarizeDocuments(result.documents).activeAccessGrants, 1);
  assert.equal(summarizeDocuments(result.documents).householdSharedDocuments, 1);
  assert.equal(summarizeDocuments(result.documents).directSharedDocuments, 0);
  assert.deepEqual(summarizeDocuments(result.documents).linkedModules, [
    "learning",
    "money",
  ]);
  assert.notEqual(result.documents[0].storage.fileName, "statement.pdf");
});

test("BD-001 Documents loader fails safely without sample metadata", async () => {
  const unavailable = await loadUserDocuments(
    createDocumentClient(null, { userId: "member-real", queryError: true })
  );
  const signedOut = await loadUserDocuments(createDocumentClient(null));

  assert.equal(unavailable.status, "unavailable");
  assert.equal(unavailable.documents.length, 0);
  assert.equal(unavailable.folders.length, 0);
  assert.equal(unavailable.collections.length, 0);
  assert.equal(unavailable.accessGrants.length, 0);
  assert.equal(unavailable.goalReferences.length, 0);
  assert.equal(unavailable.calendarLinks.length, 0);
  assert.equal(signedOut.status, "signed-out");
  assert.equal(signedOut.documents.length, 0);
  assert.equal(summarizeDocuments(unavailable.documents).storageBytes, 0);
});

test("BO-16 Documents loader tolerates unavailable module links", async () => {
  const result = await loadUserDocuments(
    createDocumentClient(
      [
        {
          id: "real-document",
          owner_id: "member-real",
          title: "Document without link table",
          category: "Other",
          status: "Ready",
          storage_bucket: "beast-documents",
          storage_path: "member-real/other/record.pdf",
          file_name: "record.pdf",
          mime_type: "application/pdf",
          size_bytes: 1000,
          checksum: null,
          tags: null,
          folder_id: null,
          metadata: null,
          source_module: null,
          created_at: "2026-07-15T00:00:00.000Z",
          updated_at: "2026-07-15T00:00:00.000Z",
        },
      ],
      { userId: "member-real", moduleLinkQueryError: true }
    )
  );

  assert.equal(result.status, "ready");
  assert.equal(result.documents.length, 1);
  assert.equal(result.documents[0].moduleLinks.length, 0);
  assert.equal(summarizeDocuments(result.documents).moduleLinks, 0);
  assert.equal(summarizeDocuments(result.documents).sharedDocuments, 0);
});

test("BO-20 Documents loader tolerates unavailable ecosystem associations", async () => {
  const result = await loadUserDocuments(
    createDocumentClient(
      [
        {
          id: "real-document",
          owner_id: "member-real",
          title: "Document without association tables",
          category: "Other",
          status: "Ready",
          storage_bucket: "beast-documents",
          storage_path: "member-real/other/record.pdf",
          file_name: "record.pdf",
          mime_type: "application/pdf",
          size_bytes: 1000,
          checksum: null,
          tags: null,
          folder_id: null,
          metadata: null,
          source_module: null,
          created_at: "2026-07-15T00:00:00.000Z",
          updated_at: "2026-07-15T00:00:00.000Z",
        },
      ],
      {
        userId: "member-real",
        goalReferenceQueryError: true,
        calendarLinkQueryError: true,
      }
    )
  );

  assert.equal(result.status, "ready");
  assert.equal(result.documents.length, 1);
  assert.equal(result.documents[0].goalReferences.length, 0);
  assert.equal(result.documents[0].calendarLinks.length, 0);
  assert.equal(getDocumentAssociations(result.documents[0]).length, 0);
  assert.equal(summarizeDocuments(result.documents).goalAssociations, 0);
  assert.equal(summarizeDocuments(result.documents).calendarAssociations, 0);
  assert.equal(summarizeDocuments(result.documents).ecosystemAssociations, 0);
});

test("BO-18 Documents organization uses owner-scoped metadata without fake examples", () => {
  const documentsPage = readFileSync("src/app/dashboard/uploads/page.tsx", "utf8");
  const migration = readFileSync(
    "supabase/migrations/20260715000800_add_beast_document_organization.sql",
    "utf8"
  );

  assert.match(documentsPage, /Document folders/);
  assert.match(documentsPage, /Document collections/);
  assert.match(documentsPage, /Top document tags/);
  assert.match(documentsPage, /No folders yet/);
  assert.match(documentsPage, /No collections yet/);
  assert.match(documentsPage, /No tags yet/);
  assert.match(documentsPage, /documentFolderDatabaseTableName/);
  assert.match(documentsPage, /documentCollectionDatabaseTableName/);
  assert.match(
    migration,
    /create table if not exists public\.beast_document_folders/
  );
  assert.match(
    migration,
    /create table if not exists public\.beast_document_collections/
  );
  assert.match(
    migration,
    /create table if not exists public\.beast_document_collection_items/
  );
  assert.match(migration, /add column if not exists tags text\[\]/);
  assert.match(migration, /add column if not exists folder_id uuid/);
  assert.match(migration, /add column if not exists metadata jsonb/);
  assert.match(migration, /beast_documents_tags_gin_idx/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /Users manage own BeastOS document folders/);
  assert.match(migration, /Users manage own BeastOS document collections/);
  assert.match(
    migration,
    /Users manage own BeastOS document collection items/
  );
  assert.doesNotMatch(documentsPage, /Annual records/);
  assert.doesNotMatch(documentsPage, /Taxes/);
});

test("BO-19 Documents access grants enforce explicit sharing boundaries", () => {
  const documentsPage = readFileSync("src/app/dashboard/uploads/page.tsx", "utf8");
  const migration = readFileSync(
    "supabase/migrations/20260715000900_add_beast_document_access_grants.sql",
    "utf8"
  );

  assert.match(documentsPage, /Ownership and sharing/);
  assert.match(documentsPage, /Private to the owner account/);
  assert.match(documentsPage, /No document sharing grants yet/);
  assert.match(documentsPage, /documentAccessGrantDatabaseTableName/);
  assert.match(
    migration,
    /create table if not exists public\.beast_document_access_grants/
  );
  assert.match(migration, /permission in \('None', 'View', 'Manage'\)/);
  assert.match(migration, /scope in \('Member', 'Household'\)/);
  assert.match(migration, /status in \('Active', 'Revoked'\)/);
  assert.match(migration, /beast_document_access_grants_document_owner_fk/);
  assert.match(migration, /enable row level security/);
  assert.match(
    migration,
    /Users manage own BeastOS document access grants/
  );
  assert.match(
    migration,
    /Shared users read shared BeastOS document metadata/
  );
  assert.match(migration, /grantee_user_id = auth\.uid\(\)/);
  assert.doesNotMatch(documentsPage, /household-1/);
  assert.doesNotMatch(documentsPage, /member-other/);
});

test("BO-20 Documents link to module goal and calendar records", () => {
  const documentsPage = readFileSync("src/app/dashboard/uploads/page.tsx", "utf8");
  const migration = readFileSync(
    "supabase/migrations/20260715001000_add_beast_document_calendar_links.sql",
    "utf8"
  );

  assert.match(documentsPage, /Module, goal, and calendar links/);
  assert.match(documentsPage, /Ecosystem Associations/);
  assert.match(documentsPage, /No ecosystem associations yet/);
  assert.match(documentsPage, /documentCalendarLinkDatabaseTableName/);
  assert.match(documentsPage, /Goal associations reuse BeastOS goal references/);
  assert.match(migration, /create table if not exists public\.beast_document_calendar_links/);
  assert.match(migration, /beast_document_calendar_links_document_owner_fk/);
  assert.match(
    migration,
    /references public\.beast_documents \(id, owner_id\)\s+on delete cascade/
  );
  assert.match(migration, /status in \('Active', 'Archived'\)/);
  assert.match(migration, /alter table public\.beast_document_calendar_links enable row level security/);
  assert.match(migration, /Users manage own BeastOS document calendar links/);
  assert.match(migration, /using \(auth\.uid\(\) = owner_id\)/);
  assert.match(migration, /with check \(auth\.uid\(\) = owner_id\)/);
});

test("BO-17 Upload Center supports drag-and-drop document intake", () => {
  const documentsPage = readFileSync("src/app/dashboard/uploads/page.tsx", "utf8");
  const dropzone = readFileSync(
    "src/app/dashboard/uploads/DocumentUploadDropzone.tsx",
    "utf8"
  );
  const storageMigration = readFileSync(
    "supabase/migrations/20260715000700_add_beast_document_storage_bucket.sql",
    "utf8"
  );

  assert.match(documentsPage, /DocumentUploadDropzone/);
  assert.match(dropzone, /onDrop=\{handleDrop\}/);
  assert.match(dropzone, /onDragOver=\{handleDragOver\}/);
  assert.match(dropzone, /Choose File/);
  assert.match(dropzone, /Upload Document/);
  assert.match(dropzone, /beast_documents/);
  assert.match(dropzone, /documentStorageBucketName/);
  assert.match(dropzone, /role="status"/);
  assert.match(dropzone, /window\.location\.reload\(\)/);
  assert.match(storageMigration, /insert into storage\.buckets/);
  assert.match(storageMigration, /'beast-documents'/);
  assert.match(storageMigration, /file_size_limit/);
  assert.match(storageMigration, /25000000/);
  assert.match(storageMigration, /allowed_mime_types/);
  assert.match(storageMigration, /storage\.foldername\(name\)\)\[1\]/);
  assert.match(
    storageMigration,
    /Users upload own BeastOS document files/
  );
});

test("BO-17 Upload Center validates supported file types and owner storage paths", () => {
  assert.equal(documentUploadMaxFileSizeBytes, 25_000_000);
  assert.equal(supportedDocumentUploadMimeTypes.includes("application/pdf"), true);
  assert.equal(supportedDocumentUploadExtensions.includes(".pdf"), true);
  assert.match(getDocumentUploadAcceptValue(), /application\/pdf/);
  assert.match(getDocumentUploadAcceptValue(), /\.docx/);
  assert.equal(formatDocumentFileSize(248000), "248.0 KB");
  assert.equal(formatDocumentFileSize(2_500_000), "2.50 MB");
  assert.equal(sanitizeDocumentFileName("My File!!.pdf"), "My-File.pdf");
  assert.equal(
    buildDocumentStoragePath({
      ownerId: "member-real",
      category: "Tax",
      fileName: "2026 Tax Form.pdf",
      documentId: "document-1",
    }),
    "member-real/tax/document-1-2026-Tax-Form.pdf"
  );
  assert.equal(
    getDocumentUploadValidationError({
      name: "statement.pdf",
      type: "application/pdf",
      size: 1000,
    }),
    null
  );
  assert.match(
    getDocumentUploadValidationError({
      name: "script.exe",
      type: "application/x-msdownload",
      size: 1000,
    }) || "",
    /supported/
  );
  assert.match(
    getDocumentUploadValidationError({
      name: "large.pdf",
      type: "application/pdf",
      size: documentUploadMaxFileSizeBytes + 1,
    }) || "",
    /25 MB/
  );
});
