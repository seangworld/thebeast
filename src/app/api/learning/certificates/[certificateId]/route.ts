import { NextResponse } from "next/server";
import { createRouteClient } from "@/lib/supabase/server";

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function buildCertificatePdf({
  certificateId,
  learnerName,
  pathName,
  completionDate,
}: {
  certificateId: string;
  learnerName: string;
  pathName: string;
  completionDate: string;
}) {
  const lines = [
    "BeastLearning Certificate of Completion",
    `Awarded to ${learnerName}`,
    pathName,
    `Completed ${completionDate}`,
    `Certificate ID ${certificateId}`,
    "Private Beta completion record. Future verification reserved.",
  ];
  const stream = [
    "BT",
    "/F1 24 Tf",
    "72 720 Td",
    `(${escapePdfText(lines[0])}) Tj`,
    "/F1 16 Tf",
    ...lines.slice(1).flatMap((line) => [
      "0 -36 Td",
      `(${escapePdfText(line)}) Tj`,
    ]),
    "ET",
  ].join("\n");
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj",
    "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> endobj",
    `5 0 obj << /Length ${stream.length} >> stream\n${stream}\nendstream endobj`,
  ];
  const header = "%PDF-1.4\n";
  let body = "";
  const offsets = [0];

  objects.forEach((object) => {
    offsets.push(header.length + body.length);
    body += `${object}\n`;
  });

  const xrefOffset = header.length + body.length;
  const xref = [
    "xref",
    `0 ${objects.length + 1}`,
    "0000000000 65535 f ",
    ...offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n `),
    "trailer",
    `<< /Size ${objects.length + 1} /Root 1 0 R >>`,
    "startxref",
    String(xrefOffset),
    "%%EOF",
  ].join("\n");

  return `${header}${body}${xref}`;
}

export async function GET(
  _request: Request,
  { params }: { params: { certificateId: string } }
) {
  const supabase = createRouteClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const { data: certificate, error } = await supabase
    .from("learning_certificates")
    .select("certificate_id, learner_name, path_name, completion_date")
    .eq("certificate_id", params.certificateId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!certificate) {
    return NextResponse.json({ error: "Certificate not found." }, { status: 404 });
  }

  const pdf = buildCertificatePdf({
    certificateId: String(certificate.certificate_id),
    learnerName: String(certificate.learner_name),
    pathName: String(certificate.path_name),
    completionDate: String(certificate.completion_date),
  });

  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${certificate.certificate_id}.pdf"`,
    },
  });
}
