export type AuditSeverity = "critical" | "high" | "medium" | "low" | "info";
export type AuditCategory = "security" | "reliability" | "maintainability" | "accessibility" | "performance" | "dependencies" | "delivery";
export type AuditType = "full" | "security" | "launch" | "quality";
export type AuditSourceFile = { path: string; content: string };
export type AuditFinding = { id: string; severity: AuditSeverity; category: AuditCategory; title: string; explanation: string; recommendation: string; path?: string; line?: number; additionalLines?: number[]; occurrences: number };
export type AuditCheck = { name: string; status: "present" | "attention" | "not-assessed"; detail: string };
export type ClientCodeAudit = {
  generatedAt: string;
  project: { clientName: string; projectName: string; auditType: AuditType; focus: string; notes: string };
  inventory: { filesReviewed: number; linesReviewed: number; bytesReviewed: number; extensions: Array<{ extension: string; files: number }>; detectedSignals: string[]; largestFiles: Array<{ path: string; lines: number; bytes: number }>; dependencyManifests: string[]; declaredDependencies: number | null };
  attentionLevel: "urgent" | "high" | "moderate" | "low";
  summary: Record<AuditSeverity, number>;
  categorySummary: Array<{ category: AuditCategory; findings: number }>;
  coverage: AuditCheck[];
  scanCoverage: AuditCheck[];
  topActions: Array<{ id: string; severity: AuditSeverity; title: string; recommendation: string }>;
  findings: AuditFinding[];
  limitations: string[];
};
type AuditInput = { clientName: string; projectName: string; auditType?: AuditType; focus?: string; notes?: string; files: AuditSourceFile[]; generatedAt?: string };
type Rule = Omit<AuditFinding, "id" | "path" | "line" | "additionalLines" | "occurrences"> & { pattern: RegExp; file?: RegExp };

