"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getProfileDisplayName } from "@/lib/profile";
import { useEntitlements } from "@/lib/hooks/useEntitlements";
import {
  DashboardCard,
  ModuleBadge,
  SectionHeader,
} from "@/app/components/design/DashboardPrimitives";
import type { Profile } from "@/lib/types/database";

type ProfileForm = {
  preferred_name: string;
  display_name: string;
  full_name: string;
  username: string;
  birthday: string;
  location: string;
  timezone: string;
  household_context: string;
  bio: string;
  current_academic_level: string;
  career_interests: string;
  learning_preferences: string;
  learning_availability: string;
  learning_strengths: string;
  learning_help_areas: string;
};

const emptyForm: ProfileForm = {
  preferred_name: "",
  display_name: "",
  full_name: "",
  username: "",
  birthday: "",
  location: "",
  timezone: "",
  household_context: "",
  bio: "",
  current_academic_level: "",
  career_interests: "",
  learning_preferences: "",
  learning_availability: "",
  learning_strengths: "",
  learning_help_areas: "",
};

function toForm(profile: Profile | null): ProfileForm {
  return {
    preferred_name: profile?.preferred_name || "",
    display_name: profile?.display_name || "",
    full_name: profile?.full_name || "",
    username: profile?.username || "",
    birthday: profile?.birthday || "",
    location: profile?.location || "",
    timezone: profile?.timezone || "",
    household_context: profile?.household_context || "",
    bio: profile?.bio || "",
    current_academic_level: profile?.current_academic_level || "",
    career_interests: profile?.career_interests || "",
    learning_preferences: profile?.learning_preferences || "",
    learning_availability: profile?.learning_availability || "",
    learning_strengths: profile?.learning_strengths || "",
    learning_help_areas: profile?.learning_help_areas || "",
  };
}

