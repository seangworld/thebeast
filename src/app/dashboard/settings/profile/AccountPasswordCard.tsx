"use client";

import { useState } from "react";
import { DashboardCard, SectionHeader } from "@/app/components/design/DashboardPrimitives";
import {
  getAuthErrorMessage,
  validateBeastPassword,
} from "@/lib/auth/experience";
import { createClient } from "@/lib/supabase/client";

export function AccountPasswordCard() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function savePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    const validation = validateBeastPassword(password);
    if (!validation.valid) {
      setError(
        "Use 12–72 characters with at least one letter and one number."
      );
      return;
    }

    if (password !== confirmation) {
      setError("The password confirmation does not match.");
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError("Sign in again before setting your Beast password.");
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });
      if (updateError) throw updateError;

      setPassword("");
      setConfirmation("");
      setMessage(
        "Your Beast password is ready. You can now use email and password or continue using magic links."
      );
    } catch (updateError) {
      setError(
        getAuthErrorMessage(
          updateError && typeof updateError === "object"
            ? (updateError as { code?: string; message?: string })
            : null
        )
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardCard accent="blue">
      <div id="account-password" className="scroll-mt-24">
        <SectionHeader
          eyebrow="Sign-in security"
          title="Set or change your password"
          description="Already use a magic link? Set your first password here without creating another account. Your existing Beast identity, data, and magic-link access stay unchanged."
        />

        <form className="mt-6 space-y-4" onSubmit={savePassword}>
          <label className="block">
            <span className="text-sm font-semibold text-[#c7cfdb]">
              New password
            </span>
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="beast-input mt-2"
              disabled={saving}
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[#c7cfdb]">
              Confirm new password
            </span>
            <input
              type="password"
              autoComplete="new-password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              className="beast-input mt-2"
              disabled={saving}
            />
          </label>
          <p className="text-xs leading-5 text-[#8d99aa]">
            Use 12–72 characters with at least one letter and one number.
          </p>

          {error ? (
            <p
              role="alert"
              className="rounded-xl border border-[#6b3440] bg-[#241319] p-3 text-sm text-[#efc4cd]"
            >
              {error}
            </p>
          ) : null}
          {message ? (
            <p
              role="status"
              className="rounded-xl border border-green-300/30 bg-green-300/10 p-3 text-sm text-green-100"
            >
              {message}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={saving}
            className="beast-button disabled:cursor-wait disabled:opacity-60"
          >
            {saving ? "Saving password…" : "Set Password"}
          </button>
        </form>
      </div>
    </DashboardCard>
  );
}