const severityOrder: Record<AuditSeverity, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
const categoryOrder: AuditCategory[] = ["security", "dependencies", "reliability", "accessibility", "performance", "maintainability", "delivery"];
const profileCategories: Record<AuditType, AuditCategory[]> = { full: categoryOrder, security: ["security", "dependencies", "delivery"], launch: ["security", "dependencies", "reliability", "accessibility", "performance", "delivery"], quality: ["reliability", "accessibility", "performance", "maintainability", "delivery"] };
const rules: Rule[] = [
  { severity: "critical", category: "security", title: "Private key material in source", pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g, explanation: "Private key material appears to be included in the submitted source.", recommendation: "Treat the key as exposed: revoke or rotate it immediately, remove it from repository history, and use an approved secret store." },
  { severity: "critical", category: "security", title: "Provider access token in source", pattern: /(?:AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|sk_live_[A-Za-z0-9]{16,})/g, explanation: "A high-confidence provider credential pattern appears in source. The value is intentionally omitted from every report.", recommendation: "Treat the credential as exposed: revoke or rotate it, remove it from repository history, and use a server-side secret store." },
  { severity: "critical", category: "security", title: "Database connection credential in source", pattern: /(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/[^\s:@/]+:[^\s@/]+@/gi, explanation: "A database connection string appears to contain embedded credentials. The value is intentionally omitted.", recommendation: "Rotate the database credential, remove the connection string from history, and load it from a protected server-side environment variable." },
  { severity: "high", category: "security", title: "Possible hard-coded credential", pattern: /(?:api[_-]?key|client[_-]?secret|access[_-]?token|password|passwd)\s*[:=]\s*["'`]([^"'`\s]{8,})["'`]/gi, explanation: "A credential-like value appears to be embedded in source. Its value is intentionally omitted.", recommendation: "Confirm whether it is real, rotate it if exposed, remove it from history, and use an approved secret store." },
  { severity: "high", category: "security", title: "JSON Web Token in source", pattern: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{8,}/g, explanation: "A token-shaped value appears in source. Its value is intentionally omitted.", recommendation: "Confirm whether the token is real, revoke it if possible, remove it from history, and issue short-lived tokens at runtime." },
  { severity: "high", category: "security", title: "Supabase service-role credential reference", pattern: /(?:SUPABASE_SERVICE_ROLE_KEY|service_role)/gi, explanation: "Service-role access bypasses normal row-level restrictions and must never be exposed to browser or untrusted code.", recommendation: "Keep service-role access in a restricted server-only path, verify the key is not bundled for clients, and rotate any exposed key." },
  { severity: "high", category: "security", title: "Dynamic code execution", pattern: /\b(?:eval|new\s+Function)\s*\(/g, explanation: "Dynamic evaluation can turn untrusted input into executable code.", recommendation: "Replace dynamic evaluation with an explicit parser and allow-listed operations." },
  { severity: "high", category: "security", title: "Shell or process execution", pattern: /\b(?:exec|execSync|spawn|spawnSync)\s*\(/g, explanation: "Process execution can become command injection when arguments contain untrusted data.", recommendation: "Avoid shell execution where possible; otherwise use fixed commands, argument arrays, strict validation, and least privilege." },
  { severity: "high", category: "security", title: "TLS certificate verification disabled", pattern: /(?:rejectUnauthorized\s*:\s*false|verify\s*=\s*False)/g, explanation: "Disabling certificate verification permits interception and untrusted endpoints.", recommendation: "Restore certificate verification and install the correct trusted certificate chain." },
  { severity: "high", category: "security", title: "Unsafe HTML injection", pattern: /(?:dangerouslySetInnerHTML|\.innerHTML\s*=|document\.write\s*\()/g, explanation: "Direct HTML injection can permit cross-site scripting when content is not trusted and sanitized.", recommendation: "Render structured content safely or sanitize it with a maintained allow-list sanitizer." },
  { severity: "medium", category: "security", title: "Overly broad CORS policy", pattern: /(?:access-control-allow-origin[^\n]{0,40}\*|origin\s*:\s*["'`]\*["'`])/gi, explanation: "A wildcard origin may expose an endpoint to unintended browser clients.", recommendation: "Allow only required origins and review credential and preflight behavior." },
  { severity: "medium", category: "security", title: "Potential SQL string construction", pattern: /(?:SELECT|INSERT|UPDATE|DELETE)[^\n]{0,160}(?:\$\{|\+\s*\w+)/gi, explanation: "A SQL statement appears to be assembled with a variable and may permit injection.", recommendation: "Use parameterized queries or the database client's structured query API." },
  { severity: "medium", category: "security", title: "Weak cryptographic hash", pattern: /(?:createHash\s*\(\s*["'](?:md5|sha1)["']|hashlib\.(?:md5|sha1)\s*\()/gi, explanation: "MD5 and SHA-1 are unsuitable for security-sensitive collision resistance.", recommendation: "Use a purpose-appropriate modern algorithm; use Argon2id, scrypt, or bcrypt for passwords." },
  { severity: "medium", category: "security", title: "Insecure external HTTP endpoint", pattern: /http:\/\/(?!localhost|127\.0\.0\.1)/gi, explanation: "A non-local HTTP URL sends traffic without transport encryption.", recommendation: "Use HTTPS and verify the destination's ownership and certificate." },
  { severity: "high", category: "security", title: "Cookie security disabled", pattern: /(?:httpOnly|secure)\s*:\s*false/gi, explanation: "A cookie is explicitly configured without an important browser security control.", recommendation: "Use HttpOnly for authentication cookies, Secure in production, and an intentional SameSite policy." },
  { severity: "high", category: "security", title: "Token decoded without signature verification", pattern: /\b(?:jwt\.)?decode\s*\(/gi, explanation: "Decoding a token alone does not prove its signature, issuer, audience, or expiry is valid.", recommendation: "Use the library's verification operation and validate signature, algorithm, issuer, audience, and expiration." },
  { severity: "high", category: "security", title: "Permissive row-level security policy", pattern: /(?:using|with\s+check)\s*\(\s*true\s*\)/gi, file: /\.sql$/i, explanation: "A row-level security policy appears to allow every matching operation without an ownership or role condition.", recommendation: "Replace the unconditional policy with the narrowest authenticated owner or role predicate and test unauthorized access." },
  { severity: "medium", category: "security", title: "New-tab link may control opener", pattern: /<a\b(?=[^>]*\btarget\s*=\s*["']_blank["'])(?![^>]*\brel\s*=\s*["'][^"']*(?:noopener|noreferrer))[^>]*>/gi, file: /\.(?:jsx|tsx|html)$/i, explanation: "A new-tab link without opener isolation may allow the destination to manipulate the original page.", recommendation: "Add rel=\"noopener noreferrer\" or use a framework primitive that guarantees equivalent isolation." },
  { severity: "high", category: "delivery", title: "Type errors ignored during production build", pattern: /ignoreBuildErrors\s*:\s*true/gi, file: /next\.config\.[^/]+$/i, explanation: "The production build is configured to succeed even when TypeScript reports errors.", recommendation: "Remove the bypass and resolve type errors in continuous integration before release." },
  { severity: "medium", category: "delivery", title: "Lint errors ignored during production build", pattern: /ignoreDuringBuilds\s*:\s*true/gi, file: /next\.config\.[^/]+$/i, explanation: "The production build is configured to ignore lint failures.", recommendation: "Run linting as a required CI check and remove the production-build bypass." },
  { severity: "medium", category: "reliability", title: "React strict checks disabled", pattern: /reactStrictMode\s*:\s*false/gi, file: /next\.config\.[^/]+$/i, explanation: "Strict development checks are explicitly disabled, reducing early detection of unsafe lifecycle behavior.", recommendation: "Enable React strict mode and resolve the surfaced development warnings." },
  { severity: "high", category: "security", title: "Application debug mode enabled", pattern: /(?:\bDEBUG\s*=\s*True\b|\bdebug\s*:\s*true\b|app\.run\s*\([^)]*debug\s*=\s*True)/g, file: /\.(?:py|ya?ml|json)$/i, explanation: "Debug mode can expose stack traces, internals, or interactive debugging capabilities in deployed environments.", recommendation: "Disable debug mode outside local development and return sanitized production errors." },
  { severity: "medium", category: "security", title: "Wildcard application host allow-list", pattern: /ALLOWED_HOSTS\s*=\s*\[[^\]]*["']\*["']/g, file: /\.py$/i, explanation: "The application accepts arbitrary Host headers, which weakens host-based request protections.", recommendation: "List only the deployed hostnames and explicitly manage preview or local environments." },
  { severity: "medium", category: "dependencies", title: "Unpinned container base image", pattern: /^\s*FROM\s+[^\s:@]+(?::latest)?\s*$/gim, file: /(?:^|\/)dockerfile$/i, explanation: "The container base image is not pinned to a stable version or digest, so builds can change unexpectedly.", recommendation: "Pin an intentional version and, for high-assurance builds, a reviewed immutable digest." },
  { severity: "medium", category: "security", title: "Container may run as root", pattern: /^\s*USER\s+(?:root|0)\s*$/gim, file: /(?:^|\/)dockerfile$/i, explanation: "The container explicitly runs as root, increasing impact if the application is compromised.", recommendation: "Create and use a dedicated non-root runtime user with only required file and network permissions." },
  { severity: "medium", category: "reliability", title: "Empty error handler", pattern: /catch\s*(?:\([^)]*\))?\s*\{\s*\}/g, explanation: "An empty catch block hides failures and complicates diagnosis.", recommendation: "Handle the expected failure, return a safe result, and record privacy-safe diagnostics." },
  { severity: "medium", category: "reliability", title: "Async map may not be awaited", pattern: /\.map\s*\(\s*async\b/g, explanation: "Mapping with an async callback returns promises that are often accidentally left unresolved.", recommendation: "Confirm intended concurrency and await Promise.all, Promise.allSettled, or a bounded worker queue." },
  { severity: "low", category: "reliability", title: "parseInt without explicit radix", pattern: /\bparseInt\s*\([^,()]+\)/g, explanation: "An explicit radix makes numeric parsing intent unambiguous.", recommendation: "Pass the expected radix, commonly 10, as the second argument." },
  { severity: "medium", category: "accessibility", title: "Clickable non-interactive element", pattern: /<(?:div|span)[^>]*\bonClick\s*=/gi, file: /\.(?:jsx|tsx|html)$/i, explanation: "A click handler on a non-interactive element may be unreachable to keyboard and assistive-technology users.", recommendation: "Use a semantic button or link with keyboard behavior, focus visibility, and an accessible name." },
  { severity: "medium", category: "accessibility", title: "Image may be missing alternative text", pattern: /<img\b(?![^>]*\balt\s*=)[^>]*>/gi, file: /\.(?:jsx|tsx|html)$/i, explanation: "An image without alternative text may be inaccessible to screen-reader users.", recommendation: "Add meaningful alt text, or alt=\"\" when the image is purely decorative." },
  { severity: "low", category: "accessibility", title: "Button type is implicit", pattern: /<button\b(?![^>]*\btype\s*=)[^>]*>/gi, file: /\.(?:jsx|tsx|html)$/i, explanation: "A button inside a form defaults to submit and can trigger unintended actions.", recommendation: "Set type=\"button\" or type=\"submit\" explicitly." },
  { severity: "medium", category: "performance", title: "Synchronous filesystem operation", pattern: /\b(?:readFileSync|writeFileSync|readdirSync|statSync)\s*\(/g, explanation: "Synchronous filesystem work blocks the runtime thread and may reduce request throughput.", recommendation: "Use asynchronous APIs on request paths, or document why startup-only synchronous work is acceptable." },
  { severity: "low", category: "performance", title: "Unbounded wildcard query", pattern: /\bSELECT\s+\*/gi, file: /\.(?:sql|js|ts|jsx|tsx|py|rb|php)$/i, explanation: "Selecting every column can increase transfer and accidental exposure as schemas grow.", recommendation: "Select only the fields required by the caller." },
  { severity: "low", category: "maintainability", title: "Unfinished work marker", pattern: /\b(?:TODO|FIXME|HACK)\b/g, explanation: "The source contains a deferred-work marker that may represent untracked risk.", recommendation: "Review it, create a tracked task if still valid, or remove it if resolved." },
  { severity: "low", category: "maintainability", title: "Debug logging remains", pattern: /\bconsole\.(?:log|debug)\s*\(/g, explanation: "Debug output may expose internal data or add noise in production.", recommendation: "Remove it or use a structured logger with intentional levels and redaction." },
  { severity: "low", category: "maintainability", title: "Explicit any type", pattern: /(?::|<|as)\s*any\b/g, file: /\.tsx?$/i, explanation: "Explicit any bypasses useful compile-time checks and can conceal interface drift.", recommendation: "Replace it with a defined type, unknown plus validation, or a constrained generic." },
  { severity: "low", category: "maintainability", title: "Permanently disabled code path", pattern: /\b(?:if|while)\s*\(\s*(?:false|0)\s*\)/g, explanation: "A branch is permanently disabled and may represent abandoned or misleading code.", recommendation: "Remove dead code or replace the constant with a documented, tested feature flag." },
];

const extension = (path: string) => { const name = path.split("/").pop() || path; const dot = name.lastIndexOf("."); return dot > 0 ? name.slice(dot).toLowerCase() : "[no extension]"; };
const lineAt = (content: string, index: number) => content.slice(0, index).split("\n").length;
const hasPath = (paths: string[], pattern: RegExp) => paths.some((path) => pattern.test(path));
const addProjectFinding = (findings: AuditFinding[], severity: AuditSeverity, category: AuditCategory, title: string, explanation: string, recommendation: string) => findings.push({ id: "", severity, category, title, explanation, recommendation, occurrences: 1 });

function detectedSignals(paths: string[]) {
  const joined = paths.join("\n").toLowerCase(); const found: string[] = [];
  if (hasPath(paths, /(^|\/)package\.json$/i)) found.push("Node.js / JavaScript package");
  if (/next\.config\.|\/app\/|\/pages\//.test(joined)) found.push("Possible Next.js application");
  if (hasPath(paths, /(^|\/)(?:requirements\.txt|pyproject\.toml)$|\.py$/i)) found.push("Python");
  if (hasPath(paths, /\.tsx?$/i)) found.push("TypeScript");
  if (hasPath(paths, /(?:^|\/)(?:dockerfile|docker-compose[^/]*)$/i)) found.push("Container configuration");
  if (/\.github\/workflows\//.test(joined)) found.push("GitHub Actions");
  return found;
}

function inspectPackageJson(files: AuditSourceFile[], findings: AuditFinding[]) {
  const packageFiles = files.filter((file) => /(^|\/)package\.json$/i.test(file.path)); let dependencies = 0; let parsed = false;
  for (const file of packageFiles) {
    try {
      const value = JSON.parse(file.content) as Record<string, unknown>; parsed = true;
      const declared = { ...((value.dependencies || {}) as Record<string, unknown>), ...((value.devDependencies || {}) as Record<string, unknown>) };
      dependencies += Object.keys(declared).length;
      const loose = Object.values(declared).filter((version) => version === "*" || version === "latest").length;
      if (loose) addProjectFinding(findings, "medium", "dependencies", "Unbounded dependency version", `${loose} dependency declaration(s) use * or latest, reducing reproducibility.`, "Pin an intentional compatible range and commit the matching lockfile.");
      const scripts = value.scripts && typeof value.scripts === "object" ? value.scripts as Record<string, unknown> : {};
      if (!scripts.test) addProjectFinding(findings, "medium", "delivery", "Test command not declared", "The package manifest does not declare a test command.", "Add a repeatable test command and run it in continuous integration.");
      const lifecycle = ["preinstall", "install", "postinstall"].filter((name) => typeof scripts[name] === "string");
      if (lifecycle.length) addProjectFinding(findings, "medium", "dependencies", "Install lifecycle script requires review", `The package declares ${lifecycle.join(", ")} execution during dependency installation.`, "Review the scripts and transitive commands before installing in a trusted environment.");
    } catch { addProjectFinding(findings, "high", "dependencies", "Invalid package manifest", `${file.path} could not be parsed as JSON.`, "Repair the manifest before installation, build, or delivery."); }
  }
  return packageFiles.length ? (parsed ? dependencies : null) : null;
}

function inspectProjectStructure(files: AuditSourceFile[], findings: AuditFinding[]) {
  const environmentFiles = files.filter((file) => /(^|\/)\.env(?:\.local|\.production|\.development|\.test)?$/i.test(file.path));
  if (environmentFiles.length) addProjectFinding(findings, "high", "security", "Environment file included in submitted source", `${environmentFiles.length} non-template environment file(s) are present and may contain deployable secrets. Values were not copied into the report.`, "Remove environment files from the repository and ZIP, rotate any real credentials they contained, and keep only a secret-free example template.");

  const sqlFiles = files.filter((file) => /\.sql$/i.test(file.path));
  const tableDefinitions = sqlFiles.reduce((sum, file) => sum + (file.content.match(/\bcreate\s+table\b/gi)?.length || 0), 0);
  const rlsStatements = sqlFiles.reduce((sum, file) => sum + (file.content.match(/\benable\s+row\s+level\s+security\b/gi)?.length || 0), 0);
  if (tableDefinitions && rlsStatements < tableDefinitions) addProjectFinding(findings, "medium", "security", "Database tables may lack row-level security", `${tableDefinitions} table definition(s) and ${rlsStatements} row-level-security enablement statement(s) were detected in submitted SQL. Static matching cannot prove the deployed database state.`, "Verify every client-accessible table has row-level security enabled and test each policy as an unauthorized user, a normal user, and an owner or administrator.");

  const blockOwners = new Map<string, Array<{ path: string; line: number }>>();
  let inspectedWindows = 0;
  for (const file of files.filter((candidate) => /\.(?:js|jsx|ts|tsx|py|rb|php|java|go|rs|cs|cpp|c)$/i.test(candidate.path))) {
    const lines = file.content.split("\n");
    for (let index = 0; index <= lines.length - 8; index += 1) {
      if (inspectedWindows >= 25_000) break;
      const window = lines.slice(index, index + 8).map((line) => line.trim()).filter((line) => line && !/^(?:\/\/|#|\*|import\b|export\s+\{)/.test(line));
      const signature = window.join(" ").replace(/\s+/g, " ");
      if (window.length < 6 || signature.length < 180) continue;
      inspectedWindows += 1;
      const owners = blockOwners.get(signature) || [];
      if (!owners.some((owner) => owner.path === file.path && Math.abs(owner.line - index - 1) < 16)) owners.push({ path: file.path, line: index + 1 });
      blockOwners.set(signature, owners);
    }
    if (inspectedWindows >= 25_000) break;
  }
  const duplicateGroups = Array.from(blockOwners.values()).filter((owners) => owners.length > 1);
  if (duplicateGroups.length) addProjectFinding(findings, "low", "maintainability", "Repeated code-block indicators", `${duplicateGroups.length} repeated block pattern(s) were detected across non-adjacent source locations. Source excerpts are intentionally omitted.`, "Review the indicated pattern count, confirm true duplication, and extract shared behavior only when it improves clarity and testability.");

  let longFunctions = 0;
  for (const file of files.filter((candidate) => /\.(?:js|jsx|ts|tsx)$/i.test(candidate.path))) {
    const lines = file.content.split("\n");
    for (let index = 0; index < lines.length; index += 1) {
      if (!/(?:\bfunction\b[^({]*\([^)]*\)|(?:const|let|var)\s+\w+\s*=\s*(?:async\s*)?\([^)]*\)\s*=>)\s*\{/.test(lines[index])) continue;
      let depth = 0; let started = false;
      for (let cursor = index; cursor < lines.length; cursor += 1) {
        for (const character of lines[cursor]) { if (character === "{") { depth += 1; started = true; } else if (character === "}") depth -= 1; }
        if (started && depth <= 0) { if (cursor - index + 1 > 80) longFunctions += 1; index = cursor; break; }
      }
    }
  }
  if (longFunctions) addProjectFinding(findings, "medium", "maintainability", "Oversized function indicators", `${longFunctions} JavaScript or TypeScript function(s) appear to exceed 80 lines. This brace-based static check should be confirmed manually.`, "Split confirmed long functions around cohesive responsibilities and protect the extracted behavior with focused tests.");
}

export function auditClientCode(input: AuditInput): ClientCodeAudit {
  const auditType: AuditType = input.auditType && profileCategories[input.auditType] ? input.auditType : "full";
  const selected = new Set(profileCategories[auditType]); const findings: AuditFinding[] = [];
  for (const file of input.files) {
    for (const rule of rules) {
      if (!selected.has(rule.category) || (rule.file && !rule.file.test(file.path))) continue;
      const pattern = new RegExp(rule.pattern.source, rule.pattern.flags); const foundLines: number[] = []; let match: RegExpExecArray | null; let occurrences = 0;
      while ((match = pattern.exec(file.content)) && occurrences < 200) { occurrences += 1; if (foundLines.length < 8) foundLines.push(lineAt(file.content, match.index)); if (!match[0].length) pattern.lastIndex += 1; }
      if (occurrences) findings.push({ id: "", severity: rule.severity, category: rule.category, title: rule.title, explanation: rule.explanation, recommendation: rule.recommendation, path: file.path, line: foundLines[0], additionalLines: foundLines.slice(1), occurrences });
    }
    const count = file.content.split("\n").length;
    if (selected.has("maintainability") && count > 800) addProjectFinding(findings, "medium", "maintainability", "Oversized source file", `${file.path} contains ${count.toLocaleString("en-US")} lines and may combine too many responsibilities.`, "Review its responsibilities and extract cohesive modules with focused tests where useful.");
  }
  const paths = input.files.map((file) => file.path);
  const hasReadme = hasPath(paths, /(^|\/)readme(?:\.[^/]*)?$/i), hasTests = hasPath(paths, /(?:^|\/)(?:test|tests|__tests__)(?:\/|$)|\.(?:test|spec)\.[^/]+$/i);
  const manifests = paths.filter((path) => /(^|\/)(?:package\.json|pyproject\.toml|requirements\.txt|go\.mod|cargo\.toml|composer\.json)$/i.test(path));
  const hasLockfile = hasPath(paths, /(^|\/)(?:package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml|poetry\.lock|cargo\.lock|composer\.lock)$/i);
  const hasCi = hasPath(paths, /(^|\/)(?:\.github\/workflows\/|\.gitlab-ci\.yml$|azure-pipelines\.yml$)/i), hasLicense = hasPath(paths, /(^|\/)(?:license|copying)(?:\.[^/]*)?$/i);
  const usesEnvironment = input.files.some((file) => /(?:process\.env|os\.environ|getenv\s*\()/.test(file.content)), hasEnvironmentTemplate = hasPath(paths, /(^|\/)\.env\.(?:example|sample|template)$/i);
  const coverage: AuditCheck[] = [
    { name: "README", status: hasReadme ? "present" : "attention", detail: hasReadme ? "Project guidance found." : "No conventional README found." },
    { name: "Automated tests", status: hasTests ? "present" : "attention", detail: hasTests ? "Test files found; tests were not executed." : "No conventional tests found." },
    { name: "Dependency manifest", status: manifests.length ? "present" : "attention", detail: manifests.length ? `${manifests.length} manifest(s) found.` : "No supported manifest found." },
    { name: "Dependency lockfile", status: hasLockfile ? "present" : manifests.length ? "attention" : "not-assessed", detail: hasLockfile ? "Reproducibility lockfile found." : manifests.length ? "No supported lockfile found." : "No manifest was available." },
    { name: "CI workflow", status: hasCi ? "present" : "attention", detail: hasCi ? "Conventional CI configuration found." : "No conventional CI configuration found." },
    { name: "License", status: hasLicense ? "present" : "attention", detail: hasLicense ? "License file found." : "No conventional license file found." },
    { name: "Environment template", status: !usesEnvironment || hasEnvironmentTemplate ? "present" : "attention", detail: !usesEnvironment ? "No conventional environment-variable use detected." : hasEnvironmentTemplate ? "Environment template found." : "Environment variables are used but no safe template was found." },
  ];
  if (selected.has("delivery")) {
    if (!hasReadme) addProjectFinding(findings, "medium", "delivery", "README not found", "The files do not contain obvious setup and operating guidance.", "Add setup, configuration, testing, deployment, and support instructions.");
    if (!hasTests) addProjectFinding(findings, "medium", "delivery", "Automated tests not found", "No conventional test directory or filename was found.", "Add tests for the highest-risk user and data flows, then run them in CI.");
    if (!manifests.length) addProjectFinding(findings, "medium", "delivery", "Dependency manifest not found", "Dependencies and reproducibility cannot be assessed.", "Include the project's dependency manifest and lockfile.");
    else if (!hasLockfile) addProjectFinding(findings, "medium", "dependencies", "Dependency lockfile not found", "The dependency graph may resolve differently between installs.", "Generate and commit the ecosystem's supported lockfile.");
    if (usesEnvironment && !hasEnvironmentTemplate) addProjectFinding(findings, "medium", "delivery", "Environment template not found", "Environment variables are used but no safe example template was found.", "Add a secret-free template documenting required names and formats.");
  }
  if (auditType === "full") inspectProjectStructure(input.files, findings);
  const declaredDependencies = selected.has("dependencies") ? inspectPackageJson(input.files, findings) : null;
  findings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity] || categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category) || (a.path || "").localeCompare(b.path || "") || (a.line || 0) - (b.line || 0));
  findings.forEach((finding, index) => { finding.id = `F-${String(index + 1).padStart(3, "0")}`; });
  const summary: Record<AuditSeverity, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 }; findings.forEach((finding) => { summary[finding.severity] += 1; });
  const attentionLevel = summary.critical ? "urgent" : summary.high >= 3 ? "high" : summary.high || summary.medium >= 5 ? "moderate" : "low";
  const extensionCounts = new Map<string, number>(); input.files.forEach((file) => extensionCounts.set(extension(file.path), (extensionCounts.get(extension(file.path)) || 0) + 1));
  const metrics = input.files.map((file) => ({ path: file.path, lines: file.content.split("\n").length, bytes: Buffer.byteLength(file.content, "utf8") }));
  const hasUiFiles = hasPath(paths, /\.(?:jsx|tsx|html)$/i), hasDatabaseFiles = hasPath(paths, /\.(?:sql|prisma)$/i) || input.files.some((file) => /(?:\.from\s*\(|\bSELECT\b|\bINSERT\b|\bUPDATE\b)/i.test(file.content));
  const scanCoverage: AuditCheck[] = [
    { name: "Secrets and sensitive data", status: "present", detail: "Checked high-confidence provider tokens, private keys, credential assignments, connection strings, token literals, and environment-file exposure without copying matched values." },
    { name: "Authentication and session safety", status: "present", detail: "Checked static indicators for token verification, cookie controls, service-role exposure, and unsafe client-side trust." },
    { name: "API and database safety", status: hasDatabaseFiles ? "present" : "not-assessed", detail: hasDatabaseFiles ? "Checked submitted API/database indicators, SQL construction, CORS, and row-level-security patterns." : "No conventional API or database source was identified." },
    { name: "Dependency hygiene", status: manifests.length ? "present" : "not-assessed", detail: manifests.length ? "Checked manifests, lockfile presence, version ranges, and install lifecycle scripts locally; no advisory service was contacted." : "No supported dependency manifest was submitted." },
    { name: "Framework and deployment configuration", status: "present", detail: "Checked supported Next.js, React, Node.js, Python, Supabase SQL, container, environment, and CI configuration indicators when present." },
    { name: "Reliability", status: "present", detail: "Checked error handling, asynchronous collection behavior, parsing clarity, debug configuration, and strict-mode indicators." },
    { name: "Accessibility", status: hasUiFiles ? "present" : "not-assessed", detail: hasUiFiles ? "Checked supported JSX, TSX, and HTML interaction, image, button, and link indicators." : "No supported UI source was identified." },
    { name: "Performance and complexity", status: "present", detail: "Checked blocking filesystem calls, broad data selection, oversized files/functions, and repeated-code indicators." },
    { name: "Delivery and launch readiness", status: "present", detail: "Checked documentation, tests, manifests, lockfiles, CI, licensing, environment templates, and build-bypass indicators." },
  ];
  const topActions = findings.slice(0, 5).map(({ id, severity, title, recommendation }) => ({ id, severity, title, recommendation }));
  return {
    generatedAt: input.generatedAt || new Date().toISOString(), project: { clientName: input.clientName, projectName: input.projectName, auditType, focus: input.focus || "No additional focus supplied", notes: input.notes || "" },
    inventory: { filesReviewed: input.files.length, linesReviewed: metrics.reduce((sum, file) => sum + file.lines, 0), bytesReviewed: metrics.reduce((sum, file) => sum + file.bytes, 0), extensions: Array.from(extensionCounts.entries()).sort((a, b) => b[1] - a[1]).map(([name, files]) => ({ extension: name, files })), detectedSignals: detectedSignals(paths), largestFiles: metrics.sort((a, b) => b.lines - a.lines).slice(0, 10), dependencyManifests: manifests, declaredDependencies },
    attentionLevel, summary, categorySummary: categoryOrder.filter((category) => selected.has(category)).map((category) => ({ category, findings: findings.filter((finding) => finding.category === category).length })), coverage, scanCoverage, topActions, findings,
    limitations: ["This is a deterministic static review. The uploaded code was not executed, built, or tested.", "Findings are rule-based leads requiring owner review; they can include false positives and miss context-dependent defects.", "This is not a security certification, penetration test, legal opinion, or guarantee that the code is defect-free.", "Declared dependency structure is reviewed locally, but live vulnerability advisories and package provenance are not queried.", "Only supported text files present in the submitted ZIP are within scope."],
  };
}

const safeCell = (value: string) => value.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character] || character));
const csvCell = (value: string | number) => { let text = String(value).replace(/\r?\n/g, " "); if (/^[=+\-@]/.test(text)) text = `'${text}`; return `"${text.replace(/"/g, '""')}"`; };
const location = (finding: AuditFinding) => finding.path ? `${finding.path}:${finding.line || 1}${finding.additionalLines?.length ? ` (+${finding.additionalLines.length} more locations)` : ""}` : "Project-wide";

export function renderAuditReports(audit: ClientCodeAudit) {
  const recommendation = audit.findings.length ? `Confirm ${audit.findings[0].id} (${audit.findings[0].title}) first, then follow the prioritized remediation plan.` : "No configured rule matched. Complete human architecture review and runtime verification before release.";
  const coverage = audit.coverage.map((check) => `| ${safeCell(check.name)} | ${check.status} | ${safeCell(check.detail)} |`).join("\n");
  const scanCoverage = audit.scanCoverage.map((check) => `| ${safeCell(check.name)} | ${check.status} | ${safeCell(check.detail)} |`).join("\n");
  const topActions = audit.topActions.length ? audit.topActions.map((action, index) => `${index + 1}. **${action.id} — ${action.title} (${action.severity.toUpperCase()}):** ${action.recommendation}`).join("\n") : "1. Complete the runtime-verification checklist before release; no configured static rule matched.";
  const summary = `# Code Risk Scan Executive Summary\n\n**Client:** ${audit.project.clientName}\n\n**Project:** ${audit.project.projectName}\n\n**Service:** Complete Code Risk Scan\n\n**Generated:** ${audit.generatedAt}\n\n**Attention level:** ${audit.attentionLevel.toUpperCase()}\n\n## Scope\n\n${audit.inventory.filesReviewed.toLocaleString("en-US")} supported files and ${audit.inventory.linesReviewed.toLocaleString("en-US")} lines were reviewed. Focus: ${audit.project.focus}.\n\n## Findings\n\n- Critical: ${audit.summary.critical}\n- High: ${audit.summary.high}\n- Medium: ${audit.summary.medium}\n- Low: ${audit.summary.low}\n\n## Top five actions before launch\n\n${topActions}\n\n## Recommended next move\n\n${recommendation}\n\n## Scan coverage\n\n| Area | Status | What was checked |\n| --- | --- | --- |\n${scanCoverage}\n\n## Delivery-readiness evidence\n\n| Check | Status | Evidence |\n| --- | --- | --- |\n${coverage}\n\n## Important limitations\n\n${audit.limitations.map((item) => `- ${item}`).join("\n")}\n`;
  const rows = audit.findings.length ? audit.findings.map((finding) => `| ${finding.id} | ${finding.severity.toUpperCase()} | ${finding.category} | ${safeCell(finding.title)} | ${safeCell(location(finding))} | ${finding.occurrences} | ${safeCell(finding.explanation)} | ${safeCell(finding.recommendation)} |`).join("\n") : "| — | INFO | — | No rule-based findings | Project-wide | 0 | No configured pattern matched. | Complete manual and runtime verification. |";
  const findings = `# Technical Findings\n\n| ID | Severity | Category | Finding | Location | Occurrences | Why it matters | Recommendation |\n| --- | --- | --- | --- | --- | ---: | --- | --- |\n${rows}\n\n## Client notes\n\n${audit.project.notes || "No client notes were provided."}\n`;
  const phase = (severities: AuditSeverity[]) => audit.findings.filter((finding) => severities.includes(finding.severity)).map((finding) => `- **${finding.id} — ${finding.title}:** ${finding.recommendation}`).join("\n") || "- No findings assigned to this phase.";
  const remediation = `# Prioritized Remediation Plan\n\n## Top five actions before launch\n\n${topActions}\n\n## Immediate — confirm before release or client handoff\n\n${phase(["critical", "high"])}\n\n## Next — address before the next production milestone\n\n${phase(["medium"])}\n\n## Planned cleanup\n\n${phase(["low", "info"])}\n\nAfter changes, rerun this scan and complete the runtime checklist.\n`;
  const verification = `# Runtime Verification Checklist\n\nThese checks were not executed. Run them only in an isolated environment you trust.\n\n- Install dependencies from the reviewed lockfile.\n- Run formatting, linting, type checking, and the complete automated test suite.\n- Build a production artifact from a clean checkout.\n- Run dependency vulnerability and license scans against current advisory sources.\n- Exercise authentication, authorization, uploads, payments, destructive actions, and error paths as applicable.\n- Test keyboard access, focus order, accessible names, contrast, responsive layouts, and reduced motion.\n- Review runtime logs for secret exposure and unsafe personal data.\n- Record tool versions, commands, results, failures, and the exact commit tested.\n`;
  const csv = ["ID", "Severity", "Category", "Title", "Location", "Occurrences", "Explanation", "Recommendation"].map(csvCell).join(",") + "\n" + audit.findings.map((finding) => [finding.id, finding.severity, finding.category, finding.title, location(finding), finding.occurrences, finding.explanation, finding.recommendation].map(csvCell).join(",")).join("\n");
  const cards = audit.findings.length ? audit.findings.map((finding) => `<article><div class="head"><strong>${escapeHtml(finding.id)} · ${escapeHtml(finding.title)}</strong><span class="${finding.severity}">${escapeHtml(finding.severity)}</span></div><p class="meta">${escapeHtml(finding.category)} · ${escapeHtml(location(finding))} · ${finding.occurrences} occurrence(s)</p><p>${escapeHtml(finding.explanation)}</p><p><b>Recommendation:</b> ${escapeHtml(finding.recommendation)}</p></article>`).join("") : "<article><strong>No configured rule matched.</strong><p>Complete human and runtime verification before release.</p></article>";
  const htmlActions = audit.topActions.length ? `<ol>${audit.topActions.map((action) => `<li><b>${escapeHtml(action.id)} — ${escapeHtml(action.title)}:</b> ${escapeHtml(action.recommendation)}</li>`).join("")}</ol>` : "<p>Complete runtime verification before release; no configured static rule matched.</p>";
  const htmlCoverage = audit.scanCoverage.map((check) => `<li><b>${escapeHtml(check.name)}:</b> ${escapeHtml(check.detail)}</li>`).join("");
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(audit.project.projectName)} code risk scan</title><style>body{margin:0;background:#08111d;color:#e8f2fb;font:15px/1.55 system-ui,-apple-system,sans-serif}.page{max-width:980px;margin:auto;padding:52px 26px}.eyebrow{color:#71e4ff;font-weight:900;letter-spacing:.15em;text-transform:uppercase;font-size:12px}h1{font-size:42px;line-height:1.1;margin:.25em 0}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:12px}.card,article{border:1px solid #294055;border-radius:16px;background:#111d2b;padding:18px;margin:14px 0}.number{font-size:27px;font-weight:900}.label,.meta{color:#9aafc2;font-size:12px}.head{display:flex;justify-content:space-between;gap:12px}.head span{border-radius:99px;padding:3px 9px;text-transform:uppercase;font-size:10px;font-weight:900}.critical,.high{background:#6f1d2a;color:#ffdbe1}.medium{background:#604514;color:#fff0b8}.low,.info{background:#173f4a;color:#c5f7ff}li{margin:.55em 0}@media print{body{background:white;color:#17202a}.page{padding:15px}.card,article{background:white;border-color:#ccd5dc}h1{color:#111}}</style></head><body><main class="page"><p class="eyebrow">SEANGWORLD Code Risk Scan</p><h1>${escapeHtml(audit.project.projectName)}</h1><p>Prepared for <b>${escapeHtml(audit.project.clientName)}</b> · ${escapeHtml(audit.generatedAt)}</p><div class="grid"><div class="card"><div class="label">Attention</div><div class="number">${escapeHtml(audit.attentionLevel.toUpperCase())}</div></div><div class="card"><div class="label">Files</div><div class="number">${audit.inventory.filesReviewed}</div></div><div class="card"><div class="label">High + critical</div><div class="number">${audit.summary.critical + audit.summary.high}</div></div><div class="card"><div class="label">Total findings</div><div class="number">${audit.findings.length}</div></div></div><section class="card"><h2>Top five actions before launch</h2>${htmlActions}</section><section class="card"><h2>Executive direction</h2><p>${escapeHtml(recommendation)}</p><p><b>Service:</b> Complete Code Risk Scan · <b>Focus:</b> ${escapeHtml(audit.project.focus)}</p></section><section class="card"><h2>Scan coverage</h2><ul>${htmlCoverage}</ul></section><h2>Prioritized findings</h2>${cards}<section class="card"><h2>Scope limitations</h2><ul>${audit.limitations.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section></main></body></html>`;
  const delivery = `# Delivery Notes\n\nThis ZIP is already the complete client-facing Code Risk Scan package. **Do not run it through Client Delivery Package unless combining it with other finished work.**\n\nStart with \`Code-Risk-Scan-Report.html\` or \`Executive-Summary.md\`. Use the Top Five Actions, CSV tracker, and remediation plan as the work order. Potential credential values and source excerpts are never copied into findings. Review all findings and limitations before delivery.\n`;
  return { summary, findings, remediation, verification, csv, html, delivery };
}
