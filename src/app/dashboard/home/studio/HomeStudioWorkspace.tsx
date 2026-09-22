"use client";

import type { HomeStudioAffiliate } from "@/lib/homeStudioAffiliates";
import Image from "next/image";
import { useRef, useState, type ChangeEvent } from "react";
import {
  DashboardCard,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import {
  buildHomeStudioDesignPacket,
  homeStudioBriefMatches,
  normalizeHomeStudioWorkspace,
  normalizeHomeStudioMoney,
  createHomeStudioVersion,
  type HomeStudioWorkspaceData,
  type HomeStudioVersion,
  homeStudioMeasurementIssues,
  homeStudioPrimaryPhoto,
  HOME_STUDIO_MAX_PHOTOS,
  homeStudioRetailerLinks,
  homeStudioShoppingStatuses,
  homeStudioShoppingStatus,
  type HomeStudioShoppingItem,
  homeStudioRoomTypes,
  homeStudioStyles,
  type HomeStudioPhoto,
  type HomeStudioPlan,
  type HomeStudioProject,
  type HomeStudioSavedProject,
} from "@/lib/homeStudio";
import { prepareHomeStudioPhoto } from "@/lib/homeStudioClient";
import { HomeStudioWorkbench } from "./HomeStudioWorkbench";
import { HomeStudioFloorPlan } from "./HomeStudioFloorPlan";
import { HomeStudioProjectLibrary } from "./HomeStudioProjectLibrary";

const initialForm: HomeStudioProject = {
  roomName: "",
  roomType: "Other",
  dimensions: "",
  measurementUnit: "feet",
  roomLength: "",
  roomWidth: "",
  ceilingHeight: "",
  northWall: "",
  eastWall: "",
  southWall: "",
  westWall: "",
  furnitureMeasurements: "",
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

export function HomeStudioWorkspace({ affiliates = [] }: { affiliates?: HomeStudioAffiliate[] } = {}) {
  const [shoppingName, setShoppingName] = useState("");
  const [advancedMounted, setAdvancedMounted] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [photos, setPhotos] = useState<HomeStudioPhoto[]>([]);
  const [plan, setPlan] = useState<HomeStudioPlan | null>(null);
  const [planProject, setPlanProject] = useState<HomeStudioProject | null>(null);
  const [photosChanged, setPhotosChanged] = useState(false);
  const [conceptPrompt, setConceptPrompt] = useState("");
  const [conceptImage, setConceptImage] = useState("");
  const [message, setMessage] = useState("");
  const [savingProject, setSavingProject] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [preparingPhotos, setPreparingPhotos] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const busy = planning || rendering || preparingPhotos || savingProject;
  const primaryPhoto = photos[0]?.dataUrl || "";

  const planOutdated = Boolean(plan && !homeStudioBriefMatches(planProject, form));
  const measurementIssues = homeStudioMeasurementIssues(form);

  const moneyIssue = [form.workspace?.budgetLimit, form.workspace?.client.fee, ...(plan?.shoppingList.map(item => item.unitPrice) || [])].some(value => value && !normalizeHomeStudioMoney(value));
  const layoutIssue = form.workspace?.layout.some(item => item.width <= 0 || item.depth <= 0 || [item.x, item.y, item.width, item.depth].some(n => !Number.isFinite(n) || n < 0 || n > 999));
  const requestInFlight = useRef(false);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    if (busy) return;
    if (key === "measurementUnit" && value !== form.measurementUnit && (form.roomLength || form.roomWidth || form.ceilingHeight || form.workspace?.layout.length)) {
      if (!window.confirm("Convert numeric room and layout measurements to the selected unit? Free-text measurement notes must be updated separately.")) return;
      const factor = value === "meters" ? 0.3048 : 1 / 0.3048;
      const convert = (n: number) => Math.round(n * factor * 100) / 100;
      setForm(current => ({ ...current, measurementUnit: value as HomeStudioProject["measurementUnit"], roomLength: current.roomLength ? String(convert(Number(current.roomLength))) : "", roomWidth: current.roomWidth ? String(convert(Number(current.roomWidth))) : "", ceilingHeight: current.ceilingHeight ? String(convert(Number(current.ceilingHeight))) : "", ...(current.workspace ? { workspace: { ...current.workspace, layout: current.workspace.layout.map(item => ({ ...item, x: convert(item.x), y: convert(item.y), width: convert(item.width), depth: convert(item.depth) })) } } : {}) }));
    } else setForm(current => ({ ...current, [key]: value }));
    setConceptImage("");
    setConfirmed(false);
  }

  async function selectPhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    await addPhotos(files);
  }

  async function addPhotos(files: File[]) {
    if (busy || !files.length) return;
    if (photos.length + files.length > HOME_STUDIO_MAX_PHOTOS) {
      setMessage(`Home Studio supports up to ${HOME_STUDIO_MAX_PHOTOS} room views. Remove one before adding another.`);
      return;
    }
    setPreparingPhotos(true);
    try {
      const prepared = await Promise.all(files.map(async (file, index) => ({
        dataUrl: await prepareHomeStudioPhoto(file),
        name: file.name.slice(0, 120),
        label: `Room view ${photos.length + index + 1}`,
      })));
      setPhotos((current) => [...current, ...prepared]);
      setPhotosChanged(Boolean(plan));
      setConceptImage("");
      setConfirmed(false);
      setMessage(`${prepared.length} room view${prepared.length === 1 ? "" : "s"} ready. Photos remain session-only and are not included when the project is saved.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Those room photos could not be prepared.");
    } finally {
      setPreparingPhotos(false);
    }
  }

  function removePhoto(index: number) {
    if (busy) return;
    setPhotos((current) => current.filter((_, photoIndex) => photoIndex !== index));
    setPhotosChanged(Boolean(plan));
    setConceptImage("");
    setConfirmed(false);
  }

  function changePhoto(index: number, label?: string) {
    if (busy) return;
    setPhotos(current => label === undefined ? homeStudioPrimaryPhoto(current, index) : current.map((photo, i) => i === index ? { ...photo, label } : photo));
    setPhotosChanged(Boolean(plan));
    setConceptImage("");
    setConfirmed(false);
  }

  function openSavedProject(saved: HomeStudioSavedProject & { sourcePhotoCount: number }) {
    if (busy) return;
    if ((!homeStudioBriefMatches(initialForm, form) || form.workspace || photos.length || plan) && !window.confirm("Open this saved project? Current unsaved edits and session photos will be replaced.")) return;
    setForm(saved.project);
    setPlanProject(saved.plan ? saved.project : null);
    setPhotosChanged(false);
    setPlan(saved.plan);
    setConceptPrompt(saved.plan?.conceptPrompt || "");
    setPhotos([]);
    setConceptImage("");
    setConfirmed(false);
    setActiveProjectId(saved.id);
    setMessage(saved.sourcePhotoCount
      ? `Saved project opened. Re-add its ${saved.sourcePhotoCount} room view${saved.sourcePhotoCount === 1 ? "" : "s"} before rebuilding the plan or generating a concept.`
      : "Saved project opened. Photos were not stored.");
    if (fileInput.current) fileInput.current.value = "";
  }

  function updateShopping(index: number, changes: Pick<HomeStudioShoppingItem, "status" | "notes" | "quantity" | "unitPrice">) {
    if (busy || planOutdated) return;
    setPlan(current => current ? { ...current, shoppingList: current.shoppingList.map((item, i) => i === index ? { ...item, ...changes } : item) } : current);
  }

  async function createPlan(withImage = false) {
    if (busy || requestInFlight.current) return;
    const project = withImage ? { ...form, roomName: form.roomName.trim() || "My room" } : form;
    if (!photos.length || !project.roomName.trim() || !project.roomType || !project.style) {
      setMessage("Add at least one room photo, room name, room type, and preferred style first.");
      return;
    }
    if (measurementIssues.length) { setMessage(measurementIssues.join(" ")); return; }
    if (moneyIssue || layoutIssue) { setMessage("Correct incomplete prices or invalid layout dimensions before rebuilding."); return; }
    if (plan && (form.workspace?.versions.length || 0) >= 5) { setMessage("Your five version slots are full. Download a backup and remove a snapshot before rebuilding, so your current design can be kept."); return; }
    requestInFlight.current = true;
    setPlanning(true);
    setMessage("Reviewing the room and preparing a design plan… Your previous plan stays available if this request fails.");
    setConfirmed(false);
    try {
      const response = await fetch("/api/home/studio/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...project, photos }),
      });
      const body = await response.json() as { plan?: HomeStudioPlan; notice?: string; error?: string };
      if (!response.ok || !body.plan) setMessage(body.error || "The design plan could not be prepared.");
      else {
        if (plan && planProject) {
          const workspace = form.workspace || normalizeHomeStudioWorkspace(null);
          const version = createHomeStudioVersion({ ...planProject, workspace }, { ...plan, conceptPrompt }, `Before rebuild: ${plan.title}`, crypto.randomUUID(), new Date().toISOString());
          setForm({ ...project, workspace: { ...workspace, versions: [...workspace.versions, version] } });
        }
        else setForm(project);
        setPlan(body.plan);
        setPlanProject({ ...project });
        setPhotosChanged(false);
        setConceptImage("");
        setConceptPrompt(body.plan.conceptPrompt);
        setMessage(body.notice || "Design plan ready for your review.");
        if (withImage) await renderImage(body.plan.conceptPrompt);
      }
    } catch {
      setMessage("The design plan could not be prepared. Your form and photos remain in this browser.");
    } finally {
      setPlanning(false);
      requestInFlight.current = false;
    }
  }

  async function redesignRoom() {
    if (busy || requestInFlight.current) return;
    if (!photos.length) { setMessage("Choose a room photo first."); return; }
    if (!form.notes.trim()) { setMessage("Tell us what you would like to change."); return; }
    if (plan && !planOutdated && !photosChanged && conceptPrompt.trim()) {
      requestInFlight.current = true;
      try { await renderImage(conceptPrompt); }
      finally { requestInFlight.current = false; }
    } else await createPlan(true);
  }

  async function generateConcept() {
    if (!plan || planOutdated || !primaryPhoto || !confirmed || !conceptPrompt.trim() || busy || requestInFlight.current) return;
    requestInFlight.current = true;
    try { await renderImage(conceptPrompt); }
    finally { requestInFlight.current = false; }
  }

  async function renderImage(prompt: string) {
    setRendering(true);
    setMessage("Creating your room image…");
    try {
      const response = await fetch("/api/home/studio/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: primaryPhoto, prompt, confirmed: true }),
      });
      const body = await response.json() as { image?: string; notice?: string; error?: string };
      if (!response.ok || !body.image) setMessage(`${body.error || "The image could not be generated."} Your plan is kept. Try again to retry just the image.`);
      else {
        setConceptImage(body.image);
        setMessage("Your room design is ready. Download the image to keep it.");
      }
    } catch {
      setMessage("The image could not be generated. Your plan is kept. Try again to retry just the image.");
    } finally {
      setRendering(false);
    }
  }

  function updateWorkspace(workspace: HomeStudioWorkspaceData) {
    if (!busy) setForm(current => ({ ...current, workspace }));
  }
  function restoreVersion(version: HomeStudioVersion) {
    if (busy) return;
    const workspace = form.workspace || normalizeHomeStudioWorkspace(null);
    const next = { ...version.project, workspace: { ...workspace, layout: structuredClone(version.layout), budgetLimit: version.budgetLimit } };
    setForm(next); setPlanProject(next); setPlan(structuredClone(version.plan));
    setConceptPrompt(version.plan.conceptPrompt); setConceptImage(""); setConfirmed(false); setPhotosChanged(Boolean(photos.length));
    setMessage("Design version restored. Save project to keep the restored design.");
  }
  function importProject(data: { project: HomeStudioProject; plan: HomeStudioPlan | null }) {
    if (busy) return;
    setForm(data.project); setPlanProject(data.plan ? data.project : null); setPlan(data.plan);
    setConceptPrompt(data.plan?.conceptPrompt || ""); setPhotos([]); setConceptImage(""); setConfirmed(false);
    setActiveProjectId(""); setPhotosChanged(false);
  }

  function reset() {
    if (busy) return;
    if ((!homeStudioBriefMatches(initialForm, form) || form.workspace || photos.length || plan) && !window.confirm("Start a new room? Current unsaved edits and session images will be cleared. Saved projects will remain available.")) return;
    setPlanProject(null);
    setPhotosChanged(false);
    setForm(initialForm);
    setPhotos([]);
    setPlan(null);
    setConceptPrompt("");
    setConceptImage("");
    setConfirmed(false);
    setActiveProjectId("");
    setMessage("New room started. The previous session photos and unsaved changes were cleared from this browser.");
    if (fileInput.current) fileInput.current.value = "";
  }

  function downloadPacket() {
    if (!plan || planOutdated || busy) return;
    const reviewedPlan = { ...plan, conceptPrompt };
    downloadData(
      `${form.roomName.trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "home-studio"}-design-packet.html`,
      buildHomeStudioDesignPacket({ project: form, plan: reviewedPlan, sourceImages: photos.map((photo) => photo.dataUrl), conceptImage, createdAt: new Date().toISOString() }),
      "text/html",
    );
  }

  function downloadProjectData() {
    if (!plan || planOutdated || busy) return;
    downloadData(
      `${form.roomName.trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "home-studio"}-project-data.json`,
      JSON.stringify({ schemaVersion: 2, project: form, plan: { ...plan, conceptPrompt }, sourcePhotoCount: photos.length, photosStored: false, createdAt: new Date().toISOString(), boundary: "AI planning concept; verify measurements, fit, safety, prices, and availability." }, null, 2),
      "application/json",
    );
  }

  return <div className="space-y-6">
    <fieldset disabled={busy} className="min-w-0" aria-label="Room photos">
      <DashboardCard accent="home">
        <h2 className="text-2xl font-black text-white">Start with your room photos</h2>
        <div className="mt-4">
          <div className="mb-4 rounded-2xl border-2 border-dashed border-orange-400/70 bg-orange-500/10 p-6 text-center sm:p-8" onDragOver={event => { event.preventDefault(); }} onDrop={event => { event.preventDefault(); void addPhotos(Array.from(event.dataTransfer.files)); }}>
            <button id="home-studio-photo" type="button" className="min-h-14 rounded-xl bg-orange-400 px-8 py-4 text-lg font-black text-slate-950 shadow-lg hover:bg-orange-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-300 disabled:opacity-50" disabled={busy || photos.length >= HOME_STUDIO_MAX_PHOTOS} onClick={() => fileInput.current?.click()}>
              {preparingPhotos ? "Preparing photos…" : photos.length >= HOME_STUDIO_MAX_PHOTOS ? "4 photos added" : photos.length ? "Add another view" : "Choose room photos"}
            </button>
            <input ref={fileInput} hidden aria-label="Room photo files" type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={selectPhotos} disabled={busy || photos.length >= HOME_STUDIO_MAX_PHOTOS} />
            <p className="mt-3 text-sm text-[#cbd5e1]">Or drop photos here · up to 4 JPG, PNG or WebP files, 3 MB each</p>
          </div>
          {photos.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {photos.map((photo, index) => <figure key={`${photo.name}-${index}`} className="overflow-hidden rounded-xl border border-[#334155] bg-black">
              <Image src={photo.dataUrl} alt={`${photo.label} for ${form.roomName || "the room"}`} width={1200} height={800} unoptimized className="h-48 w-full object-contain" />
              <figcaption className="space-y-3 bg-[#111827] p-3 text-xs text-[#cbd5e1]">
                <p className="truncate"><strong className="text-white">{index === 0 ? "Primary concept view" : `Room view ${index + 1}`}</strong><br />{photo.name}</p>
                <details><summary className="cursor-pointer">Label this view</summary><label className="block">View description<input className={inputClass} aria-label={`Description for photo ${index + 1}`} value={photo.label} maxLength={80} onChange={event => changePhoto(index, event.target.value)} placeholder="Window wall, entrance, closet…" /></label></details>
                <div className="flex flex-wrap gap-3">{index > 0 ? <button type="button" className="beast-button-secondary text-xs" onClick={() => changePhoto(index)}>Use as primary</button> : null}<button type="button" className="min-h-11 text-rose-200 underline" disabled={busy} onClick={() => removePhoto(index)}>Remove</button></div>
              </figcaption>
            </figure>)}
          </div> : null}

        </div>
      </DashboardCard>
    </fieldset>

    <fieldset disabled={busy} className="min-w-0" aria-label="Room redesign request">
      <DashboardCard accent="home">
        <label className="block text-xl font-black text-white" htmlFor="room-redesign-request">{conceptImage ? "What would you like to change next?" : "What would you like to change?"}</label>
        <textarea id="room-redesign-request" className={`${inputClass} min-h-28`} value={form.notes} maxLength={1200} onChange={event => update("notes", event.target.value)} placeholder="Make my office modern and cozy. Keep my desk and futon. Use black and gray, and stay under $1,000." />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" className="min-h-12 rounded-xl bg-orange-400 px-6 py-3 font-black text-slate-950 hover:bg-orange-300 disabled:opacity-50" disabled={busy || !photos.length || !form.notes.trim()} onClick={() => void redesignRoom()}>{rendering ? "Creating your image…" : planning ? "Planning your redesign…" : conceptImage ? "Redesign again" : "Redesign my room"}</button>
        </div>
        <p className="mt-3 text-xs text-[#94a3b8]">Uses paid AI to plan and generate one image. A visual concept, not an exact floor plan. Photos and images stay in this session; download images to keep them.</p>
      </DashboardCard>
    </fieldset>
    {message ? <p className="rounded-xl border border-[#334155] bg-[#0f172a] p-3 text-sm text-[#dbe3ef]" role="status" aria-live="polite">{message}</p> : null}

    {conceptImage ? <section aria-label="Your redesigned room" className="space-y-3">
      <h2 className="text-2xl font-black text-white">Your redesigned room</h2>
        {conceptImage ? <div className="mt-6"><div className="overflow-hidden rounded-2xl border border-[#334155] bg-black"><Image src={conceptImage} alt={`AI Home Studio concept for ${form.roomName}`} width={1536} height={1024} unoptimized className="h-auto w-full object-contain" /></div><button type="button" className="beast-button-secondary mt-4" onClick={() => { const link = document.createElement("a"); link.href = conceptImage; link.download = `${form.roomName.trim().replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "home-studio"}-concept.jpg`; link.click(); }}>Download concept image</button></div> : null}
      {plan ? <p className="text-sm text-[#cbd5e1]">{plan.summary}</p> : null}
      {plan?.shoppingList.length ? <details className="rounded-xl border border-[#334155] p-4">
        <summary className="cursor-pointer font-bold text-white">Shopping ideas ({plan.shoppingList.length})</summary>
        <p className="mt-2 text-xs text-[#94a3b8]">Estimated ranges; check current prices and fit.{affiliates.length ? " Some links earn us a commission." : ""}</p>
        <ul className="mt-3 space-y-4">{plan.shoppingList.map((item, index) => <li key={index}>
          <p className="font-semibold">{item.item} <span className="text-sm font-normal text-[#94a3b8]">· {item.targetPrice}</span></p>
          <div className="mt-2 flex flex-wrap gap-2">{homeStudioRetailerLinks(item.searchTerms, affiliates).map(retailer => <a key={retailer.label} href={retailer.href} target="_blank" rel={retailer.affiliate ? "sponsored noopener noreferrer" : "noopener noreferrer"} className="beast-button-secondary text-xs">{retailer.label}</a>)}</div>
        </li>)}</ul>
      </details> : null}
    </section> : null}
    <details className="rounded-xl border border-[#334155] p-5" onToggle={event => { if (event.currentTarget.open) setAdvancedMounted(true); }}>
      <summary className="cursor-pointer font-bold text-white">Advanced options</summary>
      {advancedMounted ? <div className="mt-5 space-y-6">
    <HomeStudioProjectLibrary
      project={form}
      plan={plan ? { ...plan, conceptPrompt } : null}
      sourcePhotoCount={photos.length}
      activeProjectId={activeProjectId}
      busy={busy}
      saveBlockedReason={moneyIssue || layoutIssue ? "Correct incomplete prices or invalid layout dimensions before saving." : measurementIssues.length ? "Correct invalid measurements before saving. Unknown measurements can be left blank." : planOutdated ? "The brief has changed. Rebuild the plan or restore its brief before saving, so the saved plan and measurements stay together." : undefined}
      onSavingChange={setSavingProject}
      onLoad={openSavedProject}
      onActiveProjectChange={setActiveProjectId}
    />

      <fieldset disabled={busy} className="min-w-0" aria-label="Home Studio project setup">
      <DashboardCard accent="beastos">
        <SectionHeader eyebrow="Room brief" title="Tell Home Studio what must work" description="Exact measurements and honest constraints produce a more useful concept. Leave unknowns blank instead of guessing." />
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <Field label="Project or room name"><input className={inputClass} value={form.roomName} maxLength={80} placeholder="My office" onChange={event => update("roomName", event.target.value)} /></Field>
          <Field label="Room type"><select className={inputClass} value={form.roomType} onChange={event => update("roomType", event.target.value)}>{homeStudioRoomTypes.map(type => <option key={type}>{type}</option>)}</select></Field>
          <Field label="Additional measurement notes" hint="optional"><input className={inputClass} value={form.dimensions} maxLength={200} placeholder="Alcove is 4 ft deep; baseboard projects 1 in" onChange={event => update("dimensions", event.target.value)} /></Field>
          <Field label="Preferred style"><select className={inputClass} value={form.style} onChange={event => update("style", event.target.value)}>{homeStudioStyles.map(style => <option key={style}>{style}</option>)}</select></Field>
          <Field label="Colors or palette" hint="optional"><input className={inputClass} value={form.colors} maxLength={300} placeholder="Warm white, walnut, black accents" onChange={event => update("colors", event.target.value)} /></Field>
          <Field label="Working budget" hint="optional"><input className={inputClass} value={form.budget} maxLength={80} placeholder="$1,000 total or use what I own" onChange={event => update("budget", event.target.value)} /></Field>
          <Field label="Furniture or features to keep" hint="optional"><textarea className={`${inputClass} min-h-24`} value={form.mustKeep} maxLength={800} placeholder="Desk, futon, wall-mounted TV…" onChange={event => update("mustKeep", event.target.value)} /></Field>
          <Field label="What the room needs to accomplish" hint="optional"><textarea className={`${inputClass} min-h-24`} value={form.needs} maxLength={800} placeholder="Work, gaming, guest seating, better cable control…" onChange={event => update("needs", event.target.value)} /></Field>
          <Field label="Windows, doors, and fixed openings" hint="optional"><textarea className={`${inputClass} min-h-24`} value={form.openings} maxLength={500} placeholder="Door opens inward on right; window centered on back wall…" onChange={event => update("openings", event.target.value)} /></Field>
        </div>
        <details className="mt-6 rounded-xl border border-[#334155] bg-[#111827] p-4">
          <summary className="cursor-pointer font-black text-white">Dimensioned floor-planning details</summary>
          <p className="mt-2 text-sm leading-6 text-[#94a3b8]">Enter verified inside-wall dimensions and describe each wall clockwise. Home Studio will preserve these facts separately from visual assumptions.</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Field label="Units"><select className={inputClass} value={form.measurementUnit} onChange={event => update("measurementUnit", event.target.value as HomeStudioProject["measurementUnit"])}><option value="feet">Feet</option><option value="meters">Meters</option></select></Field>
            <Field label="Room length"><input inputMode="decimal" className={inputClass} value={form.roomLength} maxLength={12} placeholder="13" onChange={event => update("roomLength", event.target.value)} /></Field>
            <Field label="Room width"><input inputMode="decimal" className={inputClass} value={form.roomWidth} maxLength={12} placeholder="12" onChange={event => update("roomWidth", event.target.value)} /></Field>
            <Field label="Ceiling height"><input inputMode="decimal" className={inputClass} value={form.ceilingHeight} maxLength={12} placeholder="8" onChange={event => update("ceilingHeight", event.target.value)} /></Field>
            <Field label="North wall" hint="openings + offsets"><textarea className={`${inputClass} min-h-24`} value={form.northWall} maxLength={400} placeholder="104 in wall; 36 in door begins 8 in from east corner" onChange={event => update("northWall", event.target.value)} /></Field>
            <Field label="East wall" hint="openings + offsets"><textarea className={`${inputClass} min-h-24`} value={form.eastWall} maxLength={400} placeholder="Window centered; 48 in wide" onChange={event => update("eastWall", event.target.value)} /></Field>
            <Field label="South wall" hint="openings + offsets"><textarea className={`${inputClass} min-h-24`} value={form.southWall} maxLength={400} placeholder="Solid wall" onChange={event => update("southWall", event.target.value)} /></Field>
            <Field label="West wall" hint="openings + offsets"><textarea className={`${inputClass} min-h-24`} value={form.westWall} maxLength={400} placeholder="Closet doors span 60 in" onChange={event => update("westWall", event.target.value)} /></Field>
          </div>
          <Field label="Furniture measurements and desired placement" hint="optional"><textarea className={`${inputClass} min-h-28`} value={form.furnitureMeasurements} maxLength={1200} placeholder={"Desk 79 × 30 in — entry-door wall\nFuton 70 × 33 in — opposite wall"} onChange={event => update("furnitureMeasurements", event.target.value)} /></Field>
          {measurementIssues.length ? <ul className="mt-4 space-y-2 text-sm text-amber-200" role="status">{measurementIssues.map(issue => <li key={issue}>{issue}</li>)}</ul> : null}
          <HomeStudioFloorPlan project={form} />
        </details>
        <div className="mt-5 flex flex-wrap gap-3">
          <button className="beast-button-primary" type="button" disabled={busy} onClick={() => void createPlan()}>{planning ? "Preparing design plan…" : plan ? "Rebuild design plan" : "Create design plan"}</button>
          {!plan ? <button className="beast-button-secondary" type="button" disabled={busy || !form.roomName.trim() || measurementIssues.length > 0} onClick={() => { const manual: HomeStudioPlan = { title: `${form.roomName} — manual plan`, summary: "A project you can organize with your own shopping items, layout, and budget. No AI analysis has been performed.", observedRoom: [], assumptions: [], palette: [], layoutPlan: [], designMoves: [], shoppingList: [], cautions: ["Verify all measurements and fit on site."], conceptPrompt: "Create a room concept preserving the existing architecture and all must-keep items. Review and add your design instructions before generating an image." }; setPlan(manual); setPlanProject({ ...form }); setConceptPrompt(manual.conceptPrompt); setMessage("Manual plan started without an AI request."); }}>Start manual plan</button> : null}
          <button className="beast-button-secondary" type="button" disabled={busy} onClick={reset}>Start a new room</button>
        </div>
      </DashboardCard>
      </fieldset>
    <HomeStudioWorkbench project={form} plan={plan ? { ...plan, conceptPrompt } : null} busy={busy} stale={planOutdated || measurementIssues.length > 0 || moneyIssue || Boolean(layoutIssue)} onWorkspace={updateWorkspace} onRestore={restoreVersion} onImport={importProject} />

    {plan ? <section className="space-y-6" aria-labelledby="home-studio-plan-title">
      {planOutdated ? <div className="rounded-xl border border-amber-600 bg-amber-950/20 p-5" role="status"><h2 className="font-black text-amber-100">Your previous plan is preserved</h2><p className="mt-2 text-sm text-amber-100">The room brief has changed. The plan below still describes the previous brief. Rebuild it before saving, exporting, or generating a concept with the new measurements.</p><button className="beast-button-secondary mt-3" type="button" disabled={busy} onClick={() => { if (planProject && window.confirm("Restore the brief used for this plan? Current brief edits will be replaced; photos will stay as they are.")) { setForm({ ...planProject, workspace: form.workspace }); setConfirmed(false); } }}>Restore plan brief</button></div> : null}
      {photosChanged ? <p className="rounded-xl border border-cyan-800 bg-cyan-950/20 p-4 text-sm text-cyan-100">Room photos or their labels changed. The existing plan has not re-analyzed them. Rebuild for fresh photo analysis, or review the existing instructions before using your selected primary view for a concept.</p> : null}
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
        <SectionHeader eyebrow="Shopping targets" title="Shop the plan without locking into one retailer" description={affiliates.length ? "Some retailer links are affiliate links. We may earn a commission if you buy through them. Verify fit, price, and availability with the retailer." : "Ordinary retailer searches. Affiliate links are not active. Verify fit, price, and availability with the retailer."} />
        <p className="mt-3 text-sm text-[#cbd5e1]">Track what you need, own, or have purchased. Use Save project to keep checklist changes; they are also included in downloads. Rebuilding keeps a snapshot of your previous design and starts a new checklist.</p>
        <p className="mt-2 text-sm font-bold text-cyan-100">{plan.shoppingList.filter(item => item.status === "Purchased" || item.status === "Already owned").length} of {plan.shoppingList.length} items ready</p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row"><label className="flex-1 text-sm">Add your own shopping item<input className={inputClass} value={shoppingName} maxLength={100} disabled={busy || planOutdated} onChange={e => setShoppingName(e.target.value)} placeholder="Curtains, paint, shelf hardware…" /></label><button className="beast-button-secondary self-end" type="button" disabled={busy || planOutdated || !shoppingName.trim() || plan.shoppingList.length >= 32} onClick={() => { setPlan(current => current ? { ...current, shoppingList: [...current.shoppingList, { item: shoppingName.trim(), purpose: "Added by you", searchTerms: shoppingName.trim(), targetPrice: "Price not estimated", priority: "Optional", status: "Needed", quantity: 1 }] } : current); setShoppingName(""); }}>Add shopping item</button></div>
        {!plan.shoppingList.length ? <p className="mt-3 text-sm text-[#94a3b8]">This plan has no shopping items.</p> : null}
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {plan.shoppingList.map((item, index) => <article key={`${item.item}-${index}`} className="rounded-xl border border-[#334155] bg-[#111827] p-4">
            <div className="flex items-start justify-between gap-3"><div><h3 className="font-black text-white">{item.item}</h3><p className="mt-1 text-sm leading-6 text-[#cbd5e1]">{item.purpose}</p></div><span className="rounded-full border border-cyan-700 bg-cyan-950/30 px-2.5 py-1 text-xs font-bold text-cyan-100">{item.priority}</span></div>
            <p className="mt-3 text-sm"><strong>Planning range:</strong> {item.targetPrice}</p>
            <label className="mt-3 block text-sm font-bold">Status
              <select className={inputClass} aria-label={`Shopping status for ${item.item}`} value={homeStudioShoppingStatus(item.status)} disabled={busy || planOutdated} onChange={event => updateShopping(index, { status: homeStudioShoppingStatus(event.target.value) })}>
                {homeStudioShoppingStatuses.map(status => <option key={status} value={status}>{status}</option>)}
              </select>
            </label>
            <label className="mt-3 block text-sm font-bold">Shopping notes
              <textarea className={inputClass} aria-label={`Shopping notes for ${item.item}`} value={item.notes || ""} maxLength={400} rows={2} placeholder="Measurements to check, store, or product details" disabled={busy || planOutdated} onChange={event => updateShopping(index, { notes: event.target.value })} />
            </label>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="text-sm">Quantity<input className={inputClass} aria-label={`Quantity for ${item.item}`} type="number" min={1} max={99} step={1} value={item.quantity || 1} disabled={busy || planOutdated} onChange={event => { const n = Number(event.target.value); if (Number.isInteger(n) && n >= 1 && n <= 99) updateShopping(index, { quantity: n }); }} /></label>
              <label className="text-sm">Unit price (USD)<input className={inputClass} aria-label={`Unit price for ${item.item}`} inputMode="decimal" maxLength={9} placeholder="Unknown" value={item.unitPrice || ""} disabled={busy || planOutdated} onChange={event => { const value = event.target.value; if (/^\d{0,6}(\.\d{0,2})?$/.test(value)) updateShopping(index, { unitPrice: value }); }} /></label>
            </div>
            <details className="mt-3"><summary className="cursor-pointer text-sm font-bold text-cyan-300">Search retailers</summary><div className="mt-3 flex flex-wrap gap-2">{homeStudioRetailerLinks(item.searchTerms, affiliates).map(retailer => <a key={retailer.label} href={retailer.href} target="_blank" rel={retailer.affiliate ? "sponsored noopener noreferrer" : "noopener noreferrer"} className="beast-button-secondary text-xs">{retailer.label}{retailer.affiliate ? " (affiliate)" : ""}</a>)}</div></details>
            <button type="button" className="mt-3 text-sm text-rose-200 underline" disabled={busy || planOutdated} onClick={() => { if (window.confirm(`Remove ${item.item} from the shopping list?`)) setPlan(current => current ? { ...current, shoppingList: current.shoppingList.filter((_, i) => i !== index) } : current); }}>Remove shopping item</button>
          </article>)}
        </div>
      </DashboardCard>

      <DashboardCard accent="beastos">
        <SectionHeader eyebrow="Reality check" title="Verify before acting" description="Home Studio organizes a concept; it does not inspect the property or replace qualified local help." />
        <TextList items={plan.cautions} />
        <div className="mt-5 flex flex-wrap gap-3"><button type="button" className="beast-button-secondary" disabled={busy || planOutdated || moneyIssue || Boolean(layoutIssue)} onClick={downloadPacket}>Download printable packet</button><button type="button" className="beast-button-secondary" disabled={busy || planOutdated || moneyIssue || Boolean(layoutIssue)} onClick={downloadProjectData}>Download project data</button></div>
      </DashboardCard>

      <DashboardCard accent="home">
        <SectionHeader eyebrow="Optional paid provider action" title="Generate one visual concept" description="This sends the primary room view and reviewed concept prompt to the configured image provider and consumes one image-generation request. Additional views informed the plan but are not sent again for this image edit. It does not purchase products or save the image to BeastHome." />
        <details className="mt-5 rounded-xl border border-[#334155] bg-[#111827] p-4">
          <summary className="cursor-pointer font-black text-white">Review the exact concept instructions</summary>
          <p className="mt-2 text-sm leading-6 text-[#94a3b8]">Edit these instructions before confirming. Changing them clears your confirmation so the provider never receives an unreviewed revision.</p>
          <textarea
            className={`${inputClass} min-h-36`}
            value={conceptPrompt}
            maxLength={2400}
            disabled={busy || planOutdated}
            onChange={event => { setConceptPrompt(event.target.value); setConfirmed(false); setConceptImage(""); }}
            aria-label="Concept image instructions"
          />
          <p className="mt-2 text-right text-xs text-[#94a3b8]">{conceptPrompt.length}/2400</p>
        </details>
        <label className="mt-5 flex items-start gap-3 rounded-xl border border-[#334155] bg-[#111827] p-4 text-sm leading-6 text-[#dbe3ef]"><input type="checkbox" className="mt-1" disabled={busy || planOutdated} checked={confirmed} onChange={event => setConfirmed(event.target.checked)} /><span>I reviewed the plan and understand that the visual is an AI concept—not an exact measurement, construction drawing, appraisal, inspection, price quote, or product-availability guarantee.</span></label>
        {!primaryPhoto ? <p className="mt-4 rounded-xl border border-amber-700/60 bg-amber-950/10 p-3 text-sm text-amber-100">Re-add a primary room view before generating a concept from this saved project.</p> : null}
        <button type="button" className="beast-button-primary mt-4" disabled={planOutdated || !primaryPhoto || !confirmed || !conceptPrompt.trim() || busy} onClick={() => void generateConcept()}>{rendering ? "Generating concept…" : conceptImage ? "Generate another concept" : "Generate visual concept"}</button>

      </DashboardCard>
    </section> : null}
      </div> : null}
    </details>
  </div>;
}
