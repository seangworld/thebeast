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
  mockDocuments,
  summarizeDocuments,
  supportedDocumentFileTypes,
} from "../src/lib/platform/documents";
import { sharedNavigation } from "../src/lib/moduleNavigation";

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
