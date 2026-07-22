"use client";

import { useId } from "react";
import { OverlayPopover } from "./OverlayPopover";

export type CompactAssignmentOption = { value: string; compactLabel: string; detailLabel: string };

export function CompactAssignmentSelect({ label, value, options, onChange }: {
  label: string;
  value: string;
  options: readonly CompactAssignmentOption[];
  onChange: (value: string) => void;
}) {
  const groupId = useId();
  const selected = options.find((option) => option.value === value);
  return (
    <div className="min-w-0" data-compact-assignment-select="true" aria-label={`${label}: ${selected?.detailLabel || "Unassigned"}`} title={selected?.detailLabel || "Unassigned"}>
      <OverlayPopover label={selected?.compactLabel || "Unassigned"} width={420} testId="assignment">
        {(close) => <fieldset className="grid min-w-0 gap-1" role="listbox" aria-label={label}>
        <legend className="sr-only">{label}</legend>
        {[{ value: "", compactLabel: "Unassigned", detailLabel: "Unassigned" }, ...options].map((option) => (
          <label key={`${groupId}-${option.value}`} className="flex min-h-11 cursor-pointer items-center gap-2 rounded px-2 py-2 whitespace-normal hover:bg-[#1b2431] focus-within:ring-2 focus-within:ring-cyan-300" role="option" aria-selected={value === option.value}>
            <input type="radio" name={groupId} value={option.value} checked={value === option.value} onChange={() => { onChange(option.value); close(); }} />
            <span>{option.detailLabel}</span>
          </label>
        ))}
        </fieldset>}
      </OverlayPopover>
    </div>
  );
}

export function compactIncomeLabel(label: string) {
  const withoutBalance = label.replace(/\s*\(\$[\d,.-]+ left\)\s*$/, "");
  const separator = withoutBalance.indexOf(" - ");
  return separator >= 0 ? withoutBalance.slice(separator + 3) : withoutBalance;
}
