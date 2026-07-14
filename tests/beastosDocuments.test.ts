import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildDocument,
  documentCategories,
  documentDatabaseColumns,
  documentDatabaseTableName,
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
import type { BeastDocument } from "../src/lib/types/database";

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
  assert.equal(
    documentOwnershipRules[0],
    "Documents belong to BeastOS as shared Personal Hub data."
  );
  assert.match(documentOwnershipRules[3], /BeastDocuments remains superseded/);
});

test("BD-001 Documents overview route stays BeastOS-owned", () => {
  const documentsPage = readFileSync("src/app/dashboard/uploads/page.tsx", "utf8");
  const migration = readFileSync(
    "migrations/20260714_add_beast_documents.sql",
    "utf8"
  );
  const summary = summarizeDocuments(mockDocuments);

  assert.equal(summary.totalDocuments, 2);
  assert.equal(summary.activeDocuments, 2);
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
  options: { userId?: string; authError?: boolean; queryError?: boolean } = {}
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
      assert.equal(table, documentDatabaseTableName);

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
                    data: rows,
                    error: options.queryError
                      ? { message: "Table unavailable" }
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
      { userId: "member-real" }
    )
  );

  assert.equal(result.status, "ready");
  assert.equal(result.documents.length, 1);
  assert.equal(result.documents[0].title, "Real tax record");
  assert.equal(result.documents[0].storage.fileName, "record.pdf");
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
