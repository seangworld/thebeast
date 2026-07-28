import Link from "next/link";
import {
  digitalProfessionals,
  digitalProfessionalStatusStyles,
} from "@/lib/digitalStaff";

export default function DigitalStaffPage() {
  const director = digitalProfessionals.find((item) => item.id === "fusion-director")!;
  const team = digitalProfessionals.filter((item) => item.id !== director.id);

  const Card = ({ id }: { id: string }) => {
    const professional = digitalProfessionals.find((item) => item.id === id)!;
    return (
      <Link
        href={professional.href}
        className="block min-w-0 rounded-2xl border border-white/10 bg-[#111827] p-5 transition hover:border-cyan-300/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300"
      >
        <div aria-hidden="true" className="grid h-14 w-14 place-items-center rounded-full bg-cyan-300/10 text-lg font-black text-cyan-200">
          {professional.name.split(" ").map((part) => part[0]).join("")}
        </div>
        <h2 className="mt-4 text-xl font-black text-white">{professional.name}</h2>
        <p className="mt-1 text-sm font-bold text-cyan-200">{professional.role}</p>
        <span className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-bold ${digitalProfessionalStatusStyles[professional.status]}`}>
          {professional.statusLabel}
        </span>
        <p className="mt-4 text-sm leading-6 text-slate-300">{professional.mission}</p>
      </Link>
    );
  };

  return (
    <main className="beast-page">
      <div className="beast-container space-y-8">
        <header>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">BeastOS Digital Staff</p>
          <h1 className="mt-2 text-4xl font-black text-white">Your Digital Professionals</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
            Meet the professionals who explain, recommend, and coordinate within explicit permissions. A status label always accompanies color, and planned roles are never presented as operational.
          </p>
        </header>

        <section aria-labelledby="organization-heading">
          <h2 id="organization-heading" className="text-2xl font-black text-white">Organization chart</h2>
          <div className="mx-auto mt-6 max-w-xl"><Card id={director.id} /></div>
          <div aria-hidden="true" className="mx-auto h-8 w-px bg-white/20" />
          <div className="grid gap-4 md:grid-cols-3">
            {team.map((professional) => <Card key={professional.id} id={professional.id} />)}
          </div>
        </section>
      </div>
    </main>
  );
}
