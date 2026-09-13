export type DeliveryFile = {
  originalName: string;
  packagePath: string;
  bytes: number;
  sha256: string;
};

export type ClientDeliveryInput = {
  clientName: string;
  projectName: string;
  serviceType: string;
  summary: string;
  deliverables: string;
  handoffInstructions: string;
  nextSteps: string;
  supportTerms: string;
  deliveredAt: string;
  files: DeliveryFile[];
};

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character] || character));
const lines = (value: string) => value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
const markdownList = (value: string, fallback: string) => lines(value).length ? lines(value).map((item) => `- ${item}`).join("\n") : `- ${fallback}`;
const htmlList = (value: string, fallback: string) => `<ul>${(lines(value).length ? lines(value) : [fallback]).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;

export function renderClientDeliveryDocuments(input: ClientDeliveryInput) {
  const fileRows = input.files.map((file) => `| ${file.packagePath.replace(/\|/g, "\\|")} | ${file.bytes.toLocaleString("en-US")} | \`${file.sha256}\` |`).join("\n");
  const readme = `# ${input.projectName} — Client Delivery\n\n**Prepared for:** ${input.clientName}\n\n**Service:** ${input.serviceType}\n\n**Delivery date:** ${input.deliveredAt}\n\n## Project summary\n\n${input.summary || "Completed work is included in the Deliverables folder."}\n\n## Included deliverables\n\n${markdownList(input.deliverables, "See the Deliverables folder and File-Manifest.json.")}\n\n## Handoff instructions\n\n${input.handoffInstructions || "Open the Deliverables folder and review the supplied files."}\n\n## Next steps\n\n${markdownList(input.nextSteps, "Confirm receipt and report any file-access problem.")}\n\n## Support and revision terms\n\n${input.supportTerms || "No additional support or revision terms were supplied in this package."}\n\n## File verification\n\n| File | Bytes | SHA-256 |\n| --- | ---: | --- |\n${fileRows}\n`;
  const report = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(input.projectName)} delivery</title><style>body{margin:0;background:#08111d;color:#e8f2fb;font:16px/1.6 system-ui,-apple-system,sans-serif}.page{max-width:920px;margin:0 auto;padding:56px 28px}.eyebrow{color:#71e4ff;font-weight:800;letter-spacing:.14em;text-transform:uppercase;font-size:12px}h1{font-size:42px;line-height:1.1;margin:.3em 0}.meta,.card{border:1px solid #294055;border-radius:16px;background:#111d2b;padding:20px;margin:18px 0}.meta{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}.label{color:#93a8bb;font-size:12px;text-transform:uppercase;font-weight:700}.value{font-weight:750}h2{font-size:21px;margin:0 0 8px;color:#fff}ul{padding-left:22px}.files{overflow:auto}table{width:100%;border-collapse:collapse;font-size:13px}th,td{text-align:left;border-bottom:1px solid #294055;padding:10px 8px;vertical-align:top}code{word-break:break-all;color:#a9f0ff}@media print{body{background:#fff;color:#17202a}.page{padding:20px}.card,.meta{background:#fff;border-color:#ccd5dc}h1,h2{color:#111}.eyebrow,code{color:#086b80}}</style></head><body><main class="page"><p class="eyebrow">SEANGWORLD Client Delivery</p><h1>${escapeHtml(input.projectName)}</h1><div class="meta"><div><div class="label">Prepared for</div><div class="value">${escapeHtml(input.clientName)}</div></div><div><div class="label">Service</div><div class="value">${escapeHtml(input.serviceType)}</div></div><div><div class="label">Delivered</div><div class="value">${escapeHtml(input.deliveredAt)}</div></div></div><section class="card"><h2>Project summary</h2><p>${escapeHtml(input.summary || "Completed work is included in the Deliverables folder.")}</p></section><section class="card"><h2>Included deliverables</h2>${htmlList(input.deliverables, "See the Deliverables folder and File-Manifest.json.")}</section><section class="card"><h2>Handoff instructions</h2><p>${escapeHtml(input.handoffInstructions || "Open the Deliverables folder and review the supplied files.")}</p></section><section class="card"><h2>Next steps</h2>${htmlList(input.nextSteps, "Confirm receipt and report any file-access problem.")}</section><section class="card"><h2>Support and revision terms</h2><p>${escapeHtml(input.supportTerms || "No additional support or revision terms were supplied in this package.")}</p></section><section class="card files"><h2>File verification</h2><table><thead><tr><th>File</th><th>Bytes</th><th>SHA-256</th></tr></thead><tbody>${input.files.map((file) => `<tr><td>${escapeHtml(file.packagePath)}</td><td>${file.bytes.toLocaleString("en-US")}</td><td><code>${file.sha256}</code></td></tr>`).join("")}</tbody></table></section></main></body></html>`;
  return { readme, report };
}
