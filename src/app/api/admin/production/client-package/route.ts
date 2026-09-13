import { createHash } from "node:crypto";
import JSZip from "jszip";
import { NextResponse } from "next/server";
import { renderClientDeliveryDocuments, type ClientDeliveryInput, type DeliveryFile } from "@/lib/clientDeliveryPackage";
import { createRouteClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_TOTAL_BYTES = 24 * 1024 * 1024;
const MAX_FILE_BYTES = 15 * 1024 * 1024;
const MAX_FILES = 50;
const json = (body: unknown, status: number) => NextResponse.json(body, { status, headers: { "cache-control": "private, no-store" } });
const text = (form: FormData, name: string, max: number) => String(form.get(name) || "").trim().slice(0, max);
const slug = (value: string) => value.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 70) || "client-delivery";
const cleanFileName = (value: string) => value.split(/[\\/]/).pop()?.replace(/[\u0000-\u001f<>:"|?*]+/g, "-").trim().slice(0, 180) || "file";

async function ownerAccess() {
  const client = createRouteClient();
  const auth = await client.auth.getUser();
  if (!auth.data.user || auth.error) return null;
  const profile = await client.from("profiles").select("role").eq("id", auth.data.user.id).maybeSingle();
  return !profile.error && profile.data?.role === "admin" ? { client, id: auth.data.user.id } : null;
}

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return json({ error: "Same-origin request required." }, 403);
  const access = await ownerAccess();
  if (!access) return json({ error: "SEANGWORLD HQ owner access required." }, 403);
  const declaredSize = Number(request.headers.get("content-length") || 0);
  if (declaredSize > MAX_TOTAL_BYTES + 150_000) return json({ error: "The combined upload is too large. Keep all files under 24 MB." }, 413);
  let form: FormData;
  try { form = await request.formData(); }
  catch { return json({ error: "The delivery form could not be read." }, 400); }

  const clientName = text(form, "clientName", 120);
  const projectName = text(form, "projectName", 120);
  const serviceType = text(form, "serviceType", 80);
  if (!clientName || !projectName || !serviceType) return json({ error: "Client name, project name, and service type are required." }, 400);
  const uploads = form.getAll("files").filter((value): value is File => value instanceof File && value.size > 0);
  if (!uploads.length) return json({ error: "Add at least one finished deliverable." }, 400);
  if (uploads.length > MAX_FILES) return json({ error: `Add no more than ${MAX_FILES} files per package.` }, 413);
  if (uploads.some((file) => file.size > MAX_FILE_BYTES)) return json({ error: "Each deliverable must be 15 MB or smaller." }, 413);
  if (uploads.reduce((sum, file) => sum + file.size, 0) > MAX_TOTAL_BYTES) return json({ error: "Keep the combined deliverables under 24 MB." }, 413);

  try {
    const zip = new JSZip();
    const used = new Set<string>();
    const manifest: DeliveryFile[] = [];
    for (const upload of uploads) {
      const bytes = new Uint8Array(await upload.arrayBuffer());
      const base = cleanFileName(upload.name);
      let name = base;
      let index = 2;
      while (used.has(name.toLowerCase())) {
        const dot = base.lastIndexOf(".");
        name = dot > 0 ? `${base.slice(0, dot)}-${index}${base.slice(dot)}` : `${base}-${index}`;
        index += 1;
      }
      used.add(name.toLowerCase());
      const packagePath = `Deliverables/${name}`;
      zip.file(packagePath, bytes);
      manifest.push({ originalName: upload.name, packagePath, bytes: upload.size, sha256: createHash("sha256").update(bytes).digest("hex") });
    }
    const deliveredAt = new Date().toISOString().slice(0, 10);
    const input: ClientDeliveryInput = { clientName, projectName, serviceType, summary: text(form, "summary", 3000), deliverables: text(form, "deliverables", 3000), handoffInstructions: text(form, "handoffInstructions", 3000), nextSteps: text(form, "nextSteps", 3000), supportTerms: text(form, "supportTerms", 3000), deliveredAt, files: manifest };
    const documents = renderClientDeliveryDocuments(input);
    zip.file("README-FIRST.md", documents.readme);
    zip.file("Delivery-Summary.html", documents.report);
    zip.file("File-Manifest.json", JSON.stringify({ clientName, projectName, serviceType, deliveredAt, files: manifest }, null, 2));
    const output = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE", compressionOptions: { level: 9 } });
    const artifactName = `${slug(projectName)}-client-delivery.zip`;
    const inputBytes = manifest.reduce((sum, file) => sum + file.bytes, 0);
    let jobRecorded = false;
    try {
      const recorded = await access.client.from("seangworld_client_jobs").insert({ owner_id: access.id, client_name: clientName, project_name: projectName, job_type: "client_delivery", files_count: manifest.length, input_bytes: inputBytes, artifact_name: artifactName });
      jobRecorded = !recorded.error;
    } catch { /* History is supplemental and must never block the finished download. */ }
    return new NextResponse(Buffer.from(output), { status: 200, headers: { "content-type": "application/zip", "content-disposition": `attachment; filename="${artifactName}"`, "cache-control": "private, no-store", "x-delivery-files": String(manifest.length), "x-delivery-bytes": String(inputBytes), "x-job-recorded": String(jobRecorded) } });
  } catch {
    return json({ error: "The delivery package could not be created. Your files were not stored." }, 500);
  }
}
