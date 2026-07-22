"use client";
import { useId, useState } from "react";

export type AutomationPatch = { auto_pay_enabled?: boolean; reminder_enabled?: boolean };

export function PaymentAutomationControls({ name, autoPayEnabled, reminderEnabled, onSave, compact = false }: {
  name: string; autoPayEnabled: boolean; reminderEnabled: boolean; compact?: boolean;
  onSave: (patch: AutomationPatch) => Promise<void>;
}) {
  const autoPayHelpId = useId();
  const [values, setValues] = useState({ autoPayEnabled, reminderEnabled });
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  async function update(key: "autoPayEnabled" | "reminderEnabled", checked: boolean) {
    const previous = values; const next = { ...values, [key]: checked }; setValues(next); setStatus("saving");
    try { await onSave(key === "autoPayEnabled" ? { auto_pay_enabled: checked } : { reminder_enabled: checked }); setStatus("saved"); }
    catch { setValues(previous); setStatus("error"); }
  }
  return <div className={`grid min-w-0 gap-2 ${compact ? "text-xs" : "text-sm"}`} data-payment-automation-controls="true">
    <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-[#2a3242] px-3 focus-within:ring-2 focus-within:ring-cyan-300"><input type="checkbox" checked={values.autoPayEnabled} onChange={(event) => update("autoPayEnabled", event.target.checked)} aria-label={`${name} is on automatic payment`} aria-describedby={autoPayHelpId} /><span>Auto Pay</span><span id={autoPayHelpId} className="sr-only">{name} is expected to be drafted automatically by its provider. This does not confirm payment.</span></label>
    <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-[#2a3242] px-3 focus-within:ring-2 focus-within:ring-cyan-300"><input type="checkbox" checked={values.reminderEnabled} onChange={(event) => update("reminderEnabled", event.target.checked)} aria-label={`Remind me before ${name} is due`} /><span>Reminder</span></label>
    <span className={status === "error" ? "text-red-300" : "text-[#7f8da3]"} role="status" aria-live="polite">{status === "saving" ? "Saving…" : status === "saved" ? "Saved" : status === "error" ? "Save failed; previous settings restored." : ""}</span>
  </div>;
}
