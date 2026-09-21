"use client";

import { useCallback, useEffect, useState } from "react";
import { DashboardCard, SectionHeader } from "@/app/components/design/DashboardPrimitives";
import type { HomeStudioPlan, HomeStudioProject, HomeStudioSavedProject } from "@/lib/homeStudio";

type SavedProject = HomeStudioSavedProject & { sourcePhotoCount: number };

export function HomeStudioProjectLibrary({
  project,
  plan,
  sourcePhotoCount,
  activeProjectId,
  busy,
  saveBlockedReason,
  onLoad,
  onActiveProjectChange,
}: {
  project: HomeStudioProject;
  plan: HomeStudioPlan | null;
  sourcePhotoCount: number;
  activeProjectId: string;
  busy: boolean;
  saveBlockedReason?: string;
  onLoad: (saved: SavedProject) => void;
  onActiveProjectChange: (id: string) => void;
}) {
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/home/studio/projects", { cache: "no-store" });
      const body = await response.json() as { projects?: SavedProject[]; error?: string };
      if (!response.ok) setMessage(body.error || "Saved projects are unavailable.");
      else setProjects(body.projects || []);
    } catch {
      setMessage("Saved projects are unavailable.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function save() {
    if (!project.roomName.trim() || saving || busy || saveBlockedReason) {
      if (!project.roomName.trim()) setMessage("Add a project or room name before saving.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/home/studio/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", id: activeProjectId || undefined, project, plan, sourcePhotoCount }),
      });
      const body = await response.json() as { project?: SavedProject; error?: string };
      if (!response.ok || !body.project) setMessage(body.error || "The project could not be saved.");
      else {
        onActiveProjectChange(body.project.id);
        setProjects((current) => [body.project!, ...current.filter((item) => item.id !== body.project!.id)]);
        setMessage("Project saved. Photos remain session-only and were not stored.");
      }
    } catch {
      setMessage("The project could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(saved: SavedProject) {
    if (saving || busy || !window.confirm(`Delete “${saved.project.roomName}”? This removes the saved brief and plan and cannot be undone.`)) return;
    setSaving(true);
    try {
      const response = await fetch("/api/home/studio/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id: saved.id }),
      });
      const body = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !body.ok) setMessage(body.error || "The project could not be deleted.");
      else {
        setProjects((current) => current.filter((item) => item.id !== saved.id));
        if (activeProjectId === saved.id) onActiveProjectChange("");
        setMessage("Saved project deleted.");
      }
    } catch {
      setMessage("The project could not be deleted.");
    } finally {
      setSaving(false);
    }
  }

  return <DashboardCard accent="home">
    <SectionHeader
      eyebrow="Private project library"
      title="Save the plan, not the photos"
      description="Your room brief and reviewed plan can be reopened later. Source and concept images remain in this browser session and are never included in a saved project."
    />
    <div className="mt-5 flex flex-wrap gap-3">
      <button type="button" className="beast-button-primary" disabled={saving || busy || Boolean(saveBlockedReason) || !project.roomName.trim()} onClick={() => void save()}>
        {saving ? "Saving…" : activeProjectId ? "Update saved project" : "Save project"}
      </button>
      <button type="button" className="beast-button-secondary" disabled={loading || saving} onClick={() => void refresh()}>
        Refresh projects
      </button>
      {activeProjectId ? <button type="button" className="beast-button-secondary" disabled={saving || busy} onClick={() => onActiveProjectChange("")}>Save as new</button> : null}
    </div>
    {saveBlockedReason ? <p className="mt-3 text-sm text-amber-200" role="status">{saveBlockedReason}</p> : null}
    {message ? <p role="status" className="mt-3 text-sm text-cyan-100">{message}</p> : null}
    <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {loading ? <p className="text-sm text-[#94a3b8]">Loading saved projects…</p> : null}
      {!loading && !projects.length ? <p className="text-sm text-[#94a3b8]">No saved Home Studio projects yet.</p> : null}
      {projects.map((saved) => <article key={saved.id} className={`rounded-xl border p-4 ${activeProjectId === saved.id ? "border-cyan-500 bg-cyan-950/20" : "border-[#334155] bg-[#111827]"}`}>
        <h3 className="font-black text-white">{saved.project.roomName}</h3>
        <p className="mt-1 text-sm text-[#cbd5e1]">{saved.project.roomType} · {saved.project.style}</p>
        <p className="mt-2 text-xs text-[#94a3b8]">Updated {new Date(saved.updatedAt).toLocaleString()} · {saved.plan ? "Plan saved" : "Brief only"} · {saved.sourcePhotoCount} session photo{saved.sourcePhotoCount === 1 ? "" : "s"} at last save</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="beast-button-secondary text-xs" disabled={saving || busy} onClick={() => onLoad(saved)}>Open</button>
          <button type="button" className="beast-button-secondary text-xs" disabled={saving || busy} onClick={() => void remove(saved)}>Delete</button>
        </div>
      </article>)}
    </div>
  </DashboardCard>;
}
