export const operationsVentures = [
  { name: "The Beast", href: "/dashboard/operations/beast", description: "Memberships, product growth, support, and the Beast package.", tag: "Member products" },
  { name: "BeastMarketing / Media", href: "/dashboard/operations/marketing", description: "Video production, channels, advertising, and campaigns.", tag: "Media & growth" },
  { name: "KDP / Publishing", href: "/dashboard/operations/publishing", description: "Book opportunities, production, quality review, and publishing approvals.", tag: "Publishing" },
  { name: "SEANGWORLD News", href: "/dashboard/operations/news", description: "Coverage, sources, audience, and news operations.", tag: "News" },
  { name: "SEANGWORLD.com", href: "/dashboard/operations/company", description: "The company website and its connected business tools.", tag: "Company" },
  { name: "Change the World", href: "/dashboard/operations/change-the-world", description: "Review the initiative and its current operating capabilities.", tag: "Initiative" },
] as const;

export const operationsLinks = [
  { label: "ATLAS", href: "/dashboard/operations/atlas", group: "Owner" },
  { label: "Overview", href: "/dashboard/operations", group: "Owner" },
  { label: "Production", href: "/dashboard/operations/production", group: "Owner" },
  { label: "Executive briefing", href: "/dashboard/operations/briefing", group: "Owner" },
  { label: "Costs & finances", href: "/dashboard/operations/finances", group: "Owner" },
  { label: "Revenue", href: "/dashboard/operations/revenue", group: "Owner" },
  ...operationsVentures.map((venture) => ({ label: venture.name, href: venture.href, group: "Ventures" })),
  { label: "Opportunities", href: "/dashboard/operations/opportunities", group: "Shared services" },
  { label: "Company analytics", href: "/dashboard/operations/analytics", group: "Shared services" },
  { label: "Agents & approvals", href: "/dashboard/operations/staff", group: "Shared services" },
  { label: "BeastFusion", href: "/dashboard/operations/fusion", group: "Shared services" },
];

export function isOwnerWorkspacePath(pathname: string) {
  return ["/dashboard/admin", "/dashboard/operations"].some((root) => pathname === root || pathname.startsWith(`${root}/`));
}

export function isOperationsLinkActive(pathname: string, href: string) {
  return pathname === href || (href !== "/dashboard/operations" && pathname.startsWith(`${href}/`));
}
