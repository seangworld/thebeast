import type { PlatformModule } from "./types";
import type {
  BeastDocument as BeastDocumentRow,
  BeastDocumentAccessGrant as BeastDocumentAccessGrantRow,
  BeastDocumentCollection as BeastDocumentCollectionRow,
  BeastDocumentCollectionItem as BeastDocumentCollectionItemRow,
  BeastDocumentFolder as BeastDocumentFolderRow,
  BeastDocumentModuleLink as BeastDocumentModuleLinkRow,
} from "@/lib/types/database";

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
export type DocumentModuleLinkStatus = "Active" | "Archived";
export type DocumentCollectionStatus = "Active" | "Archived";
export type DocumentCollectionItemStatus = "Active" | "Archived";
export type DocumentAccessPermission = "None" | "View" | "Manage";
export type DocumentAccessScope = "Member" | "Household";
export type DocumentAccessStatus = "Active" | "Revoked";

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
  description?: string;
  category: DocumentCategory;
  status: DocumentStatus;
  tags: string[];
  folderId?: string;
  metadata: Record<string, unknown>;
  storage: DocumentStorageMetadata;
  sourceModule?: PlatformModule;
  folder?: DocumentFolder;
  collections: DocumentCollection[];
  accessGrants: DocumentAccessGrant[];
  moduleLinks: DocumentModuleLink[];
  createdAt: string;
  updatedAt: string;
};

export type DocumentFolder = {
  id: string;
  ownerId: string;
  parentFolderId?: string;
  name: string;
  description?: string;
  sortOrder: number;
  documentCount: number;
  createdAt: string;
  updatedAt: string;
};

export type DocumentCollection = {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  status: DocumentCollectionStatus;
  sortOrder: number;
  documentCount: number;
  createdAt: string;
  updatedAt: string;
};

export type DocumentCollectionItem = {
  id: string;
  ownerId: string;
  collectionId: string;
  documentId: string;
  status: DocumentCollectionItemStatus;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type DocumentAccessGrant = {
  id: string;
  ownerId: string;
  documentId: string;
  scope: DocumentAccessScope;
  permission: DocumentAccessPermission;
  status: DocumentAccessStatus;
  granteeUserId?: string;
  householdId?: string;
  familyMemberId?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
  revokedAt?: string;
};

export type DocumentModuleLink = {
  id: string;
  ownerId: string;
  documentId: string;
  sourceModule: PlatformModule;
  moduleRecordId?: string;
  title: string;
  summary?: string;
  status: DocumentModuleLinkStatus;
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
  moduleLinks: number;
  linkedModules: PlatformModule[];
  categoryCounts: Record<DocumentCategory, number>;
  folderCount: number;
  collectionCount: number;
  taggedDocuments: number;
  topTags: { tag: string; count: number }[];
  sharedDocuments: number;
  activeAccessGrants: number;
  householdSharedDocuments: number;
  directSharedDocuments: number;
  manageableSharedDocuments: number;
};

export type DocumentLoadStatus = "ready" | "signed-out" | "unavailable";

export type DocumentLoadResult = {
  documents: BeastDocument[];
  folders: DocumentFolder[];
  collections: DocumentCollection[];
  accessGrants: DocumentAccessGrant[];
  status: DocumentLoadStatus;
  message?: string;
};

export type BeastDocumentDataClient = {
  auth: {
    getUser: () => Promise<{
      data: { user: { id: string } | null };
      error: { message?: string } | null;
    }>;
  };
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        order: (
          column: string,
          options: { ascending: boolean }
        ) => Promise<{
          data:
            | BeastDocumentRow[]
            | BeastDocumentAccessGrantRow[]
            | BeastDocumentModuleLinkRow[]
            | BeastDocumentFolderRow[]
            | BeastDocumentCollectionRow[]
            | BeastDocumentCollectionItemRow[]
            | null;
          error: { message?: string } | null;
        }>;
      };
    };
  };
};

export const documentDatabaseTableName = "beast_documents";
export const documentModuleLinkDatabaseTableName =
  "beast_document_module_links";
