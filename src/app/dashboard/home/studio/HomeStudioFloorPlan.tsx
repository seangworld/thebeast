import type { HomeStudioProject } from "@/lib/homeStudio";

export function HomeStudioFloorPlan({ project }: { project: HomeStudioProject }) {
  if (!project.roomLength || !project.roomWidth) return null;
  const unit = project.measurementUnit === "meters" ? "m" : "ft";
  const walls = [
    ["North wall", project.northWall],
    ["East wall", project.eastWall],
    ["South wall", project.southWall],
    ["West wall", project.westWall],
  ].filter((entry) => entry[1]);
  return <div className="mt-5 rounded-xl border border-[#334155] bg-[#111827] p-4">
    <svg viewBox="0 0 720 500" role="img" aria-label="Dimensioned top-down room-planning outline" className="mx-auto block w-full max-w-3xl">
      <defs><marker id="home-studio-arrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" fill="#67e8f9" /></marker></defs>
      <rect x="150" y="90" width="420" height="300" fill="#0f172a" stroke="#e2e8f0" strokeWidth="8" />
      <text x="360" y="70" textAnchor="middle" fill="#cbd5e1">North wall</text>
      <text x="360" y="420" textAnchor="middle" fill="#cbd5e1">South wall</text>
      <text x="115" y="245" textAnchor="middle" transform="rotate(-90 115 245)" fill="#cbd5e1">West wall</text>
      <text x="605" y="245" textAnchor="middle" transform="rotate(90 605 245)" fill="#cbd5e1">East wall</text>
      <line x1="150" y1="455" x2="570" y2="455" stroke="#67e8f9" markerStart="url(#home-studio-arrow)" markerEnd="url(#home-studio-arrow)" />
      <text x="360" y="482" textAnchor="middle" fill="#a5f3fc">{project.roomLength} {unit}</text>
      <line x1="75" y1="90" x2="75" y2="390" stroke="#67e8f9" markerStart="url(#home-studio-arrow)" markerEnd="url(#home-studio-arrow)" />
      <text x="45" y="245" textAnchor="middle" transform="rotate(-90 45 245)" fill="#a5f3fc">{project.roomWidth} {unit}</text>
      <text x="360" y="235" textAnchor="middle" fill="#e2e8f0" fontSize="18">Planning outline — verify on site</text>
    </svg>
    {walls.length ? <dl className="mt-4 grid gap-3 sm:grid-cols-2">{walls.map(([label, value]) => <div key={label} className="rounded-lg border border-[#334155] p-3"><dt className="text-xs font-black uppercase text-cyan-200">{label}</dt><dd className="mt-1 text-sm leading-6 text-[#cbd5e1]">{value}</dd></div>)}</dl> : null}
    <p className="mt-4 text-xs leading-5 text-[#94a3b8]">This diagram records the supplied overall dimensions and wall notes. It is not automatically scaled to door, window, or furniture positions and is not a construction drawing.</p>
  </div>;
}
