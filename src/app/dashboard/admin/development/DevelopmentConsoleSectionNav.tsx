import Link from "next/link";

export const developmentConsoleSections = [
  { id: "overview", label: "Overview" },
  { id: "agents", label: "Agents" },
  { id: "proposals", label: "Proposals" },
  { id: "execution", label: "Execution" },
  { id: "releases", label: "Releases" },
  { id: "dependencies", label: "Dependencies" },
  { id: "history", label: "History" },
  { id: "governance", label: "Governance" },
] as const;

export function DevelopmentConsoleSectionNav() {
  return (
    <nav
      aria-label="Development Console sections"
      className="sticky top-3 z-20 rounded-2xl border border-amber-300/20 bg-[#0b1220]/95 p-2 shadow-xl shadow-black/20 backdrop-blur"
    >
      <div className="flex gap-2 overflow-x-auto overscroll-x-contain" data-development-section-navigation="true">
        {developmentConsoleSections.map((section) => (
          <Link
            key={section.id}
            href={`#${section.id}`}
            className={`inline-flex min-h-10 shrink-0 items-center rounded-xl border px-3 text-sm font-black transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200 ${
              section.id === "agents" || section.id === "proposals"
                ? "border-amber-300/30 bg-amber-300/10 text-amber-100 hover:bg-amber-300/15"
                : "border-white/10 text-slate-300 hover:border-white/20 hover:text-white"
            }`}
          >
            {section.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