export const documentFolderDatabaseTableName = "beast_document_folders";
export const documentCollectionDatabaseTableName =
  "beast_document_collections";
export const documentCollectionItemDatabaseTableName =
  "beast_document_collection_items";
export const documentAccessGrantDatabaseTableName =
  "beast_document_access_grants";

export const documentStorageBucketName = "beast-documents";
export const documentUploadMaxFileSizeBytes = 25 * 1000 * 1000;

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

export const documentModuleLinkStatuses: DocumentModuleLinkStatus[] = [
  "Active",
  "Archived",
];

export const documentCollectionStatuses: DocumentCollectionStatus[] = [
  "Active",
  "Archived",
];

export const documentCollectionItemStatuses: DocumentCollectionItemStatus[] = [
  "Active",
  "Archived",
];

export const documentAccessPermissions: DocumentAccessPermission[] = [
  "None",
  "View",
  "Manage",
];

export const documentAccessScopes: DocumentAccessScope[] = [
  "Member",
  "Household",
];

export const documentAccessStatuses: DocumentAccessStatus[] = [
  "Active",
  "Revoked",
];

export const supportedDocumentFileTypes = [
  "PDF",
  "Images",
  "CSV",
  "Spreadsheets",
  "Documents",
  "Text",
];

export const supportedDocumentUploadMimeTypes = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

export const supportedDocumentUploadExtensions = [
  ".pdf",
  ".docx",
  ".xlsx",
  ".pptx",
  ".txt",
  ".csv",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".heic",
];

export const documentDatabaseColumns: DocumentDatabaseColumn[] = [
  { name: "id", type: "uuid", required: true },
  { name: "owner_id", type: "uuid", required: true },
  { name: "title", type: "text", required: true },
  { name: "description", type: "text", required: false },
  { name: "category", type: "text", required: true },
  { name: "status", type: "text", required: true },
  { name: "storage_bucket", type: "text", required: true },
  { name: "storage_path", type: "text", required: true },
  { name: "file_name", type: "text", required: true },
  { name: "mime_type", type: "text", required: true },
  { name: "size_bytes", type: "bigint", required: true },
  { name: "checksum", type: "text", required: false },
  { name: "tags", type: "text[]", required: true },
  { name: "folder_id", type: "uuid", required: false },
  { name: "metadata", type: "jsonb", required: true },
  { name: "source_module", type: "text", required: false },
  { name: "created_at", type: "timestamptz", required: true },
  { name: "updated_at", type: "timestamptz", required: true },
];

export const documentFolderDatabaseColumns: DocumentDatabaseColumn[] = [
  { name: "id", type: "uuid", required: true },
  { name: "owner_id", type: "uuid", required: true },
  { name: "parent_folder_id", type: "uuid", required: false },
  { name: "name", type: "text", required: true },
  { name: "description", type: "text", required: false },
  { name: "sort_order", type: "integer", required: true },
  { name: "created_at", type: "timestamptz", required: true },
  { name: "updated_at", type: "timestamptz", required: true },
];

export const documentCollectionDatabaseColumns: DocumentDatabaseColumn[] = [
  { name: "id", type: "uuid", required: true },
  { name: "owner_id", type: "uuid", required: true },
  { name: "name", type: "text", required: true },
  { name: "description", type: "text", required: false },
  { name: "status", type: "text", required: true },
  { name: "sort_order", type: "integer", required: true },
  { name: "created_at", type: "timestamptz", required: true },
  { name: "updated_at", type: "timestamptz", required: true },
];

export const documentCollectionItemDatabaseColumns: DocumentDatabaseColumn[] = [
  { name: "id", type: "uuid", required: true },
  { name: "owner_id", type: "uuid", required: true },
  { name: "collection_id", type: "uuid", required: true },
  { name: "document_id", type: "uuid", required: true },
  { name: "status", type: "text", required: true },
  { name: "sort_order", type: "integer", required: true },
  { name: "created_at", type: "timestamptz", required: true },
  { name: "updated_at", type: "timestamptz", required: true },
];

