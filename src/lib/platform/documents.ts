import type { PlatformModule } from "./types";

export type DocumentCategory =
  | "Money"
  | "Learning"
  | "Identity"
  | "Household"
  | "Tax"
  | "Legal"
  | "Health"
  | "Home"
  | "Vehicle"
  | "Other";

export type DocumentStatus = "Uploaded" | "Ready" | "Archived" | "Deleted";

export type DocumentStorageMetadata = {
  bucket: string;
  path: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  checksum?: string;
};

export type BeastDocument = {
  id: string;
  ownerId: string;
  title: string;
  category: DocumentCategory;
  status: DocumentStatus;
  storage: DocumentStorageMetadata;
  sourceModule?: PlatformModule;
  createdAt: string;
  updatedAt: string;
};

export type DocumentDatabaseColumn = {
  name: string;
  type: string;
  required: boolean;
};

export type DocumentOverviewSummary = {
  totalDocuments: number;
  activeDocuments: number;
  archivedDocuments: number;
  storageBytes: number;
  categoryCounts: Record<DocumentCategory, number>;
};

export const documentDatabaseTableName = "beast_documents";

export const documentStorageBucketName = "beast-documents";

export const documentCategories: DocumentCategory[] = [
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
];

export const documentStatuses: DocumentStatus[] = [
  "Uploaded",
  "Ready",
  "Archived",
  "Deleted",
];

export const supportedDocumentFileTypes = [
  "PDF",
  "Images",
  "CSV",
  "Spreadsheets",
  "Documents",
  "Text",
];

export const documentDatabaseColumns: DocumentDatabaseColumn[] = [
  { name: "id", type: "uuid", required: true },
  { name: "owner_id", type: "uuid", required: true },
  { name: "title", type: "text", required: true },
  { name: "category", type: "text", required: true },
  { name: "status", type: "text", required: true },
  { name: "storage_bucket", type: "text", required: true },
  { name: "storage_path", type: "text", required: true },
  { name: "file_name", type: "text", required: true },
  { name: "mime_type", type: "text", required: true },
  { name: "size_bytes", type: "bigint", required: true },
  { name: "checksum", type: "text", required: false },
  { name: "source_module", type: "text", required: false },
  { name: "created_at", type: "timestamptz", required: true },
  { name: "updated_at", type: "timestamptz", required: true },
];

export const documentOwnershipRules = [
  "Documents belong to BeastOS as shared Personal Hub data.",
  "Document metadata is user-owned and scoped to the signed-in BeastOS account.",
  "Modules may reference documents only through permissioned BeastOS document records.",
  "BeastDocuments remains superseded as a standalone customer-facing module.",
];

export const mockDocuments: BeastDocument[] = [
  {
    id: "document-money-statement",
    ownerId: "member-owner",
    title: "Money statement",
    category: "Money",
    status: "Ready",
    storage: {
      bucket: documentStorageBucketName,
      path: "member-owner/money/statement.pdf",
      fileName: "statement.pdf",
      mimeType: "application/pdf",
      sizeBytes: 248000,
    },
    sourceModule: "money",
    createdAt: "2026-07-14T00:00:00.000Z",
    updatedAt: "2026-07-14T00:00:00.000Z",
  },
  {
    id: "document-learning-notes",
    ownerId: "member-owner",
    title: "Learning notes",
    category: "Learning",
    status: "Uploaded",
    storage: {
      bucket: documentStorageBucketName,
      path: "member-owner/learning/notes.txt",
      fileName: "notes.txt",
      mimeType: "text/plain",
      sizeBytes: 8200,
    },
    sourceModule: "learning",
    createdAt: "2026-07-14T00:00:00.000Z",
    updatedAt: "2026-07-14T00:00:00.000Z",
  },
];

export function isDocumentCategory(
  category: unknown
): category is DocumentCategory {
  return documentCategories.includes(category as DocumentCategory);
}

export function isDocumentStatus(status: unknown): status is DocumentStatus {
  return documentStatuses.includes(status as DocumentStatus);
}

export function buildDocument(document: BeastDocument): BeastDocument {
  if (!document.title.trim()) {
    throw new Error("Document title is required.");
  }

  if (!isDocumentCategory(document.category)) {
    throw new Error(`Unsupported document category: ${document.category}`);
  }

  if (!isDocumentStatus(document.status)) {
    throw new Error(`Unsupported document status: ${document.status}`);
  }

  if (!document.storage.bucket.trim() || !document.storage.path.trim()) {
    throw new Error("Document storage location is required.");
  }

  if (!document.storage.fileName.trim() || !document.storage.mimeType.trim()) {
    throw new Error("Document file metadata is required.");
  }

  if (document.storage.sizeBytes < 0) {
    throw new Error("Document size cannot be negative.");
  }

  return document;
}

export function buildDocumentCollection(documents: BeastDocument[]) {
  return documents.map(buildDocument);
}

export function summarizeDocuments(
  documents: BeastDocument[]
): DocumentOverviewSummary {
  const normalized = buildDocumentCollection(documents);
  const categoryCounts = documentCategories.reduce(
    (counts, category) => ({
      ...counts,
      [category]: normalized.filter((document) => document.category === category)
        .length,
    }),
    {} as Record<DocumentCategory, number>
  );

  return {
    totalDocuments: normalized.length,
    activeDocuments: normalized.filter(
      (document) =>
        document.status === "Uploaded" || document.status === "Ready"
    ).length,
    archivedDocuments: normalized.filter(
      (document) => document.status === "Archived"
    ).length,
    storageBytes: normalized.reduce(
      (total, document) => total + document.storage.sizeBytes,
      0
    ),
    categoryCounts,
  };
}
