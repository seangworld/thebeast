"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getProfileDisplayName } from "@/lib/profile";
import { personalInformationCanonicalRoute } from "@/lib/platform/personalHub";
import { profileAge, profileChangeError, profileChanges, profileEditColumns, profileFieldLabels, profileFieldLimit, profileToForm, type EditableProfile, type ProfileField } from "@/lib/platform/profileEditing";
import { DashboardCard, ModuleBadge, SectionHeader } from "@/app/components/design/DashboardPrimitives";
import { AccountEmailWorkflowCard } from "./AccountEmailWorkflowCard";
import { AccountPasswordCard } from "./AccountPasswordCard";

class ProfileNotice extends Error {}

export default function ProfilePage() {
  const router = useRouter();
  const [form, setForm] = useState(() => profileToForm());
  const [original, setOriginal] = useState(() => profileToForm());
  const [profile, setProfile] = useState<EditableProfile | null>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [confirmReload, setConfirmReload] = useState(false);
  const busy = useRef(false);
  const loadVersion = useRef(0);
  const dirty = Object.keys(profileChanges(form, original)).length > 0;
  const age = profileAge(form.birthday);
  const greetingName = getProfileDisplayName(form, {email});

  const loadProfile = useCallback(async () => {
    const version = ++loadVersion.current;
    setLoading(true); setError(""); setMessage(""); setConfirmReload(false);
    try {
      const client = createClient();
      const auth = await client.auth.getUser();
      if (version !== loadVersion.current) return;
      if (auth.error || !auth.data.user) throw new ProfileNotice("Sign in again to manage your profile.");
      const result = await client.from("profiles").select(profileEditColumns).eq("id", auth.data.user.id).maybeSingle();
      if (version !== loadVersion.current) return;
      if (result.error) throw new ProfileNotice("We couldn’t load your profile. Your edits have been kept. Try again.");
      if (!result.data) throw new ProfileNotice("Your profile isn’t available yet. Try reloading or contact support if this continues.");
      const next = result.data as unknown as EditableProfile;
      setProfile(next); setEmail(auth.data.user.email || ""); setForm(profileToForm(next)); setOriginal(profileToForm(next));
    } catch (cause) {
      if (version === loadVersion.current) setError(cause instanceof ProfileNotice ? cause.message : "We couldn’t load your profile. Please try again.");
    } finally { if (version === loadVersion.current) setLoading(false); }
  }, []);
  useEffect(() => { void loadProfile(); return () => { loadVersion.current += 1; }; }, [loadProfile]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  async function saveProfile() {
    if (busy.current || loading || !profile || !dirty) return;
    const patch = profileChanges(form, original);
    const validation = profileChangeError(patch);
    if (validation) { setError(validation); setMessage(""); return; }
    busy.current = true; setSaving(true); setMessage(""); setError("");
    try {
      const client = createClient();
      const auth = await client.auth.getUser();
      if (auth.error || auth.data.user?.id !== profile.id) throw new ProfileNotice("Your sign-in changed. Sign in to the same account and reload before saving.");
      const result = await client.from("profiles").update(patch).eq("id", auth.data.user.id).eq("updated_at", profile.updated_at).select(profileEditColumns);
      if (result.error) throw new ProfileNotice(result.error.code === "23505" ? "That username is already in use. Choose another one." : "We couldn’t confirm your save. Your edits are still here; reload to check the saved version before retrying.");
      if (result.data?.length !== 1) throw new ProfileNotice("Your profile changed in another window or is no longer available. Your edits are kept here; reload the saved version before trying again.");
      const next = result.data[0] as unknown as EditableProfile;
      setProfile(next); setForm(profileToForm(next)); setOriginal(profileToForm(next)); setConfirmReload(false);
      setMessage("Your personal information is saved.");
      router.refresh();
    } catch (cause) { setError(cause instanceof ProfileNotice ? cause.message : "We couldn’t confirm your save. Your edits are still here."); }
    finally { busy.current = false; setSaving(false); }
  }
  function field(key: ProfileField, multiline = false, placeholder?: string) {
    const props = { value: form[key], maxLength: profileFieldLimit(key), onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setForm(current => ({...current, [key]: event.target.value})); setMessage(""); }, placeholder, className: "beast-input mt-2", disabled: saving || loading || !profile };
    return <label className="block" key={key}><span className="text-sm font-semibold text-slate-300">{profileFieldLabels[key]}</span>{multiline ? <textarea {...props} rows={3} /> : <input {...props} type={key === "birthday" ? "date" : "text"} />}</label>;
  }

  return <main className="beast-page"><div className="beast-container space-y-6">
    <section className="beast-page-header">
      <ModuleBadge module="beastos" label="Personal Hub" />
      <h1 className="beast-title mt-3">Personal Information</h1>
      <p className="beast-subtitle">Your name, everyday details, and the people and interests that matter to you. Share as much or as little as you like.</p>
      <Link href="/dashboard/settings" className="beast-button-secondary mt-4">Back to Personal Hub</Link>
    </section>
    <nav aria-label="Personal information sections" className="flex flex-wrap gap-3 text-sm text-sky-300">
      <a href="#personal-information">About you</a><a href="#household-context">Family &amp; household</a><a href="#learning-preferences">Learning &amp; career</a><a href="#account-settings">Email &amp; password</a>
    </nav>
    <div className="grid gap-5 xl:grid-cols-[1fr_0.7fr]">
      <form onSubmit={event => { event.preventDefault(); void saveProfile(); }} className="min-w-0 space-y-5" aria-label="Personal information">
        {error && <p role="alert" className="rounded-xl border border-red-300/30 bg-red-300/10 p-4 text-sm text-red-100">{error}</p>}
        {message && <p role="status" className="rounded-xl border border-emerald-300/30 bg-emerald-300/10 p-4 text-sm text-emerald-100">{message}</p>}
        {loading && <p role="status" className="text-slate-300">Loading your information…</p>}
        <fieldset disabled={loading || saving || !profile} className="min-w-0 space-y-5">
          <DashboardCard accent="beastos"><section id="personal-information" className="scroll-mt-24">
            <SectionHeader title="About you" description="Your preferred name is used in your Beast greeting." />
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {field("preferred_name")}{field("display_name")}{field("full_name")}{field("username", false, "Your handle")}{field("birthday")}{field("location", false, "City, state or region")}
              <div className="sm:col-span-2">{field("timezone", false, "America/New_York")}<button type="button" className="mt-2 text-sm text-sky-300 underline" onClick={() => { setForm(current => ({...current, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone})); setMessage(""); }}>Use my device timezone</button></div>
              <div className="sm:col-span-2">{field("bio", true, "What would you like Beast to know about you?")}</div>
            </div>
            {age !== null && <p className="mt-3 text-sm text-slate-400">Age: {age} · calculated from your birthday</p>}
          </section></DashboardCard>
          <DashboardCard accent="beastos"><section id="household-context" className="scroll-mt-24">
            <SectionHeader title="Family & household" description="Optional notes about your household, responsibilities, or support system. This does not invite anyone or give them access to your account." />
            <div className="mt-4">{field("household_context", true, "Household details you want to keep with your profile")}</div>
          </section></DashboardCard>
          <DashboardCard accent="blue"><section id="learning-preferences" className="scroll-mt-24">
            <SectionHeader title="Learning & career preferences" description="Your interests, available time, and how you like to learn." />
            <div className="mt-5 grid gap-4 sm:grid-cols-2">{field("current_academic_level")}{field("learning_availability", false, "30 minutes most weekdays")}{field("career_interests", true)}{field("learning_preferences", true)}{field("learning_strengths", true)}{field("learning_help_areas", true)}</div>
            <p className="mt-4 text-sm text-slate-400">For your education history and planning, visit <Link href="/dashboard/education/about-you" className="text-sky-300 underline">Education About You</Link>.</p>
          </section></DashboardCard>
        </fieldset>
        <div data-personal-hub-route={personalInformationCanonicalRoute} className="rounded-xl border border-slate-700 bg-[#111827] p-4">
          <p className="mb-3 text-sm text-slate-300">{dirty ? "You have unsaved changes." : profile ? "Your saved information is shown above." : "Load your profile before editing."}</p>
          <div className="flex flex-wrap gap-3"><button type="submit" disabled={loading || saving || !profile || !dirty} className="beast-button disabled:opacity-50">{saving ? "Saving…" : "Save changes"}</button>
            <button type="button" disabled={loading || saving} className="beast-button-secondary" onClick={() => { if (dirty) setConfirmReload(true); else void loadProfile(); }}>Reload saved information</button></div>
          {confirmReload && <div className="mt-4 space-y-3"><p className="text-sm text-amber-100">Reloading will replace your unsaved edits with the saved version.</p><div className="flex flex-wrap gap-3"><button type="button" disabled={saving || loading} className="beast-button-secondary" onClick={() => void loadProfile()}>Discard edits and reload</button><button type="button" className="beast-button-secondary" onClick={() => setConfirmReload(false)}>Keep editing</button></div></div>}
        </div>
      </form>
      <aside className="min-w-0 space-y-5">
        <DashboardCard accent="blue"><SectionHeader title={profile ? `Welcome, ${greetingName}` : "Your greeting"} description="A preview of how Beast greets you. Save changes to update it." /></DashboardCard>
        <DashboardCard accent="goals"><SectionHeader title="Your plans and records" description="Keep your goals and documents within reach." /><div className="mt-4 flex flex-wrap gap-3"><Link href="/dashboard/goals" className="beast-button-secondary">Your goals</Link><Link href="/dashboard/uploads" className="beast-button-secondary">Your documents</Link></div></DashboardCard>
        <section id="account-settings" aria-label="Email and password" className="scroll-mt-24 space-y-5"><AccountEmailWorkflowCard /><AccountPasswordCard /></section>
      </aside>
    </div>
  </div></main>;
}