export const documentAccessGrantDatabaseColumns: DocumentDatabaseColumn[] = [
  { name: "id", type: "uuid", required: true },
  { name: "owner_id", type: "uuid", required: true },
  { name: "document_id", type: "uuid", required: true },
  { name: "scope", type: "text", required: true },
  { name: "permission", type: "text", required: true },
  { name: "status", type: "text", required: true },
  { name: "grantee_user_id", type: "uuid", required: false },
  { name: "household_id", type: "text", required: false },
  { name: "family_member_id", type: "text", required: false },
  { name: "note", type: "text", required: false },
  { name: "created_at", type: "timestamptz", required: true },
  { name: "updated_at", type: "timestamptz", required: true },
  { name: "revoked_at", type: "timestamptz", required: false },
];

export const documentModuleLinkDatabaseColumns: DocumentDatabaseColumn[] = [
  { name: "id", type: "uuid", required: true },
  { name: "owner_id", type: "uuid", required: true },
  { name: "document_id", type: "uuid", required: true },
  { name: "source_module", type: "text", required: true },
  { name: "module_record_id", type: "text", required: false },
  { name: "title", type: "text", required: true },
  { name: "summary", type: "text", required: false },
  { name: "status", type: "text", required: true },
  { name: "created_at", type: "timestamptz", required: true },
  { name: "updated_at", type: "timestamptz", required: true },
];

export const documentOwnershipRules = [
  "Documents belong to BeastOS as shared Personal Hub data.",
  "Document metadata is user-owned and scoped to the signed-in BeastOS account.",
  "Modules may reference documents only through permissioned BeastOS document records.",
  "One BeastOS document record may be linked to multiple module records without duplicating the document.",
  "Folders, collections, tags, and metadata organize BeastOS records without changing module ownership.",
  "Household and member sharing must use explicit BeastOS document access grants.",
  "BeastDocuments remains superseded as a standalone customer-facing module.",
];

export const mockDocuments: BeastDocument[] = [
  {
    id: "document-money-statement",
    ownerId: "member-owner",
    title: "Money statement",
    description: "Example statement metadata.",
    category: "Money",
    status: "Ready",
    tags: ["statement", "monthly"],
    metadata: {},
    storage: {
      bucket: documentStorageBucketName,
      path: "member-owner/money/statement.pdf",
      fileName: "statement.pdf",
      mimeType: "application/pdf",
      sizeBytes: 248000,
    },
    sourceModule: "money",
    collections: [],
    accessGrants: [],
    moduleLinks: [],
    createdAt: "2026-07-14T00:00:00.000Z",
    updatedAt: "2026-07-14T00:00:00.000Z",
  },
  {
    id: "document-learning-notes",
    ownerId: "member-owner",
    title: "Learning notes",
    description: "Example learning notes metadata.",
    category: "Learning",
    status: "Uploaded",
    tags: ["notes"],
    metadata: {},
    storage: {
      bucket: documentStorageBucketName,
      path: "member-owner/learning/notes.txt",
      fileName: "notes.txt",
      mimeType: "text/plain",
      sizeBytes: 8200,
    },
    sourceModule: "learning",
    collections: [],
    accessGrants: [],
    moduleLinks: [],
    createdAt: "2026-07-14T00:00:00.000Z",
    updatedAt: "2026-07-14T00:00:00.000Z",
  },
];

export const exampleDocuments = mockDocuments;

function toPlatformModule(module: string | null | undefined) {
  return module ? (module as PlatformModule) : undefined;
}

function toTags(tags: unknown) {
  return Array.isArray(tags)
    ? tags.filter((tag): tag is string => typeof tag === "string" && !!tag.trim())
    : [];
}

function toMetadata(metadata: unknown) {
  return metadata && typeof metadata === "object" && !Array.isArray(metadata)
    ? (metadata as Record<string, unknown>)
    : {};
}

