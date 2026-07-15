import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildDocument,
  documentCategories,
  documentDatabaseColumns,
  documentDatabaseTableName,
  documentModuleLinkDatabaseColumns,
  documentModuleLinkDatabaseTableName,
  documentModuleLinkStatuses,
  documentOwnershipRules,
  documentStatuses,
  documentStorageBucketName,
  loadUserDocuments,
  type BeastDocumentDataClient,
  mockDocuments,
  summarizeDocuments,
  supportedDocumentFileTypes,
} from "../src/lib/platform/documents";
import { sharedNavigation } from "../src/lib/moduleNavigation";
import type {
  BeastDocument,
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
  assert.deepEqual(documentModuleLinkStatuses, ["Active", "Archived"]);
  assert.deepEqual(
    documentDatabaseColumns.map((column) => [column.name, column.required]),
    [
      ["id", true],
      ["owner_id", true],
      ["title", true],
      ["category", true],
      ["status", true],
      ["storage_bucket", true],
      ["storage_path", true],
      ["file_name", true],
      ["mime_type", true],
      ["size_bytes", true],
      ["checksum", false],
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
  assert.equal(
    documentOwnershipRules[0],
    "Documents belong to BeastOS as shared Personal Hub data."
  );
  assert.match(
    documentOwnershipRules[3],
    /linked to multiple module records/
  );
  assert.match(documentOwnershipRules[4], /BeastDocuments remains superseded/);
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
  assert.match(documentsPage, /Reused By Modules/);
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
          table === documentModuleLinkDatabaseTableName
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
                    data:
                      table === documentDatabaseTableName
                        ? rows
                        : options.moduleLinkRows ?? [],
                    error:
                      table === documentDatabaseTableName
                        ? options.queryError
                          ? { message: "Table unavailable" }
                          : null
                        : options.moduleLinkQueryError
                          ? { message: "Links unavailable" }
                          : null,
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
          category: "Tax",
          status: "Uploaded",
          storage_bucket: "beast-documents",
          storage_path: "member-real/tax/record.pdf",
          file_name: "record.pdf",
          mime_type: "application/pdf",
          size_bytes: 1000,
          checksum: null,
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
      }
    )
  );

  assert.equal(result.status, "ready");
  assert.equal(result.documents.length, 1);
  assert.equal(result.documents[0].title, "Real tax record");
  assert.equal(result.documents[0].storage.fileName, "record.pdf");
  assert.equal(result.documents[0].moduleLinks.length, 2);
  assert.equal(result.documents[0].moduleLinks[0].title, "Linked to a bill");
  assert.equal(
    result.documents[0].moduleLinks[1].title,
    "Linked to a learning goal"
  );
  assert.equal(summarizeDocuments(result.documents).moduleLinks, 2);
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
});
