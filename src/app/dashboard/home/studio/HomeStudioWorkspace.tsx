"use client";

import Image from "next/image";
import { useRef, useState, type ChangeEvent } from "react";
import {
  DashboardCard,
  GuidedEmptyState,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import {
  HOME_STUDIO_MAX_IMAGE_BYTES,
  homeStudioRetailerLinks,
  homeStudioRoomTypes,
  homeStudioStyles,
  type HomeStudioInput,
  type HomeStudioPlan,
} from "@/lib/homeStudio";

const initialForm: Omit<HomeStudioInput, "image"> = {
  roomName: "",
  roomType: "Living room",
  dimensions: "",
  style: "Modern",
  colors: "",
  budget: "",
  mustKeep: "",
  needs: "",
  openings: "",
  notes: "",
};

const inputClass = "mt-2 w-full rounded-xl border border-[#334155] bg-[#0f172a] px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <label className="block text-sm font-semibold text-[#e2e8f0]">
    {label}
    {hint ? <span className="ml-2 font-normal text-[#94a3b8]">{hint}</span> : null}
    {children}
  </label>;
}

function TextList({ items }: { items: string[] }) {
  return <ul className="mt-3 space-y-2 text-sm leading-6 text-[#dbe3ef]">
    {items.map((item, index) => <li key={`${item}-${index}`} className="flex gap-2"><span aria-hidden="true" className="text-cyan-300">•</span><span>{item}</span></li>)}
  </ul>;
}

function downloadData(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

export function HomeStudioWorkspace() {
  const [form, setForm] = useState(initialForm);
  const [image, setImage] = useState("");
  const [imageName, setImageName] = useState("");
  const [plan, setPlan] = useState<HomeStudioPlan | null>(null);
  const [conceptImage, setConceptImage] = useState("");
  const [message, setMessage] = useState("");
  const [planning, setPlanning] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const busy = planning || rendering;

  const completedBasics = [image, form.roomName, form.roomType, form.style].filter(Boolean).length;

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm(current => ({ ...current, [key]: value }));
    setPlan(null);
    setConceptImage("");
    setConfirmed(false);
  }

  function selectPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!(["image/jpeg", "image/png", "image/webp"].includes(file.type)) || file.size > HOME_STUDIO_MAX_IMAGE_BYTES) {
      setMessage("Choose one JPG, PNG, or WebP room photo up to 3 MB.");
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImage(String(reader.result));
      setImageName(file.name);
      setPlan(null);
      setConceptImage("");
      setConfirmed(false);
      setMessage("Photo ready. It remains in this browser until you request a plan or concept.");
    };
    reader.onerror = () => setMessage("That photo could not be read. Try another image.");
    reader.readAsDataURL(file);
  }

  async function createPlan() {
    if (busy) return;
    if (!image || !form.roomName.trim() || !form.roomType || !form.style) {
      setMessage("Add a room photo, room name, room type, and preferred style first.");
      return;
    }
    setPlanning(true);
    setMessage("Reviewing the room and preparing a design plan…");
    setPlan(null);
    setConceptImage("");
    setConfirmed(false);
    try {
      const response = await fetch("/api/home/studio/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, image }),
      });
      const body = await response.json() as { plan?: HomeStudioPlan; notice?: string; error?: string };
      if (!response.ok || !body.plan) setMessage(body.error || "The design plan could not be prepared.");
      else {
        setPlan(body.plan);
        setMessage(body.notice || "Design plan ready for your review.");
      }
    } catch {
      setMessage("The design plan could not be prepared. Your form and photo remain in this browser.");
    } finally {
      setPlanning(false);
    }
  }

  async function generateConcept() {
    if (!plan || !confirmed || busy) return;
    setRendering(true);
    setMessage("Generating one visual concept from the reviewed plan…");
    try {
      const response = await fetch("/api/home/studio/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image, prompt: plan.conceptPrompt, confirmed: true }),
      });
      const body = await response.json() as { image?: string; notice?: string; error?: string };
      if (!response.ok || !body.image) setMessage(body.error || "The concept image could not be generated.");
      else {
        setConceptImage(body.image);
        setMessage(body.notice || "Concept image ready.");
      }
    } catch {
      setMessage("The concept image could not be generated. Your plan remains available.");
    } finally {
      setRendering(false);
    }
  }

  function reset() {
    if (busy) return;
    setForm(initialForm);
    setImage("");
    setImageName("");
    setPlan(null);
    setConceptImage("");
    setConfirmed(false);
    setMessage("New room started. The previous photo and unsaved plan were cleared from this browser.");
    if (fileInput.current) fileInput.current.value = "";
  }

  function downloadPacket() {
    if (!plan) return;
    const { image: _image, ...project } = { ...form, image };
    downloadData(
      `${form.roomName.trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "home-studio"}-design-plan.json`,
      JSON.stringify({ project, plan, createdAt: new Date().toISOString(), boundary: "AI planning concept; verify measurements, fit, safety, prices, and availability." }, null, 2),
      "application/json",
    );
  }

  return <div className="space-y-6">
    <DashboardCard accent="home">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <SectionHeader
          eyebrow="BeastHome · Home Studio"
          title="Design one room from what you actually have"
          description="Add a room photo, measurements, preferences, and must-keep items. Review the plan before choosing whether to generate a visual concept."
        />
        <div className="shrink-0 rounded-xl border border-[#334155] bg-[#0f172a] px-4 py-3 text-sm text-[#cbd5e1]">
          <strong className="text-white">Setup {completedBasics}/4</strong>
          <div>Photo · name · room · style</div>
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {["1. Describe the room", "2. Review the plan", "3. Generate or shop"].map((step, index) => <div key={step} className={`rounded-xl border p-3 text-sm font-bold ${index === 0 || plan || (index === 2 && conceptImage) ? "border-cyan-500/60 bg-cyan-950/20 text-cyan-100" : "border-[#334155] bg-[#111827] text-[#94a3b8]"}`}>{step}</div>)}
      </div>
    </DashboardCard>

    <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]" aria-label="Home Studio project setup">
      <DashboardCard accent="home">
        <SectionHeader eyebrow="Room photo" title="Show the starting point" description="Use a clear photo without people, mail, screens, family pictures, or sensitive documents." />
        <div className="mt-5">
          {image ? <div className="overflow-hidden rounded-2xl border border-[#334155] bg-black">
            <Image src={image} alt={`Selected photo for ${form.roomName || "the room"}`} width={1200} height={800} unoptimized className="h-auto max-h-[440px] w-full object-contain" />
          </div> : <GuidedEmptyState title="No room photo selected" description="The photo is used only for the plan and optional concept request in this browser session." guidance="JPG, PNG, or WebP up to 3 MB. Home Studio does not add it to your inventory or Beast Documents." nextAction={{ label: "Choose a room photo", href: "#home-studio-photo" }} />}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label id="home-studio-photo" className="beast-button-secondary cursor-pointer">
              {image ? "Replace photo" : "Choose room photo"}
              <input ref={fileInput} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={selectPhoto} disabled={busy} />
            </label>
            {imageName ? <span className="max-w-full truncate text-xs text-[#94a3b8]">{imageName}</span> : null}
          </div>
        </div>
      </DashboardCard>

      <DashboardCard accent="beastos">
        <SectionHeader eyebrow="Room brief" title="Tell Home Studio what must work" description="Exact measurements and honest constraints produce a more useful concept. Leave unknowns blank instead of guessing." />
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="Project or room name"><input className={inputClass} value={form.roomName} maxLength={80} placeholder="My office" onChange={event => update("roomName", event.target.value)} /></Field>
          <Field label="Room type"><select className={inputClass} value={form.roomType} onChange={event => update("roomType", event.target.value)}>{homeStudioRoomTypes.map(type => <option key={type}>{type}</option>)}</select></Field>
          <Field label="Measurements" hint="optional"><input className={inputClass} value={form.dimensions} maxLength={200} placeholder="12 ft × 13 ft; 8 ft ceiling" onChange={event => update("dimensions", event.target.value)} /></Field>
          <Field label="Preferred style"><select className={inputClass} value={form.style} onChange={event => update("style", event.target.value)}>{homeStudioStyles.map(style => <option key={style}>{style}</option>)}</select></Field>
          <Field label="Colors or palette" hint="optional"><input className={inputClass} value={form.colors} maxLength={300} placeholder="Warm white, walnut, black accents" onChange={event => update("colors", event.target.value)} /></Field>
          <Field label="Working budget" hint="optional"><input className={inputClass} value={form.budget} maxLength={80} placeholder="$1,000 total or use what I own" onChange={event => update("budget", event.target.value)} /></Field>
          <Field label="Furniture or features to keep" hint="optional"><textarea className={`${inputClass} min-h-24`} value={form.mustKeep} maxLength={800} placeholder="Desk, futon, wall-mounted TV…" onChange={event => update("mustKeep", event.target.value)} /></Field>
          <Field label="What the room needs to accomplish" hint="optional"><textarea className={`${inputClass} min-h-24`} value={form.needs} maxLength={800} placeholder="Work, gaming, guest seating, better cable control…" onChange={event => update("needs", event.target.value)} /></Field>
          <Field label="Windows, doors, and fixed openings" hint="optional"><textarea className={`${inputClass} min-h-24`} value={form.openings} maxLength={500} placeholder="Door opens inward on right; window centered on back wall…" onChange={event => update("openings", event.target.value)} /></Field>
          <Field label="Other constraints or ideas" hint="optional"><textarea className={`${inputClass} min-h-24`} value={form.notes} maxLength={1200} placeholder="Pets, accessibility, lighting, storage, items to avoid…" onChange={event => update("notes", event.target.value)} /></Field>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <button className="beast-button-primary" type="button" disabled={busy} onClick={() => void createPlan()}>{planning ? "Preparing design plan…" : plan ? "Rebuild design plan" : "Create design plan"}</button>
          <button className="beast-button-secondary" type="button" disabled={busy} onClick={reset}>Start a new room</button>
        </div>
        {message ? <p className="mt-4 rounded-xl border border-[#334155] bg-[#0f172a] p-3 text-sm text-[#dbe3ef]" role="status" aria-live="polite">{message}</p> : null}
      </DashboardCard>
    </section>

    {plan ? <section className="space-y-6" aria-labelledby="home-studio-plan-title">
      <DashboardCard accent="home">
        <SectionHeader eyebrow="Review before generating" title={plan.title} description={plan.summary} />
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <div className="rounded-xl border border-[#334155] bg-[#111827] p-4"><h3 className="font-black text-white">Visible starting point</h3><TextList items={plan.observedRoom} /></div>
          <div className="rounded-xl border border-amber-700/60 bg-amber-950/10 p-4"><h3 className="font-black text-amber-100">Assumptions to verify</h3><TextList items={plan.assumptions.length ? plan.assumptions : ["No additional assumptions were recorded."]} /></div>
        </div>
        <div className="mt-6"><h3 className="font-black text-white">Suggested palette</h3><div className="mt-3 flex flex-wrap gap-3">{plan.palette.map(color => <div key={`${color.name}-${color.hex}`} className="flex items-center gap-2 rounded-full border border-[#334155] bg-[#111827] py-2 pl-2 pr-4 text-sm"><span className="h-7 w-7 rounded-full border border-white/20" style={{ backgroundColor: color.hex }} aria-hidden="true" /><span>{color.name}</span><span className="text-[#94a3b8]">{color.hex}</span></div>)}</div></div>
      </DashboardCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardCard accent="home"><SectionHeader eyebrow="Placement" title="Layout plan" description="Use measurements to verify every clearance before moving or purchasing anything." /><TextList items={plan.layoutPlan} /></DashboardCard>
        <DashboardCard accent="beastos"><SectionHeader eyebrow="Look and feel" title="Design moves" description="A practical sequence for changing the room without treating the concept as a construction drawing." /><TextList items={plan.designMoves} /></DashboardCard>
      </div>

      <DashboardCard accent="home">
        <SectionHeader eyebrow="Shopping targets" title="Shop the plan without locking into one retailer" description="These are generic search starting points, not live inventory, exact-fit promises, endorsements, or affiliate links yet." />
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {plan.shoppingList.map((item, index) => <article key={`${item.item}-${index}`} className="rounded-xl border border-[#334155] bg-[#111827] p-4">
            <div className="flex items-start justify-between gap-3"><div><h3 className="font-black text-white">{item.item}</h3><p className="mt-1 text-sm leading-6 text-[#cbd5e1]">{item.purpose}</p></div><span className="rounded-full border border-cyan-700 bg-cyan-950/30 px-2.5 py-1 text-xs font-bold text-cyan-100">{item.priority}</span></div>
            <p className="mt-3 text-sm"><strong>Planning range:</strong> {item.targetPrice}</p>
            <details className="mt-3"><summary className="cursor-pointer text-sm font-bold text-cyan-300">Search retailers</summary><div className="mt-3 flex flex-wrap gap-2">{homeStudioRetailerLinks(item.searchTerms).map(retailer => <a key={retailer.label} href={retailer.href} target="_blank" rel="noopener noreferrer" className="beast-button-secondary text-xs">{retailer.label}</a>)}</div></details>
          </article>)}
        </div>
      </DashboardCard>

      <DashboardCard accent="beastos">
        <SectionHeader eyebrow="Reality check" title="Verify before acting" description="Home Studio organizes a concept; it does not inspect the property or replace qualified local help." />
        <TextList items={plan.cautions} />
        <div className="mt-5 flex flex-wrap gap-3"><button type="button" className="beast-button-secondary" onClick={downloadPacket}>Download design plan</button><button type="button" className="beast-button-secondary" onClick={() => window.print()}>Print plan</button></div>
      </DashboardCard>

      <DashboardCard accent="home">
        <SectionHeader eyebrow="Optional paid provider action" title="Generate one visual concept" description="This sends the room photo and reviewed concept prompt to the configured image provider and consumes one image-generation request. It does not purchase products or save the image to BeastHome." />
        <label className="mt-5 flex items-start gap-3 rounded-xl border border-[#334155] bg-[#111827] p-4 text-sm leading-6 text-[#dbe3ef]"><input type="checkbox" className="mt-1" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} /><span>I reviewed the plan and understand that the visual is an AI concept—not an exact measurement, construction drawing, appraisal, inspection, price quote, or product-availability guarantee.</span></label>
        <button type="button" className="beast-button-primary mt-4" disabled={!confirmed || busy} onClick={() => void generateConcept()}>{rendering ? "Generating concept…" : conceptImage ? "Generate another concept" : "Generate visual concept"}</button>
        {conceptImage ? <div className="mt-6"><div className="overflow-hidden rounded-2xl border border-[#334155] bg-black"><Image src={conceptImage} alt={`AI Home Studio concept for ${form.roomName}`} width={1536} height={1024} unoptimized className="h-auto w-full object-contain" /></div><button type="button" className="beast-button-secondary mt-4" onClick={() => { const link = document.createElement("a"); link.href = conceptImage; link.download = `${form.roomName.trim().replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "home-studio"}-concept.jpg`; link.click(); }}>Download concept image</button></div> : null}
      </DashboardCard>
    </section> : null}
  </div>;
}
