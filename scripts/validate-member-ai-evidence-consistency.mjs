import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const currentEvidenceFiles = [
  "src/lib/member-agent-capability-projection.json",
  "docs/BEASTOS-3.2.0-BEASTFUSION-2.5.0-MEMBER-AI.md",
  "scripts/generate-member-ai-safety-evidence.mjs",
  "tests/memberAgentSafetyEvidenceCases.json",
];

try {
  const legacyDirectory = resolve("evidence/member-ai");
  for (const name of await readdir(legacyDirectory)) {
    if (name.endsWith(".json")) currentEvidenceFiles.push(`evidence/member-ai/${name}`);
  }
} catch {
  // The superseded local evidence directory may be absent.
}

const forbidden = [
  { label: "stale Level 3 member assessment", expression: /\b(?:L3|Level 3)\b/ },
  { label: "stale Production assessment binding", expression: /thebeast-production/ },
];
const failures = [];
for (const file of currentEvidenceFiles) {
  const content = await readFile(resolve(file), "utf8");
  for (const rule of forbidden) if (rule.expression.test(content)) failures.push(`${file}: ${rule.label}`);
}

const projection = JSON.parse(await readFile(resolve(currentEvidenceFiles[0]), "utf8"));
if (projection.assessments?.length !== 4) failures.push("projection must contain exactly four member specialist assessments");
for (const assessment of projection.assessments || []) {
  if (assessment.autonomy?.level !== 2 || assessment.autonomy?.userRole !== "collaborator") failures.push(`${assessment.agentId}: assessment must be Knight L2 Collaborator`);
  if (assessment.assessmentBinding?.environmentId !== "thebeast-ci-provider-stub") failures.push(`${assessment.agentId}: assessment must bind the CI provider-stub environment`);
  if (!assessment.autonomy?.limitations?.some((item) => /configured-model .* was not evaluated/i.test(item))) failures.push(`${assessment.agentId}: configured-model limitation is required`);
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Member AI evidence consistency passed across ${currentEvidenceFiles.length} current files.`);
}
