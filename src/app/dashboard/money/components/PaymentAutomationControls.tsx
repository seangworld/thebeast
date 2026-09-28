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
  return <div className={`grid min-w-0 gap-2 ${compact ? "grid-cols-2 text-xs" : "text-sm"}`} data-payment-automation-controls="true">
    <label className={`flex min-h-11 cursor-pointer items-center gap-2 whitespace-nowrap rounded-lg border border-[#2a3242] focus-within:ring-2 focus-within:ring-cyan-300 ${compact ? "px-2" : "px-3"}`}><input type="checkbox" checked={values.autoPayEnabled} onChange={(event) => update("autoPayEnabled", event.target.checked)} aria-label={`${name} is on automatic payment`} aria-describedby={autoPayHelpId} /><span>Auto Pay at provider</span><span id={autoPayHelpId} className="sr-only">{name} is expected to be drafted automatically by its provider. BeastMoney does not schedule or send the payment, and this setting does not confirm that payment cleared.</span></label>
    <label className={`flex min-h-11 cursor-pointer items-center gap-2 whitespace-nowrap rounded-lg border border-[#2a3242] focus-within:ring-2 focus-within:ring-cyan-300 ${compact ? "px-2" : "px-3"}`}><input type="checkbox" checked={values.reminderEnabled} onChange={(event) => update("reminderEnabled", event.target.checked)} aria-label={`Remind me before ${name} is due`} /><span>BeastMoney reminder</span></label>
    {!compact ? <p className="text-xs leading-5 text-[#7f8da3]">Auto Pay records what you arranged with the biller or lender. BeastMoney does not enroll, schedule, or send payments. Reminders are BeastMoney notifications only.</p> : null}\n    <span className={`${compact ? "col-span-2" : ""} ${status === "error" ? "text-red-300" : "text-[#7f8da3]"}`} role="status" aria-live="polite">{status === "saving" ? "Saving…" : status === "saved" ? "Saved" : status === "error" ? "Save failed; previous settings restored." : ""}</span>
  </div>;
}
