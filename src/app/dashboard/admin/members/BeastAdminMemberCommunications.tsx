"use client";

import { useState } from "react";
import type { BeastAdminMemberDirectoryEntry } from "@/lib/beastAdminMemberTimeline";
import {
  getMemberMailTemplateOptions, memberMailTemplates,
  MEMBER_MAIL_ADDRESS, MEMBER_MAIL_LIMIT, type MemberMailCategory,
} from "@/lib/beastAdminMemberCommunications";

type Preview = {
  id: string;
  expires: number;
  signature: string;
  previewMode: boolean;
  subject: string;
  body: string;
  selection: string[];
  recipients: { id: string; email: string }[];
};

export function BeastAdminMemberCommunications({ ids, members }: {
  ids: string[];
  members: BeastAdminMemberDirectoryEntry[];
}) {
  const [open, setOpen] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<MemberMailCategory>("account_setup");
  const [savedPreview, setPreview] = useState<Preview | null>(null);
  const preview = savedPreview?.selection === ids ? savedPreview : null;
  const officialVerification = category === "verification";
  const [transactionalOnly, setTransactionalOnly] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");

  const options = getMemberMailTemplateOptions(members, ids);

  function useTemplate(template: keyof typeof memberMailTemplates | "blank") {
    if (template === "blank") {
      setSubject("");
      setBody("");
      if (officialVerification) setCategory(options.recommended ?? "account_setup");
    } else {
      setCategory(template);
      setSubject(memberMailTemplates[template].subject);
      setBody(memberMailTemplates[template].body);
    }
    setPreview(null);
    setTransactionalOnly(false);
    setResult("");
  }

  function toggleComposer() {
    if (!initialized) {
      setInitialized(true);
      if (options.recommended) useTemplate(options.recommended);
    }
    setOpen(!open);
  }

  async function submit(action: "preview" | "send") {
    setBusy(true);
    setResult("");
    try {
      const response = await fetch("/api/admin/members/communications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action, category, ids, subject, body,
          ...(action === "send" && preview ? {
            id: preview.id, expires: preview.expires, signature: preview.signature, confirmed: true, transactionalOnly,
          } : {}),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error || "The campaign could not be completed.");
      if (action === "preview") { setPreview({ ...data, selection: ids }); setTransactionalOnly(false); }
      else {
        setPreview(null);
        setResult(data.simulated
          ? `Preview simulation completed for ${data.count} recipients. No emails sent.`
           : data.outcomes && preview
            ? preview.recipients.map(({ id, email }) => `${email}: ${data.outcomes[id] ?? "unconfirmed"}`).join("\n")
            : `Provider accepted ${data.accepted}, rejected ${data.rejected}, uncertain ${data.uncertain}. Owner summary: ${data.summary}. Acceptance does not confirm inbox delivery.`);
      }
    } catch (error) {
      setResult(error instanceof Error ? error.message : "The campaign could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  if (!ids.length) return null;
  return (
    <section className="mt-3 grid min-w-0 gap-3 rounded-2xl border border-[#2a3242] bg-[#0b1220] p-4">
      <button className="beast-button w-fit" type="button" onClick={toggleComposer} aria-expanded={open}>
        {open ? "Close Compose Email" : "Compose Email"}
      </button>
      {open && <>
        <h2 className="font-black text-white">Member Communications</h2>
        <p>{ids.length} selected. Preview checks the current recipients before confirmation.</p>
        <label className="grid gap-1">Message type
          <select className="beast-input w-full" value={category} disabled={busy}
            onChange={(event) => { setCategory(event.target.value as MemberMailCategory); setPreview(null); }}>
            <option value="account_setup">Username setup reminder</option>
            <option value="verification">Resend Verification</option>
            <option value="onboarding">Unverified onboarding reminder</option>
          </select>
        </label>
        <p>{category === "account_setup"
          ? "Eligible recipients are active, verified members who still need a username."
          : "Eligible recipients are unverified members with an existing signup email. Verification uses the existing account."}</p>
        {category === "onboarding" && <p>The reminder includes a link to request official verification. It does not verify the account.</p>}
        {!officialVerification && <>
        <div className="grid gap-2">
          <p>{options.setup} eligible for username setup · {options.onboarding} eligible for onboarding.</p>
          <p>{options.recommended
            ? `Suggested template: ${options.recommended === "account_setup" ? "Username setup" : "Unverified onboarding"}.`
            : options.setup || options.onboarding
              ? "Selection includes different eligibility states. Choose a compatible template and preview its recipients."
              : "No selected members are eligible for these reminders."}</p>
          <div className="flex flex-wrap gap-2">
            <button className="beast-button-secondary" type="button" disabled={busy || !options.setup}
              onClick={() => useTemplate("account_setup")}>Use username setup template</button>
            <button className="beast-button-secondary" type="button" disabled={busy || !options.onboarding}
              onClick={() => useTemplate("onboarding")}>Use onboarding template</button>
            <button className="beast-button-secondary" type="button" disabled={busy}
              onClick={() => useTemplate("blank")}>Start blank draft</button>
          </div>
          <p>Choosing a template or starting blank replaces the current subject and message.</p>
        </div>
        <label className="grid gap-1">Subject
          <input className="beast-input w-full" value={subject} maxLength={160} disabled={busy}
            onChange={(event) => { setSubject(event.target.value); setPreview(null); }} />
        </label>
        <label className="grid gap-1">Message
          <textarea aria-label="Message" className="beast-input w-full" rows={5} value={body} maxLength={4000} disabled={busy}
            onChange={(event) => { setBody(event.target.value); setPreview(null); }} />
        </label>
        </>}
        <button className="beast-button w-fit" type="button"
          disabled={busy || ids.length > MEMBER_MAIL_LIMIT || (!officialVerification && (!subject.trim() || !body.trim()))}
          onClick={() => void submit("preview")}>Preview Email</button>
        {ids.length > MEMBER_MAIL_LIMIT && <p>Select up to five members per campaign.</p>}
        {preview && <div className="grid gap-2 rounded-lg border border-slate-600 p-3">
          <strong>{preview.recipients.length} eligible recipients from {ids.length} selected</strong>
          <ul className="break-all">{preview.recipients.map((recipient) => <li key={recipient.id}>{recipient.email}</li>)}</ul>
          <p>{officialVerification ? "Supabase Auth sends the official verification email separately to each recipient."
            : `Each recipient gets a separate email. From and Reply-To are ${MEMBER_MAIL_ADDRESS}.`}</p>
          <strong className="break-words">{preview.subject}</strong>
          <p className="whitespace-pre-wrap break-words">{preview.body}</p>
          {!officialVerification && <label className="flex items-start gap-2">
            <input type="checkbox" checked={transactionalOnly} disabled={busy}
              onChange={(event) => setTransactionalOnly(event.target.checked)} />
            This message is a transactional account reminder and contains no marketing.
          </label>}
          <button className="beast-button w-fit" type="button" disabled={busy || (!officialVerification && !transactionalOnly)} onClick={() => void submit("send")}>
            {preview.previewMode ? "Confirm Preview Simulation" : officialVerification ? "Confirm Resend Verification" : `Confirm Send to ${preview.recipients.length} members`}
          </button>
        </div>}
        {result && <p role="status" className="whitespace-pre-wrap break-words">{result}</p>}
      </>}
    </section>
  );
}
