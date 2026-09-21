import { homeStudioRoomGeometry, type HomeStudioProject } from "@/lib/homeStudio";

export function HomeStudioFloorPlan({ project }: { project: HomeStudioProject }) {
  const geometry = homeStudioRoomGeometry(project);
  if (!geometry) return null;
  const { x, y, drawingWidth, drawingHeight } = geometry;
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
      <rect x={x} y={y} width={drawingWidth} height={drawingHeight} fill="#0f172a" stroke="#e2e8f0" strokeWidth="4" />
      <text x="360" y="70" textAnchor="middle" fill="#cbd5e1">North wall</text>
      <text x="360" y="420" textAnchor="middle" fill="#cbd5e1">South wall</text>
      <text x="115" y="245" textAnchor="middle" transform="rotate(-90 115 245)" fill="#cbd5e1">West wall</text>
      <text x="605" y="245" textAnchor="middle" transform="rotate(90 605 245)" fill="#cbd5e1">East wall</text>
      <line x1={x} y1="455" x2={x + drawingWidth} y2="455" stroke="#67e8f9" markerStart="url(#home-studio-arrow)" markerEnd="url(#home-studio-arrow)" />
      <text x="360" y="482" textAnchor="middle" fill="#a5f3fc">{project.roomLength} {unit}</text>
      <line x1="75" y1={y} x2="75" y2={y + drawingHeight} stroke="#67e8f9" markerStart="url(#home-studio-arrow)" markerEnd="url(#home-studio-arrow)" />
      <text x="45" y="245" textAnchor="middle" transform="rotate(-90 45 245)" fill="#a5f3fc">{project.roomWidth} {unit}</text>

    </svg>
    <p className="mt-3 text-sm font-bold text-cyan-100">Proportional room outline · {geometry.length} × {geometry.width} {unit} · {geometry.area} square {project.measurementUnit}</p>
    {walls.length ? <dl className="mt-4 grid gap-3 sm:grid-cols-2">{walls.map(([label, value]) => <div key={label} className="rounded-lg border border-[#334155] p-3"><dt className="text-xs font-black uppercase text-cyan-200">{label}</dt><dd className="mt-1 text-sm leading-6 text-[#cbd5e1]">{value}</dd></div>)}</dl> : null}
    <p className="mt-4 text-xs leading-5 text-[#94a3b8]">The room rectangle follows your length-to-width ratio. Wall directions are your labels, not geographic north. Doors, windows, and furniture are notes only; verify fit and clearances on site. This is not a construction drawing.</p>
  </div>;
}
