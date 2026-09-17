export type HealthSpotlight = { title: string; description: string; href: string };

// Recurring observances verified against the linked organizations, September 17, 2026.
// Other months use an evergreen spotlight rather than inventing an observance.
const observances: Partial<Record<number, HealthSpotlight>> = {
  3: { title: "National Kidney Month", description: "Make room for kidney health. Explore resources and bring your questions to your next appointment.", href: "https://www.niddk.nih.gov/health-information/community-health-outreach/national-kidney-month" },
  6: { title: "PTSD Awareness Month", description: "Recognize the people living with PTSD and those supporting them. Learn about support and treatment resources from VA.", href: "https://www.ptsd.va.gov/understand/awareness/index.asp" },
  9: { title: "Suicide Prevention Month", description: "Connection matters. Check in with someone you care about, learn how to listen, and share support resources.", href: "https://988lifeline.org/promote-national-suicide-prevention-month/" },
  10: { title: "Breast Cancer Awareness Month", description: "Honor those affected, celebrate support and survivorship, and explore breast health resources.", href: "https://www.nationalbreastcancer.org/breast-cancer-awareness-month/" },
  11: { title: "National Diabetes Month", description: "Support people living with diabetes and learn about prevention and ongoing care.", href: "https://www.niddk.nih.gov/health-information/community-health-outreach/national-diabetes-month" },
};

export function getHealthAwareness(date: Date) {
  const month = date.getMonth() + 1;
  return {
    monthLabel: date.toLocaleDateString("en-US", { month: "long" }),
    observance: Boolean(observances[month]),
    spotlight: observances[month] ?? {
      title: "Make time for your health",
      description: "Celebrate the small steps: prepare questions for your provider, review your records, and make time to support someone you care about.",
      href: "https://www.prevention.va.gov/Healthy_Living/",
    },
    showFluReminder: month >= 9 || month <= 3,
  };
}
