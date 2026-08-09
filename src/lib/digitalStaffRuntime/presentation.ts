const labelOverrides: Record<string, string> = {
  military_service: "Military Service",
  veteran_disability_status: "Veteran Disability Status",
  security_clearance: "Security Clearance",
  mos_code: "MOS Code",
  mos_title: "MOS Title",
  education_funding: "Education Funding",
  career_goal: "Career Goal",
  education_goal: "Education Goal",
};

export function humanizeDigitalStaffLabel(value: string) {
  const normalized = value.trim().replace(/([a-z0-9])([A-Z])/g, "$1_$2").replace(/[\s-]+/g, "_").toLowerCase();
  if (labelOverrides[normalized]) return labelOverrides[normalized];
  return normalized.split("_").filter(Boolean).map((part) => part.length <= 3 ? part.toUpperCase() : `${part[0].toUpperCase()}${part.slice(1)}`).join(" ");
}
