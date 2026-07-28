import Link from "next/link";
import {
  digitalProfessionalStatusStyles,
  getDigitalProfessionalInitials,
  type DigitalProfessional,
} from "@/lib/digitalStaff";

export function DigitalProfessionalPortraitPlaceholder({
  professional,
  size = "card",
}: {
  professional: DigitalProfessional;
  size?: "card" | "profile";
}) {
  return (
    <div
      role="img"
      aria-label={`Portrait placeholder for ${professional.name}`}
      data-portrait-reference={professional.portrait.placeholder_reference}
      data-portrait-source={professional.portrait.source}
      className={`grid shrink-0 place-items-center rounded-full border border-cyan-300/20 bg-cyan-300/10 font-black text-cyan-100 ${
        size === "profile" ? "h-24 w-24 text-2xl" : "h-14 w-14 text-lg"
      }`}
    >
      {getDigitalProfessionalInitials(professional)}
    </div>
  );
}

export function DigitalProfessionalStatusBadge({
  professional,
}: {
  professional: DigitalProfessional;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${digitalProfessionalStatusStyles[professional.status]}`}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
      {professional.statusLabel}
    </span>
  );
}

export function DigitalProfessionalCard({
  professional,
}: {
  professional: DigitalProfessional;
}) {
  return (
    <Link
      href={professional.href}
      className="block min-w-0 rounded-2xl border border-white/10 bg-[#111827] p-5 transition hover:border-cyan-300/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300"
      aria-label={`View ${professional.name}, ${professional.role}`}
    >
      <div className="flex items-start justify-between gap-4">
        <DigitalProfessionalPortraitPlaceholder professional={professional} />
        <span className="text-xs font-bold text-slate-500">
          v{professional.version}
        </span>
      </div>
      <h2 className="mt-4 text-xl font-black text-white">
        {professional.name}
      </h2>
      <p className="mt-1 text-sm font-bold text-cyan-200">
        {professional.role}
      </p>
      <p className="mt-1 text-xs leading-5 text-slate-400">
        {professional.title}
      </p>
      <div className="mt-3">
        <DigitalProfessionalStatusBadge professional={professional} />
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-300">
        {professional.mission}
      </p>
      <dl className="mt-4 grid gap-2 border-t border-white/10 pt-4 text-xs">
        <div className="flex items-start justify-between gap-3">
          <dt className="text-slate-500">Reports to</dt>
          <dd className="text-right font-bold text-slate-200">
            {professional.reportsTo}
          </dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="text-slate-500">Collaborates with</dt>
          <dd className="text-right font-bold text-slate-200">
            {professional.collaboratesWith.length}{" "}
            {professional.collaboratesWith.length === 1
              ? "professional"
              : "professionals"}
          </dd>
        </div>
      </dl>
    </Link>
  );
}
