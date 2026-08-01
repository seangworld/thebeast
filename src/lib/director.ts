export const directorProfessionalId = "beastfusion.fusion-director";

export type DirectorDomain = "money" | "education" | "health" | "goals";

export type DirectorSignal = {
  id: string;
  domain: DirectorDomain;
  label: string;
  status: string;
  date: string | null;
  detail: string;
  href: string;
  source: string;
  updatedAt: string | null;
};

export type DirectorContext = {
  signals: readonly DirectorSignal[];
  specialistSummaries: readonly {
    professionalId: string;
    professionalName: string;
    summary: string;
    updatedAt: string;
    href: string;
  }[];
  unavailableSources: readonly string[];
};

export type DirectorContribution = {
  professionalId: string;
  professionalName: string;
  supportingRecord: string;
  source: string;
  date: string;
  confidence: "low" | "medium" | "high";
  importantLimitation: string;
  href: string;
};

export type DirectorRecommendation = {
  answer: string;
  whatChanged: string;
  whyItMatters: string;
  nextStep: string;
  recommendedProfessional: string;
  recommendedHref: string;
  domains: readonly DirectorDomain[];
  contributions: readonly DirectorContribution[];
  conflicts: readonly string[];
  limitations: readonly string[];
};

const domainDefinitions: Record<
  DirectorDomain,
  {
    name: string;
    id: string;
    href: string;
    limitation: string;
    words: readonly string[];
  }
> = {
  money: {
    name: "Money Coach",
    id: "beastmoney.money-coach",
    href: "/dashboard/money/coach",
    limitation:
      "The Money Coach can explain records and planning tradeoffs, but cannot provide individualized investment or tax advice.",
    words: [
      "money",
      "debt",
      "bill",
      "budget",
      "afford",
      "cost",
      "payment",
      "cash",
      "finance",
      "tax",
      "invest",
    ],
  },
  education: {
    name: "Guidance Counselor",
    id: "beasteducation.guidance-counselor",
    href: "/dashboard/education/guidance-counselor",
    limitation:
      "The Guidance Counselor cannot guarantee admission, credentials, employment, promotion, or salary outcomes.",
    words: [
      "education",
      "school",
      "college",
      "career",
      "course",
      "certificate",
      "degree",
      "job",
      "promotion",
      "salary",
    ],
  },
  health: {
    name: "Health Advisor",
    id: "beasthealth.health-advisor",
    href: "/dashboard/health/ai-advisor",
    limitation:
      "The Health Advisor cannot diagnose, prescribe, interpret clinical significance, or tell you to start, stop, or change medication.",
    words: [
      "health",
      "doctor",
      "medicine",
      "medication",
      "condition",
      "appointment",
      "symptom",
      "diagnose",
      "treatment",
    ],
  },
  goals: {
    name: "Director",
    id: directorProfessionalId,
    href: "/dashboard/goals",
    limitation:
      "The Director can recommend a next step but cannot modify an authoritative goal without your approval.",
    words: [
      "goal",
      "priority",
      "next",
      "plan",
      "deadline",
      "milestone",
      "important",
    ],
  },
};

export function classifyDirectorQuestion(question: string): DirectorDomain[] {
  const normalized = question.toLowerCase();
  const domains = (Object.keys(domainDefinitions) as DirectorDomain[]).filter(
    (domain) =>
      domainDefinitions[domain].words.some((word) => normalized.includes(word))
  );
  return domains.length ? domains : ["goals"];
}

function signalPriority(signal: DirectorSignal, now: Date) {
  const today = now.toISOString().slice(0, 10);
  if (
    signal.domain === "health" &&
    /urgent|emergency/i.test(`${signal.status} ${signal.detail}`)
  )
    return 100;
  if (signal.domain === "money" && signal.date && signal.date < today)
    return 90;
  if (/blocked|overdue|late/i.test(signal.status)) return 85;
  if (signal.date) {
    const days = Math.ceil(
      (Date.parse(signal.date) - Date.parse(today)) / (24 * 60 * 60 * 1000)
    );
    if (days <= 1) return 80;
    if (days <= 7) return 70;
    if (days <= 30) return 60;
  }
  if (/active|planned|in_progress/i.test(signal.status)) return 50;
  return 30;
}

