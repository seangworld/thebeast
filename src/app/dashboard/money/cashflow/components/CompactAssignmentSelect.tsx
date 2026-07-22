"use client";

import { useId, useRef } from "react";

export type CompactAssignmentOption = { value: string; compactLabel: string; detailLabel: string };

export function CompactAssignmentSelect({ label, value, options, onChange }: {
  label: string;
  value: string;
  options: readonly CompactAssignmentOption[];
  onChange: (value: string) => void;
}) {
  const groupId = useId();
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const selected = options.find((option) => option.value === value);
  return (
    <details ref={detailsRef} className="relative min-w-0" data-compact-assignment-select="true">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-lg border border-[#2a3242] bg-[#0b1118] px-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300" aria-label={`${label}: ${selected?.detailLabel || "Unassigned"}`} title={selected?.detailLabel || "Unassigned"}>
        <span className="min-w-0 break-words">{selected?.compactLabel || "Unassigned"}</span><span aria-hidden="true">▾</span>
      </summary>
      <fieldset className="relative z-10 mt-2 grid min-w-0 gap-1 rounded-lg border border-[#2a3242] bg-[#111827] p-2 text-left shadow-xl">
        <legend className="sr-only">{label}</legend>
        {[{ value: "", compactLabel: "Unassigned", detailLabel: "Unassigned" }, ...options].map((option) => (
          <label key={`${groupId}-${option.value}`} className="flex min-h-11 cursor-pointer items-start gap-2 rounded px-2 py-2 hover:bg-[#1b2431] focus-within:ring-2 focus-within:ring-cyan-300">
            <input type="radio" name={groupId} value={option.value} checked={value === option.value} onChange={() => { onChange(option.value); if (detailsRef.current) detailsRef.current.open = false; }} />
            <span className="break-words">{option.detailLabel}</span>
          </label>
        ))}
      </fieldset>
    </details>
  );
}

export function compactIncomeLabel(label: string) {
  const withoutBalance = label.replace(/\s*\(\$[\d,.-]+ left\)\s*$/, "");
  const separator = withoutBalance.indexOf(" - ");
  return separator >= 0 ? withoutBalance.slice(separator + 3) : withoutBalance;
}
