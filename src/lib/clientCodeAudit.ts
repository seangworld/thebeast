export type AuditSeverity = "critical" | "high" | "medium" | "low" | "info";

export type AuditSourceFile = {
  path: string;
  content: string;
};

export type AuditFinding = {
  id: string;
  severity: AuditSeverity;
  category: "security" | "reliability" | "maintainability" | "delivery";
  title: string;
  explanation: string;
  recommendation: string;
  path?: string;
  line?: number;
};

export type ClientCodeAudit = {
  generatedAt: string;
  project: { clientName: string; projectName: string; focus: string; notes: string };
  inventory: {
    filesReviewed: number;
    linesReviewed: number;
    extensions: Array<{ extension: string; files: number }>;
    detectedSignals: string[];
  };
  summary: Record<AuditSeverity, number>;
  findings: AuditFinding[];
  limitations: string[];
};

type AuditInput = {
  clientName: string;
  projectName: string;
  focus?: string;
  notes?: string;
  files: AuditSourceFile[];
  generatedAt?: string;
};

const severityOrder: Record<AuditSeverity, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
const secretValue = /(?:api[_-]?key|secret|token|password|passwd|private[_-]?key)\s*[:=]\s*["'`]([^"'`\s]{8,})["'`]/gi;

const rules: Array<Omit<AuditFinding, "id" | "path" | "line"> & { pattern: RegExp }> = [
  { severity: "high", category: "security", title: "Dynamic code execution", pattern: /\b(?:eval|new\s+Function)\s*\(/g, explanation: "Dynamic evaluation can turn untrusted input into executable code.", recommendation: "Remove dynamic evaluation or replace it with an explicit parser and allow-listed operations." },
  { severity: "high", category: "security", title: "Shell command execution", pattern: /\b(?:exec|execSync|spawn|spawnSync)\s*\(/g, explanation: "Shell or process execution can become command injection when arguments contain untrusted data.", recommendation: "Avoid shell execution where possible; otherwise use fixed commands, argument arrays, validation, and least privilege." },
  { severity: "high", category: "security", title: "Possible hard-coded credential", pattern: secretValue, explanation: "A credential-like value appears to be embedded in source code. The value is intentionally omitted from this report.", recommendation: "Rotate the credential if real, remove it from history, and load it from an approved secret store." },
  { severity: "medium", category: "security", title: "Overly broad CORS policy", pattern: /(?:access-control-allow-origin[^\n]{0,40}\*|origin\s*:\s*["'`]\*["'`])/gi, explanation: "A wildcard origin may expose an endpoint to unintended browser clients.", recommendation: "Allow only the origins that require access, and review credentials and preflight behavior." },
  { severity: "medium", category: "security", title: "Potential SQL string construction", pattern: /(?:SELECT|INSERT|UPDATE|DELETE)[^\n]{0,160}(?:\$\{|\+\s*\w+)/gi, explanation: "A SQL statement appears to be assembled with a variable. This can permit injection if the value is not safely bound.", recommendation: "Use parameterized queries or the database client's structured query API." },
  { severity: "medium", category: "reliability", title: "Insecure HTTP endpoint", pattern: /http:\/\/(?!localhost|127\.0\.0\.1)/gi, explanation: "A non-local HTTP URL sends traffic without transport encryption.", recommendation: "Use HTTPS and verify the destination's certificate and ownership." },
  { severity: "low", category: "maintainability", title: "Unfinished work marker", pattern: /\b(?:TODO|FIXME|HACK)\b/g, explanation: "The source contains an unfinished-work marker that may represent deferred risk.", recommendation: "Review the marker, create a tracked task if still valid, or remove it if resolved." },
  { severity: "low", category: "maintainability", title: "Debug logging remains", pattern: /\bconsole\.(?:log|debug)\s*\(/g, explanation: "Debug output may expose internal data or add noise in production.", recommendation: "Remove it or route intentional events through a structured logger with redaction." },
];

function extension(path: string) {
  const name = path.split("/").pop() || path;
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot).toLowerCase() : "[no extension]";
}

function lineAt(content: string, index: number) {
  return content.slice(0, index).split("\n").length;
}

function detectedSignals(paths: string[]) {
  const joined = paths.join("\n").toLowerCase();
  const signals: string[] = [];
  if (paths.some((path) => /(^|\/)package\.json$/i.test(path))) signals.push("Node.js / JavaScript package");
  if (/next\.config\.|\/app\/|\/pages\//.test(joined)) signals.push("Possible Next.js application");
  if (paths.some((path) => /(^|\/)requirements\.txt$|pyproject\.toml$|\.py$/i.test(path))) signals.push("Python");
  if (paths.some((path) => /\.tsx?$/.test(path.toLowerCase()))) signals.push("TypeScript");
  if (paths.some((path) => /dockerfile$|docker-compose/i.test(path))) signals.push("Container configuration");
  if (/\.github\/workflows\//.test(joined)) signals.push("GitHub Actions");
  return signals;
}

export function auditClientCode(input: AuditInput): ClientCodeAudit {
  const findings: AuditFinding[] = [];
  let sequence = 0;
  for (const file of input.files) {
    for (const rule of rules) {
      const pattern = new RegExp(rule.pattern.source, rule.pattern.flags);
      let match: RegExpExecArray | null;
      let matches = 0;
      while ((match = pattern.exec(file.content)) && matches < 25) {
        findings.push({ id: `F-${String(++sequence).padStart(3, "0")}`, severity: rule.severity, category: rule.category, title: rule.title, explanation: rule.explanation, recommendation: rule.recommendation, path: file.path, line: lineAt(file.content, match.index) });
        matches += 1;
        if (match[0].length === 0) pattern.lastIndex += 1;
      }
    }
  }

  const paths = input.files.map((file) => file.path);
  const hasReadme = paths.some((path) => /(^|\/)readme(?:\.[^/]*)?$/i.test(path));
  const hasTests = paths.some((path) => /(?:^|\/)(?:test|tests|__tests__)(?:\/|$)|\.(?:test|spec)\.[^/]+$/i.test(path));
  const hasManifest = paths.some((path) => /(^|\/)(?:package\.json|pyproject\.toml|requirements\.txt|go\.mod|cargo\.toml|composer\.json)$/i.test(path));
  const deliveryFindings = [
    !hasReadme && { title: "README not found", explanation: "The reviewed files do not contain an obvious README for setup and operating guidance.", recommendation: "Add setup, configuration, testing, deployment, and support instructions." },
    !hasTests && { title: "Automated tests not found", explanation: "No conventional test directory or test filename was found in the reviewed files.", recommendation: "Add tests for the highest-risk user and data flows, then run them in continuous integration." },
    !hasManifest && { title: "Dependency manifest not found", explanation: "No common dependency manifest was found, so dependencies and reproducibility cannot be assessed.", recommendation: "Include the project's dependency manifest and lockfile in the delivery." },
  ].filter(Boolean) as Array<{ title: string; explanation: string; recommendation: string }>;
  for (const item of deliveryFindings) findings.push({ id: `F-${String(++sequence).padStart(3, "0")}`, severity: "medium", category: "delivery", ...item });

  findings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity] || (a.path || "").localeCompare(b.path || "") || (a.line || 0) - (b.line || 0));
  findings.forEach((finding, index) => { finding.id = `F-${String(index + 1).padStart(3, "0")}`; });
  const counts = new Map<string, number>();
  input.files.forEach((file) => counts.set(extension(file.path), (counts.get(extension(file.path)) || 0) + 1));
  const summary: Record<AuditSeverity, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  findings.forEach((finding) => { summary[finding.severity] += 1; });

  return {
    generatedAt: input.generatedAt || new Date().toISOString(),
    project: { clientName: input.clientName, projectName: input.projectName, focus: input.focus || "General static review", notes: input.notes || "" },
    inventory: {
      filesReviewed: input.files.length,
      linesReviewed: input.files.reduce((total, file) => total + file.content.split("\n").length, 0),
      extensions: Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).map(([name, files]) => ({ extension: name, files })),
      detectedSignals: detectedSignals(paths),
    },
    summary,
    findings,
    limitations: [
      "This is a deterministic static review. The uploaded code was not executed, built, or tested.",
      "Pattern matches require human confirmation and may include false positives or miss context-dependent issues.",
      "This package is not a security certification, penetration test, legal opinion, or guarantee that the code is defect-free.",
      "Dependency vulnerability status was not checked against a live advisory database.",
    ],
  };
}

