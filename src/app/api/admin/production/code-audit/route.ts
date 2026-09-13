import JSZip from "jszip";
import { NextResponse } from "next/server";
import { auditClientCode, renderAuditReports, type AuditSourceFile } from "@/lib/clientCodeAudit";
import { createRouteClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
const MAX_FILES = 1500;
const MAX_FILE_REVIEW_BYTES = 2 * 1024 * 1024;
const MAX_REVIEW_BYTES = 30 * 1024 * 1024;
const textExtensions = new Set([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".json", ".py", ".rb", ".php", ".java", ".go", ".rs", ".cs", ".cpp", ".c", ".h", ".html", ".css", ".scss", ".sql", ".sh", ".yml", ".yaml", ".toml", ".xml", ".md", ".txt", ".env", ".properties", ".gradle"]);
const namedFiles = new Set(["dockerfile", "makefile", "procfile", "gemfile"]);
const ignored = /(^|\/)(?:node_modules|\.git|\.next|dist|build|coverage|vendor|target|\.venv)(\/|$)/i;

const json = (body: unknown, status: number) => NextResponse.json(body, { status, headers: { "cache-control": "private, no-store" } });
const clean = (value: FormDataEntryValue | null, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";
const safeName = (value: string) => value.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 70) || "code-risk-scan";

async function ownerAccess() {
  const client = createRouteClient();
  const auth = await client.auth.getUser();
  if (!auth.data.user || auth.error) return null;
  const profile = await client.from("profiles").select("role").eq("id", auth.data.user.id).maybeSingle();
  return !profile.error && profile.data?.role === "admin" ? { client, id: auth.data.user.id } : null;
}

function eligible(path: string) {
  const normalized = path.replace(/\\/g, "/");
  if (!normalized || normalized.startsWith("/") || normalized.includes("../") || ignored.test(normalized)) return false;
  const name = normalized.split("/").pop()?.toLowerCase() || "";
  const dot = name.lastIndexOf(".");
  return namedFiles.has(name) || (dot >= 0 && textExtensions.has(name.slice(dot)));
}

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return json({ error: "Same-origin request required." }, 403);
  const access = await ownerAccess();
  if (!access) return json({ error: "SEANGWORLD HQ owner access required." }, 403);
  const declaredSize = Number(request.headers.get("content-length") || 0);
  if (declaredSize > MAX_UPLOAD_BYTES + 100_000) return json({ error: "Upload is too large. Use a ZIP smaller than 12 MB." }, 413);

  let form: FormData;
  try { form = await request.formData(); }
  catch { return json({ error: "The upload could not be read." }, 400); }
  const archive = form.get("archive");
  const clientName = clean(form.get("clientName"), 120);
  const projectName = clean(form.get("projectName"), 120);
  const auditType = "full" as const;
  const focus = clean(form.get("focus"), 500);
  const notes = clean(form.get("notes"), 3000);
  if (!clientName || !projectName) return json({ error: "Client name and project name are required." }, 400);
  if (!(archive instanceof File) || !archive.name.toLowerCase().endsWith(".zip")) return json({ error: "Upload one ZIP file." }, 400);
  if (!archive.size || archive.size > MAX_UPLOAD_BYTES) return json({ error: "Use a ZIP between 1 byte and 12 MB." }, 413);

  try {
    const input = await JSZip.loadAsync(await archive.arrayBuffer(), { checkCRC32: true, createFolders: false });
    const entries = Object.values(input.files).filter((entry) => !entry.dir);
    if (entries.length > MAX_FILES) return json({ error: `The ZIP contains more than ${MAX_FILES} files. Remove dependencies and build output, then retry.` }, 413);
    const sourceFiles: AuditSourceFile[] = [];
    let reviewedBytes = 0;
    for (const entry of entries) {
      const unixMode = typeof entry.unixPermissions === "number" ? entry.unixPermissions : parseInt(String(entry.unixPermissions || "0"), 8);
      if ((unixMode & 0o170000) === 0o120000 || !eligible(entry.name)) continue;
      const declaredUncompressedBytes = Number((entry as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize || 0);
      if (declaredUncompressedBytes > MAX_FILE_REVIEW_BYTES) return json({ error: `A reviewable file exceeds 2 MB (${entry.name}). Remove generated content or split the file, then retry.` }, 413);
      const content = await entry.async("string");
      const fileBytes = Buffer.byteLength(content, "utf8");
      if (fileBytes > MAX_FILE_REVIEW_BYTES) return json({ error: `A reviewable file exceeds 2 MB (${entry.name}). Remove generated content or split the file, then retry.` }, 413);
      reviewedBytes += fileBytes;
      if (reviewedBytes > MAX_REVIEW_BYTES) return json({ error: "Reviewable text exceeds 30 MB. Remove generated files and retry." }, 413);
      if (content.includes("\u0000")) continue;
      sourceFiles.push({ path: entry.name.replace(/\\/g, "/"), content });
    }
    if (!sourceFiles.length) return json({ error: "No supported source or documentation files were found in the ZIP." }, 400);

    const audit = auditClientCode({ clientName, projectName, auditType, focus, notes, files: sourceFiles });
    const reports = renderAuditReports(audit);
    const output = new JSZip();
    output.file("Executive-Summary.md", reports.summary);
    output.file("Technical-Findings.md", reports.findings);
    output.file("Code-Risk-Scan-Report.html", reports.html);
    output.file("Findings.csv", reports.csv);
    output.file("Prioritized-Remediation-Plan.md", reports.remediation);
    output.file("Runtime-Verification-Checklist.md", reports.verification);
    output.file("Delivery-Notes.md", reports.delivery);
    output.file("Project-Inventory.json", JSON.stringify(audit.inventory, null, 2));
    output.file("scan-data.json", JSON.stringify(audit, null, 2));
    const bytes = await output.generateAsync({ type: "uint8array", compression: "DEFLATE", compressionOptions: { level: 9 } });
    const artifactName = `${safeName(projectName)}-code-risk-scan.zip`;
    let jobRecorded = false;
    try {
      const recorded = await access.client.from("seangworld_client_jobs").insert({ owner_id: access.id, client_name: clientName, project_name: projectName, job_type: "code_audit", audit_profile: auditType, attention_level: audit.attentionLevel, files_count: audit.inventory.filesReviewed, findings_count: audit.findings.length, critical_count: audit.summary.critical, high_count: audit.summary.high, medium_count: audit.summary.medium, input_bytes: archive.size, artifact_name: artifactName });
      jobRecorded = !recorded.error;
    } catch { /* History is supplemental and must never block the finished download. */ }
    return new NextResponse(Buffer.from(bytes), { status: 200, headers: { "content-type": "application/zip", "content-disposition": `attachment; filename="${artifactName}"`, "cache-control": "private, no-store", "x-audit-files-reviewed": String(audit.inventory.filesReviewed), "x-audit-findings": String(audit.findings.length), "x-audit-critical": String(audit.summary.critical), "x-audit-high": String(audit.summary.high), "x-audit-medium": String(audit.summary.medium), "x-audit-attention": audit.attentionLevel, "x-job-recorded": String(jobRecorded) } });
  } catch {
    return json({ error: "The ZIP is invalid, encrypted, or could not be audited. No client code was executed." }, 400);
  }
}