function specialistFor(domain: DirectorDomain) {
  return domainDefinitions[domain];
}

export function buildDirectorRecommendation({
  question,
  context,
  now = new Date(),
}: {
  question: string;
  context: DirectorContext;
  now?: Date;
}): DirectorRecommendation {
  const domains = classifyDirectorQuestion(question);
  const relevantSignals = context.signals.filter((signal) =>
    domains.includes(signal.domain)
  );
  const candidates = relevantSignals.length ? relevantSignals : context.signals;
  const prioritized = [...candidates].sort(
    (left, right) =>
      signalPriority(right, now) - signalPriority(left, now) ||
      (left.date || "9999-12-31").localeCompare(right.date || "9999-12-31")
  )[0];
  const primaryDomain = prioritized?.domain || domains[0];
  const primaryProfessional = specialistFor(primaryDomain);
  const requestedSpecialists = domains
    .filter((domain) => domain !== "goals")
    .map(specialistFor);
  const contributions = requestedSpecialists.map((professional) => {
    const domain = (Object.keys(domainDefinitions) as DirectorDomain[]).find(
      (candidate) => domainDefinitions[candidate].id === professional.id
    )!;
    const supportingSignal = context.signals.find(
      (signal) => signal.domain === domain
    );
    const savedSummary = context.specialistSummaries.find(
      (summary) => summary.professionalId === professional.id
    );
    return {
      professionalId: professional.id,
      professionalName: professional.name,
      supportingRecord:
        supportingSignal?.label || savedSummary?.summary || "No saved summary was available",
      source:
        supportingSignal?.source ||
        (savedSummary ? "Saved specialist conversation" : "Unavailable"),
      date:
        supportingSignal?.updatedAt || savedSummary?.updatedAt || now.toISOString(),
      confidence: supportingSignal || savedSummary ? "medium" : "low",
      importantLimitation: professional.limitation,
      href: professional.href,
    } satisfies DirectorContribution;
  });
  const crossDomain = new Set(domains.filter((domain) => domain !== "goals"));
  const conflicts =
    crossDomain.has("money") && crossDomain.has("education")
      ? [
          "Education timing or cost may affect the financial plan. Confirm both before changing either plan.",
        ]
      : crossDomain.has("health") && crossDomain.size > 1
        ? [
            "Health timing may affect other deadlines. Keep clinical decisions with a qualified clinician and adjust planning only after the timing is confirmed.",
          ]
        : [];
  const whatChanged = prioritized
    ? `${prioritized.label} is the strongest current signal (${prioritized.status}).`
    : "No dated or overdue record was available, so the Director is using your question to choose the next specialist.";
  const whyItMatters = prioritized?.detail ||
    "Starting with one specialist keeps the next step clear while missing context is verified.";
  const nextStep = prioritized
    ? `Open ${primaryProfessional.name} or the linked workspace and review ${prioritized.label}.`
    : `Open ${primaryProfessional.name} and add the missing context before changing a plan.`;
  const unavailable = context.unavailableSources.length
    ? `Unavailable context: ${context.unavailableSources.join(", ")}.`
    : "";
  const limitations = Array.from(
    new Set([
      ...requestedSpecialists.map((professional) => professional.limitation),
      "The Director coordinates approved summaries and does not impersonate a specialist or change authoritative records.",
      "Household information remains owner-scoped and is never shared across members by this response.",
      unavailable,
    ].filter(Boolean))
  );

  return {
    answer: `What matters most next: ${whatChanged} ${nextStep}`,
    whatChanged,
    whyItMatters,
    nextStep,
    recommendedProfessional: primaryProfessional.name,
    recommendedHref: prioritized?.href || primaryProfessional.href,
    domains,
    contributions,
    conflicts,
    limitations,
  };
}