const safeCell = (value: string) => value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");

export function renderAuditReports(audit: ClientCodeAudit) {
  const summary = `# Code Audit Executive Summary\n\n**Client:** ${audit.project.clientName}\n\n**Project:** ${audit.project.projectName}\n\n**Generated:** ${audit.generatedAt}\n\n**Review focus:** ${audit.project.focus}\n\n## Result at a glance\n\n- Files reviewed: ${audit.inventory.filesReviewed}\n- Lines reviewed: ${audit.inventory.linesReviewed}\n- Critical: ${audit.summary.critical}\n- High: ${audit.summary.high}\n- Medium: ${audit.summary.medium}\n- Low: ${audit.summary.low}\n\n## Recommended next move\n\n${audit.findings.length ? `Confirm and address ${audit.findings[0].id}: ${audit.findings[0].title}, then work down the prioritized findings.` : "No rule-based findings were detected. Complete a human architecture review and run the project's tests before release."}\n\n## Scope note\n\n${audit.limitations.map((item) => `- ${item}`).join("\n")}\n`;
  const rows = audit.findings.length ? audit.findings.map((finding) => `| ${finding.id} | ${finding.severity.toUpperCase()} | ${safeCell(finding.title)} | ${safeCell(finding.path ? `${finding.path}:${finding.line || 1}` : "Project-wide")} | ${safeCell(finding.explanation)} | ${safeCell(finding.recommendation)} |`).join("\n") : "| — | INFO | No rule-based findings | Project-wide | No configured pattern matched. | Complete manual review and runtime verification. |";
  const findings = `# Technical Findings\n\n| ID | Severity | Finding | Location | Why it matters | Recommendation |\n| --- | --- | --- | --- | --- | --- |\n${rows}\n\n## Client notes\n\n${audit.project.notes || "No client notes were provided."}\n\n## Limitations\n\n${audit.limitations.map((item) => `- ${item}`).join("\n")}\n`;
  const delivery = `# Delivery Notes\n\nThis package contains a static, no-execution review of the supplied ZIP.\n\n- Start with \`Executive-Summary.md\`.\n- Use \`Technical-Findings.md\` as the prioritized remediation list.\n- \`Project-Inventory.json\` contains machine-readable scope details.\n- \`audit-data.json\` contains the complete structured result.\n\nPotential credential values are never copied into findings. Review the limitations before sharing this package as a final assessment.\n`;
  return { summary, findings, delivery };
}
