"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getProfileDisplayName } from "@/lib/profile";
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
        },
        { email }
      ),
    [email, form.display_name, form.full_name, form.preferred_name]
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
      })
      .eq("id", userId);

    setSaving(false);

    if (error) {
      setMessage(`Unable to save profile: ${error.message}`);
      return;
    }

    setMessage("Profile saved. BeastOS will use your preferred name where it can.");
    await loadProfile();
  }

  return (
    <main className="beast-page">
      <div className="beast-container space-y-8">
        <section className="beast-page-header">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <ModuleBadge module="beastos" label="Identity Foundation" />
              <h1 className="beast-title">Profile</h1>
              <p className="beast-subtitle">
                Your profile helps BeastOS personalize your experience across
                Money, Learning, Health, Home, and future modules.
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
              description="Preferred name drives the Today greeting. Full name and context fields prepare BeastOS for future modules."
            />

            {loading ? (
              <div className="mt-6 flex animate-pulse flex-col gap-3">
                <div className="h-10 rounded bg-[#2a3242]" />
                <div className="h-10 rounded bg-[#2a3242]" />
                <div className="h-10 rounded bg-[#2a3242]" />
              </div>
            ) : (
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <TextField
                  label="Preferred name"
                  value={form.preferred_name}
                  onChange={(value) => updateField("preferred_name", value)}
                  placeholder="Sean"
                />
                <TextField
                  label="Display name"
                  value={form.display_name}
                  onChange={(value) => updateField("display_name", value)}
                  placeholder="Sean"
                />
                <TextField
                  label="Full name"
                  value={form.full_name}
                  onChange={(value) => updateField("full_name", value)}
                  placeholder="Sean World"
                />
                <TextField
                  label="Username / handle"
                  value={form.username}
                  onChange={(value) => updateField("username", value)}
                  placeholder="sean_gizzle"
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
                <div className="rounded-xl border border-[#2a3242] bg-[#111827] p-4">
                  <div className="text-sm font-semibold text-[#c7cfdb]">
                    Computed age
                  </div>
                  <div className="mt-2 text-3xl font-black text-white">
                    {age == null ? "Not set" : age}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <TextAreaField
                    label="Household / family context"
                    value={form.household_context}
                    onChange={(value) =>
                      updateField("household_context", value)
                    }
                    placeholder="Future BeastOS modules can use this for household, family, and shared-life context."
                  />
                </div>
                <div className="md:col-span-2">
                  <TextAreaField
                    label="Basic bio / context notes"
                    value={form.bio}
                    onChange={(value) => updateField("bio", value)}
                    placeholder="Add any context that helps BeastOS feel more personal and useful."
                  />
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
                {saving ? "Saving..." : "Save Profile"}
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

            <DashboardCard accent="purple">
              <SectionHeader
                eyebrow="Account Email"
                title={email || "Not signed in"}
                description="Authentication remains separate from editable profile context."
              />
            </DashboardCard>

            <DashboardCard accent="documents">
              <SectionHeader
                eyebrow="Ownership"
                title="You control this information"
                description="Your profile helps BeastOS personalize your experience. You control this information."
              />
            </DashboardCard>
          </div>
        </section>
      </div>
    </main>
  );
}