function computeAge(birthday: string) {
  if (!birthday) return null;

  const birthDate = new Date(`${birthday}T00:00:00`);
  if (Number.isNaN(birthDate.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDelta = today.getMonth() - birthDate.getMonth();

  if (
    monthDelta < 0 ||
    (monthDelta === 0 && today.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }

  return age >= 0 ? age : null;
}

function formatLabel(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatConfigured(value: string) {
  return value.trim() ? "Configured" : "Not set";
}

function FoundationStatus({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
      <div className="text-sm font-black uppercase text-[#7f8da3]">
        {label}
      </div>
      <div className="mt-2 text-lg font-black text-white">{value}</div>
      <p className="mt-2 text-sm leading-6 text-[#aab6c7]">{detail}</p>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-[#c7cfdb]">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="beast-input mt-2"
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-[#c7cfdb]">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={4}
        className="beast-input mt-2 min-h-28 resize-y"
      />
    </label>
  );
}

export default function ProfilePage() {
  const entitlements = useEntitlements();
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const age = useMemo(() => computeAge(form.birthday), [form.birthday]);
  const greetingName = useMemo(
    () =>
      getProfileDisplayName(
        {
          preferred_name: form.preferred_name,
          display_name: form.display_name,
          full_name: form.full_name,
          username: form.username,
        },
        { email }
      ),
    [email, form.display_name, form.full_name, form.preferred_name, form.username]
  );

  const updateField = useCallback(
    (field: keyof ProfileForm, value: string) => {
      setForm((current) => ({ ...current, [field]: value }));
    },
    []
  );

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setMessage("");

    let supabase: ReturnType<typeof createClient>;

    try {
      supabase = createClient();
    } catch (error) {
      setLoading(false);
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to initialize profile services."
      );
      return;
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    const authUser = userData?.user;

    if (userError || !authUser) {
      setLoading(false);
      setMessage("Sign in to manage your BeastOS profile.");
      return;
    }

    setUserId(authUser.id);
    setEmail(authUser.email || "");

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", authUser.id)
      .maybeSingle();

    if (error) {
      setMessage(`Unable to load profile: ${error.message}`);
      setLoading(false);
      return;
    }

    setForm(toForm((data as Profile | null) || null));
    setLoading(false);
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  async function saveProfile() {
    if (!userId) {
      setMessage("Sign in to save your profile.");
      return;
    }

    setSaving(true);
    setMessage("");

    let supabase: ReturnType<typeof createClient>;

    try {
      supabase = createClient();
    } catch (error) {
      setSaving(false);
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to initialize profile services."
      );
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        preferred_name: form.preferred_name || null,
        display_name: form.display_name || null,
        full_name: form.full_name || null,
        username: form.username || null,
        birthday: form.birthday || null,
        location: form.location || null,
        timezone: form.timezone || null,
        household_context: form.household_context || null,
        bio: form.bio || null,
        current_academic_level: form.current_academic_level || null,
        career_interests: form.career_interests || null,
        learning_preferences: form.learning_preferences || null,
        learning_availability: form.learning_availability || null,
        learning_strengths: form.learning_strengths || null,
        learning_help_areas: form.learning_help_areas || null,
      })
      .eq("id", userId);

    setSaving(false);

    if (error) {
      setMessage(`Unable to save profile: ${error.message}`);
      return;
    }

    setMessage(
      "Personal Hub saved. BeastOS will use your preferred name where it can."
    );
    await loadProfile();
  }

  return (
    <main className="beast-page">
      <div className="beast-container space-y-8">
        <section className="beast-page-header">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <ModuleBadge module="beastos" label="Personal Hub Foundation" />
              <h1 className="beast-title">Personal Hub</h1>
              <p className="beast-subtitle">
                Personal Hub is the BeastOS foundation for identity, family,
                preferences, privacy, permissions, connected
                accounts, AI context, and notifications.
              </p>
              <p className="text-sm font-semibold text-indigo-100">
                Phase 1 keeps this shared foundation focused on account context
                only.
              </p>
            </div>
            <Link href="/dashboard/settings" className="beast-button-secondary">
              Platform Settings
            </Link>
          </div>
        </section>

        {message ? (
          <DashboardCard accent={message.startsWith("Unable") ? "red" : "green"}>
            <p className="text-sm font-semibold text-[#dbe3ef]">{message}</p>
          </DashboardCard>
        ) : null}

        <section className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
          <DashboardCard accent="beastos">
            <SectionHeader
              eyebrow="Identity"
              title="How BeastOS should know you"
              description="Preferred name drives the Today greeting. Identity and context fields prepare shared BeastOS services without adding later-phase features."
            />

            {loading ? (
              <div className="mt-6 flex animate-pulse flex-col gap-3">
                <div className="h-10 rounded bg-[#2a3242]" />
                <div className="h-10 rounded bg-[#2a3242]" />
                <div className="h-10 rounded bg-[#2a3242]" />
              </div>
            ) : (
              <div className="mt-6 grid gap-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2 text-sm font-black uppercase text-[#7f8da3]">
                    Identity
                  </div>
                  <TextField
                    label="Preferred name"
                    value={form.preferred_name}
                    onChange={(value) => updateField("preferred_name", value)}
                    placeholder="Preferred name"
                  />
                  <TextField
                    label="Display name"
                    value={form.display_name}
                    onChange={(value) => updateField("display_name", value)}
                    placeholder="Display name"
                  />
                  <TextField
                    label="Full name"
                    value={form.full_name}
                    onChange={(value) => updateField("full_name", value)}
                    placeholder="Full name"
                  />
                  <TextField
                    label="Username / handle"
                    value={form.username}
                    onChange={(value) => updateField("username", value)}
                    placeholder="learning_handle"
                  />
                  <TextField
                    label="Birthday"
                    type="date"
                    value={form.birthday}
                    onChange={(value) => updateField("birthday", value)}
                  />
                  <TextField
                    label="Location"
                    value={form.location}
                    onChange={(value) => updateField("location", value)}
                    placeholder="City, region"
                  />
                  <TextField
                    label="Timezone"
                    value={form.timezone}
                    onChange={(value) => updateField("timezone", value)}
                    placeholder="America/New_York"
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2 text-sm font-black uppercase text-[#7f8da3]">
                    Preferences
                  </div>
                  <TextField
                    label="Current academic level"
                    value={form.current_academic_level}
                    onChange={(value) =>
                      updateField("current_academic_level", value)
                    }
                    placeholder="High school, college, certification prep, professional"
                  />
                  <TextField
                    label="Availability"
                    value={form.learning_availability}
                    onChange={(value) =>
                      updateField("learning_availability", value)
                    }
                    placeholder="30 minutes most weekdays"
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2 text-sm font-black uppercase text-[#7f8da3]">
                    AI Context
                  </div>
                  <TextAreaField
                    label="Learning context"
                    value={form.learning_preferences}
                    onChange={(value) =>
                      updateField("learning_preferences", value)
                    }
                    placeholder="Subjects, formats, or context Beast should keep close."
                  />
                  <TextAreaField
                    label="Personal context"
                    value={form.bio}
                    onChange={(value) => updateField("bio", value)}
                    placeholder="Add context BeastOS should remember when personalizing shared services."
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2 text-sm font-black uppercase text-[#7f8da3]">
                    Family and Career
                  </div>
                  <TextAreaField
                    label="Career interests"
                    value={form.career_interests}
                    onChange={(value) =>
                      updateField("career_interests", value)
                    }
                    placeholder="Careers, certifications, trades, or skills you are curious about."
                  />
                  <TextAreaField
                    label="Family or household context"
                    value={form.household_context}
                    onChange={(value) =>
                      updateField("household_context", value)
                    }
                    placeholder="Family, household, or support context BeastOS should account for."
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2 text-sm font-black uppercase text-[#7f8da3]">
                    Strengths and Areas I Need Help
                  </div>
                  <TextAreaField
                    label="Strengths"
                    value={form.learning_strengths}
                    onChange={(value) =>
                      updateField("learning_strengths", value)
                    }
                    placeholder="Topics or habits that already feel strong."
                  />
                  <TextAreaField
                    label="Areas I need help"
                    value={form.learning_help_areas}
                    onChange={(value) =>
                      updateField("learning_help_areas", value)
                    }
                    placeholder="Topics, habits, or study moments that feel hard."
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
                    <div className="text-sm font-semibold text-[#c7cfdb]">
                      Computed age
                    </div>
                    <div className="mt-2 text-3xl font-black text-white">
                      {age == null ? "Not set" : age}
                    </div>
                  </div>
                  <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
                    <div className="text-sm font-semibold text-[#c7cfdb]">
                      Notification preferences
                    </div>
                    <div className="mt-2 text-3xl font-black text-white">
                      Account default
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={saveProfile}
                disabled={loading || saving}
                className="beast-button disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Personal Hub"}
              </button>
              <button
                type="button"
                onClick={loadProfile}
                disabled={loading || saving}
                className="beast-button-secondary disabled:cursor-not-allowed disabled:opacity-60"
              >
                Reload
              </button>
            </div>
          </DashboardCard>

          <div className="space-y-4">
            <DashboardCard accent="blue">
              <SectionHeader
                eyebrow="Greeting Preview"
                title={`Welcome, ${greetingName}`}
                description="BeastOS Today uses preferred name, then display name, full name, email prefix, and finally user."
              />
            </DashboardCard>

            {entitlements.isAdmin ? (
              <DashboardCard accent="purple">
                <SectionHeader
                  eyebrow="Admin"
                  title="Membership context"
                  description={
                    entitlements.loading
                      ? "Membership context is loading from BeastOS services."
                      : `${formatLabel(
                          entitlements.membership.status
                        )} membership from ${entitlements.membership.source}.`
                  }
                />
              </DashboardCard>
            ) : null}

            <DashboardCard accent="documents">
              <SectionHeader
                eyebrow="Account Email"
                title={email || "Not signed in"}
                description="Authentication remains separate from editable profile context."
              />
            </DashboardCard>

            <DashboardCard accent="documents">
              <SectionHeader
                eyebrow="Protected Context"
                title="You control this information"
                description="Personal Hub separates editable account context from authentication records."
              />
            </DashboardCard>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FoundationStatus
            label="Privacy"
            value="Owner controlled"
            detail="Personal context remains account-scoped and is not shared across modules without permission."
          />
          <FoundationStatus
            label="Permissions"
            value={formatLabel(entitlements.context.role)}
            detail="Role context provides the first shared permission foundation."
          />
          <FoundationStatus
            label="Connected Accounts"
            value={email ? "Email connected" : "Not signed in"}
            detail="Authentication identity stays linked to Personal Hub without becoming editable profile text."
          />
          <FoundationStatus
            label="AI Context"
            value={formatConfigured(
              [
                form.bio,
                form.learning_preferences,
                form.learning_strengths,
                form.learning_help_areas,
              ].join(" ")
            )}
            detail="Shared AI can read owner-provided context without moving AI ownership into a single module."
          />
        </section>
      </div>
    </main>
  );
}