export function mapDocumentRow(row: BeastDocumentRow): BeastDocument {
  return buildDocument({
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    description: row.description ?? undefined,
    category: row.category,
    status: row.status,
    tags: toTags(row.tags),
    folderId: row.folder_id ?? undefined,
    metadata: toMetadata(row.metadata),
    storage: {
      bucket: row.storage_bucket,
      path: row.storage_path,
      fileName: row.file_name,
      mimeType: row.mime_type,
      sizeBytes: row.size_bytes,
      checksum: row.checksum ?? undefined,
    },
    sourceModule: toPlatformModule(row.source_module),
    collections: [],
    accessGrants: [],
    moduleLinks: [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export function isDocumentModuleLinkStatus(
  status: unknown
): status is DocumentModuleLinkStatus {
  return documentModuleLinkStatuses.includes(status as DocumentModuleLinkStatus);
}

export function mapDocumentModuleLinkRow(
  row: BeastDocumentModuleLinkRow
): DocumentModuleLink {
  if (!isDocumentModuleLinkStatus(row.status)) {
    throw new Error(`Unsupported document module link status: ${row.status}`);
  }

  return {
    id: row.id,
    ownerId: row.owner_id,
    documentId: row.document_id,
    sourceModule: toPlatformModule(row.source_module) || "beastos",
    moduleRecordId: row.module_record_id ?? undefined,
    title: row.title,
    summary: row.summary ?? undefined,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function isDocumentCollectionStatus(
  status: unknown
): status is DocumentCollectionStatus {
  return documentCollectionStatuses.includes(status as DocumentCollectionStatus);
}

export function isDocumentCollectionItemStatus(
  status: unknown
): status is DocumentCollectionItemStatus {
  return documentCollectionItemStatuses.includes(
    status as DocumentCollectionItemStatus
  );
}

export function isDocumentAccessPermission(
  permission: unknown
): permission is DocumentAccessPermission {
  return documentAccessPermissions.includes(
    permission as DocumentAccessPermission
  );
}

export function isDocumentAccessScope(
  scope: unknown
): scope is DocumentAccessScope {
  return documentAccessScopes.includes(scope as DocumentAccessScope);
}

export function isDocumentAccessStatus(
  status: unknown
): status is DocumentAccessStatus {
  return documentAccessStatuses.includes(status as DocumentAccessStatus);
}

export function mapDocumentFolderRow(
  row: BeastDocumentFolderRow
): DocumentFolder {
  return {
    id: row.id,
    ownerId: row.owner_id,
    parentFolderId: row.parent_folder_id ?? undefined,
    name: row.name,
    description: row.description ?? undefined,
    sortOrder: row.sort_order,
    documentCount: 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapDocumentCollectionRow(
  row: BeastDocumentCollectionRow
): DocumentCollection {
  if (!isDocumentCollectionStatus(row.status)) {
    throw new Error(`Unsupported document collection status: ${row.status}`);
  }

  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    description: row.description ?? undefined,
    status: row.status,
    sortOrder: row.sort_order,
    documentCount: 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapDocumentCollectionItemRow(
  row: BeastDocumentCollectionItemRow
): DocumentCollectionItem {
  if (!isDocumentCollectionItemStatus(row.status)) {
    throw new Error(
      `Unsupported document collection item status: ${row.status}`
    );
  }

  return {
    id: row.id,
    ownerId: row.owner_id,
    collectionId: row.collection_id,
    documentId: row.document_id,
    status: row.status,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapDocumentAccessGrantRow(
  row: BeastDocumentAccessGrantRow
): DocumentAccessGrant {
  if (!isDocumentAccessScope(row.scope)) {
    throw new Error(`Unsupported document access scope: ${row.scope}`);
  }

  if (!isDocumentAccessPermission(row.permission)) {
    throw new Error(`Unsupported document access permission: ${row.permission}`);
  }

  if (!isDocumentAccessStatus(row.status)) {
    throw new Error(`Unsupported document access status: ${row.status}`);
  }

  return {
    id: row.id,
    ownerId: row.owner_id,
    documentId: row.document_id,
    scope: row.scope,
    permission: row.permission,
    status: row.status,
    granteeUserId: row.grantee_user_id ?? undefined,
    householdId: row.household_id ?? undefined,
    familyMemberId: row.family_member_id ?? undefined,
    note: row.note ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    revokedAt: row.revoked_at ?? undefined,
  };
}

export async function loadUserDocuments(
  client: BeastDocumentDataClient
): Promise<DocumentLoadResult> {
  try {
    const { data: userData, error: userError } = await client.auth.getUser();

    if (userError) {
      return {
        documents: [],
        folders: [],
        collections: [],
        accessGrants: [],
        status: "unavailable",
        message: "Documents could not be loaded right now.",
      };
    }

    if (!userData.user) {
      return {
        documents: [],
        folders: [],
        collections: [],
        accessGrants: [],
        status: "signed-out",
        message: "Sign in to view your documents.",
      };
    }

    const { data, error } = await client
      .from(documentDatabaseTableName)
      .select(
        "id, owner_id, title, description, category, status, storage_bucket, storage_path, file_name, mime_type, size_bytes, checksum, tags, folder_id, metadata, source_module, created_at, updated_at"
      )
      .eq("owner_id", userData.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return {
        documents: [],
        folders: [],
        collections: [],
        accessGrants: [],
        status: "unavailable",
        message:
          "Documents are not available yet. The database may still need its foundation migration.",
      };
    }

    const moduleLinkResult = await client
      .from(documentModuleLinkDatabaseTableName)
      .select(
        "id, owner_id, document_id, source_module, module_record_id, title, summary, status, created_at, updated_at"
      )
      .eq("owner_id", userData.user.id)
      .order("created_at", { ascending: false });
    const moduleLinks = moduleLinkResult.error
      ? []
      : ((moduleLinkResult.data ?? []) as BeastDocumentModuleLinkRow[]).map(
          mapDocumentModuleLinkRow
        );

    const folderResult = await client
      .from(documentFolderDatabaseTableName)
      .select(
        "id, owner_id, parent_folder_id, name, description, sort_order, created_at, updated_at"
      )
      .eq("owner_id", userData.user.id)
      .order("created_at", { ascending: false });
    const folders = folderResult.error
      ? []
      : ((folderResult.data ?? []) as BeastDocumentFolderRow[]).map(
          mapDocumentFolderRow
        );

    const collectionResult = await client
      .from(documentCollectionDatabaseTableName)
      .select(
        "id, owner_id, name, description, status, sort_order, created_at, updated_at"
      )
      .eq("owner_id", userData.user.id)
      .order("created_at", { ascending: false });
    const collections = collectionResult.error
      ? []
      : ((collectionResult.data ?? []) as BeastDocumentCollectionRow[]).map(
          mapDocumentCollectionRow
        );

    const collectionItemResult = await client
      .from(documentCollectionItemDatabaseTableName)
      .select(
        "id, owner_id, collection_id, document_id, status, sort_order, created_at, updated_at"
      )
      .eq("owner_id", userData.user.id)
      .order("created_at", { ascending: false });
    const collectionItems = collectionItemResult.error
      ? []
      : ((collectionItemResult.data ?? []) as BeastDocumentCollectionItemRow[])
          .map(mapDocumentCollectionItemRow)
          .filter((item) => item.status === "Active");
    const accessGrantResult = await client
      .from(documentAccessGrantDatabaseTableName)
      .select(
        "id, owner_id, document_id, scope, permission, status, grantee_user_id, household_id, family_member_id, note, created_at, updated_at, revoked_at"
      )
      .eq("owner_id", userData.user.id)
      .order("created_at", { ascending: false });
    const accessGrants = accessGrantResult.error
      ? []
      : ((accessGrantResult.data ?? []) as BeastDocumentAccessGrantRow[]).map(
          mapDocumentAccessGrantRow
        );
    const linksByDocument = new Map<string, DocumentModuleLink[]>();
    const foldersById = new Map(folders.map((folder) => [folder.id, folder]));
    const collectionsById = new Map(
      collections.map((collection) => [collection.id, collection])
    );
    const collectionItemsByDocument = new Map<string, DocumentCollection[]>();
    const accessGrantsByDocument = new Map<string, DocumentAccessGrant[]>();

    moduleLinks.forEach((link) => {
      linksByDocument.set(link.documentId, [
        ...(linksByDocument.get(link.documentId) || []),
        link,
      ]);
    });

    collectionItems.forEach((item) => {
      const collection = collectionsById.get(item.collectionId);
      if (!collection || collection.status !== "Active") return;

      collectionItemsByDocument.set(item.documentId, [
        ...(collectionItemsByDocument.get(item.documentId) || []),
        collection,
      ]);
    });

    accessGrants.forEach((grant) => {
      accessGrantsByDocument.set(grant.documentId, [
        ...(accessGrantsByDocument.get(grant.documentId) || []),
        grant,
      ]);
    });

    const documents = ((data ?? []) as BeastDocumentRow[]).map((row) => {
      const document = mapDocumentRow(row);

      return {
        ...document,
        folder: document.folderId
          ? foldersById.get(document.folderId)
          : undefined,
        collections: [
          ...(collectionItemsByDocument.get(document.id) || []),
        ].sort((left, right) => left.name.localeCompare(right.name)),
        accessGrants: [
          ...(accessGrantsByDocument.get(document.id) || []),
        ].sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
        moduleLinks: [...(linksByDocument.get(document.id) || [])].sort(
          (left, right) => right.createdAt.localeCompare(left.createdAt)
        ),
      };
    });

    const folderCounts = documents.reduce((counts, document) => {
      if (!document.folderId) return counts;
      counts.set(document.folderId, (counts.get(document.folderId) || 0) + 1);
      return counts;
    }, new Map<string, number>());
    const collectionCounts = collectionItems.reduce((counts, item) => {
      counts.set(item.collectionId, (counts.get(item.collectionId) || 0) + 1);
      return counts;
    }, new Map<string, number>());

    return {
      documents,
      folders: folders
        .map((folder) => ({
          ...folder,
          documentCount: folderCounts.get(folder.id) || 0,
        }))
        .sort((left, right) => left.name.localeCompare(right.name)),
      collections: collections
        .map((collection) => ({
          ...collection,
          documentCount: collectionCounts.get(collection.id) || 0,
        }))
        .sort((left, right) => left.name.localeCompare(right.name)),
      accessGrants,
      status: "ready",
    };
  } catch {
    return {
      documents: [],
      folders: [],
      collections: [],
      accessGrants: [],
      status: "unavailable",
      message: "Documents could not be loaded right now.",
    };
  }
}

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

  document.tags.forEach((tag) => {
    if (!tag.trim()) {
      throw new Error("Document tags cannot be blank.");
    }
  });

  document.moduleLinks.forEach((link) => {
    if (!link.title.trim()) {
      throw new Error("Document module link title is required.");
    }

    if (!isDocumentModuleLinkStatus(link.status)) {
      throw new Error(`Unsupported document module link status: ${link.status}`);
    }
  });

  document.accessGrants.forEach((grant) => {
    if (!isDocumentAccessScope(grant.scope)) {
      throw new Error(`Unsupported document access scope: ${grant.scope}`);
    }

    if (!isDocumentAccessPermission(grant.permission)) {
      throw new Error(
        `Unsupported document access permission: ${grant.permission}`
      );
    }

    if (!isDocumentAccessStatus(grant.status)) {
      throw new Error(`Unsupported document access status: ${grant.status}`);
    }
  });

  return {
    ...document,
    tags: Array.from(new Set(document.tags.map((tag) => tag.trim()))).sort(),
    collections: [...document.collections].sort((left, right) =>
      left.name.localeCompare(right.name)
    ),
    accessGrants: [...document.accessGrants].sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt)
    ),
    moduleLinks: [...document.moduleLinks].sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt)
    ),
  };
}

export function buildDocumentCollection(documents: BeastDocument[]) {
  return documents.map(buildDocument);
}

export function getDocumentUploadAcceptValue() {
  return [
    ...supportedDocumentUploadMimeTypes,
    ...supportedDocumentUploadExtensions,
  ].join(",");
}

export function formatDocumentFileSize(sizeBytes: number) {
  if (sizeBytes >= 1000 * 1000) {
    return `${(sizeBytes / 1000 / 1000).toFixed(2)} MB`;
  }

  return `${(sizeBytes / 1000).toFixed(1)} KB`;
}

export function getDocumentUploadValidationError(file: {
  name: string;
  type: string;
  size: number;
}) {
  const fileName = file.name.toLowerCase();
  const hasAllowedExtension = supportedDocumentUploadExtensions.some(
    (extension) => fileName.endsWith(extension)
  );
  const hasAllowedMimeType = supportedDocumentUploadMimeTypes.includes(
    file.type
  );

  if (!hasAllowedExtension || !hasAllowedMimeType) {
    return "Choose a supported document, image, spreadsheet, presentation, text, or CSV file.";
  }

  if (file.size > documentUploadMaxFileSizeBytes) {
    return "Choose a file that is 25 MB or smaller.";
  }

  return null;
}

export function sanitizeDocumentFileName(fileName: string) {
  const sanitized = fileName
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/-\./g, ".")
    .replace(/^-|-$/g, "");

  return sanitized || "document";
}

export function buildDocumentStoragePath(input: {
  ownerId: string;
  category: DocumentCategory;
  fileName: string;
  documentId: string;
}) {
  return [
    input.ownerId,
    input.category.toLowerCase(),
    `${input.documentId}-${sanitizeDocumentFileName(input.fileName)}`,
  ].join("/");
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
  const activeModuleLinks = normalized
    .flatMap((document) => document.moduleLinks)
    .filter((link) => link.status === "Active");
  const tagCounts = normalized
    .flatMap((document) => document.tags)
    .reduce((counts, tag) => {
      counts.set(tag, (counts.get(tag) || 0) + 1);
      return counts;
    }, new Map<string, number>());
  const activeAccessGrants = normalized
    .flatMap((document) => document.accessGrants)
    .filter(
      (grant) => grant.status === "Active" && grant.permission !== "None"
    );
  const sharedDocumentIds = new Set(
    activeAccessGrants.map((grant) => grant.documentId)
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
    moduleLinks: activeModuleLinks.length,
    linkedModules: Array.from(
      new Set(activeModuleLinks.map((link) => link.sourceModule))
    ).sort(),
    categoryCounts,
    folderCount: new Set(
      normalized.map((document) => document.folderId).filter(Boolean)
    ).size,
    collectionCount: new Set(
      normalized.flatMap((document) =>
        document.collections.map((collection) => collection.id)
      )
    ).size,
    taggedDocuments: normalized.filter((document) => document.tags.length > 0)
      .length,
    topTags: Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((left, right) => right.count - left.count || left.tag.localeCompare(right.tag))
      .slice(0, 8),
    sharedDocuments: sharedDocumentIds.size,
    activeAccessGrants: activeAccessGrants.length,
    householdSharedDocuments: new Set(
      activeAccessGrants
        .filter((grant) => grant.scope === "Household")
        .map((grant) => grant.documentId)
    ).size,
    directSharedDocuments: new Set(
      activeAccessGrants
        .filter((grant) => grant.scope === "Member")
        .map((grant) => grant.documentId)
    ).size,
    manageableSharedDocuments: new Set(
      activeAccessGrants
        .filter((grant) => grant.permission === "Manage")
        .map((grant) => grant.documentId)
    ).size,
  };
}

export function getActiveDocumentModuleLinks(document: BeastDocument) {
  return document.moduleLinks.filter((link) => link.status === "Active");
}

export function getActiveDocumentAccessGrants(document: BeastDocument) {
  return document.accessGrants.filter(
    (grant) => grant.status === "Active" && grant.permission !== "None"
  );
}

export function getDocumentVisibilityLabel(document: BeastDocument) {
  const activeGrants = getActiveDocumentAccessGrants(document);

  if (activeGrants.length === 0) {
    return "Private";
  }

  const hasHousehold = activeGrants.some(
    (grant) => grant.scope === "Household"
  );
  const hasManage = activeGrants.some((grant) => grant.permission === "Manage");

  if (hasHousehold && hasManage) {
    return "Household Manage";
  }

  if (hasHousehold) {
    return "Household View";
  }

  return hasManage ? "Shared Manage" : "Shared View";
}
