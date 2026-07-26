import type { EducationResourceProvider } from "./types";

export type GuidanceDiscoveryProfile = {
  goal: string;
  currentSituation: string;
  strengths: string;
  growthAreas: string;
  constraints: string;
  weeklyHours: number;
  availableStudyTimeKnown: boolean;
  selectedProviders: EducationResourceProvider[];
  careerInterests: string[];
  educationalGoals: string[];
  learningPreferences: string[];
  certifications: string[];
  collegeInterest: boolean | null;
  tradeInterest: boolean | null;
  currentEmployment: string;
  militaryExperience: string;
  otherEducationalContext: string;
};

export function guidanceDiscoveryProfileFromRow(
  row: Record<string, unknown> | null | undefined
): GuidanceDiscoveryProfile {
  const strings = (value: unknown) =>
    Array.isArray(value) ? value.map(String).filter(Boolean) : [];
  return {
    goal: String(row?.goal ?? ""),
    currentSituation: String(row?.current_situation ?? ""),
    strengths: String(row?.strengths ?? ""),
    growthAreas: String(row?.growth_areas ?? ""),
    constraints: String(row?.constraints ?? ""),
    weeklyHours: Number(row?.weekly_hours ?? 0),
    availableStudyTimeKnown: Boolean(row?.available_study_time_known),
    selectedProviders: strings(
      row?.selected_providers
    ) as EducationResourceProvider[],
    careerInterests: strings(row?.career_interests),
    educationalGoals: strings(row?.educational_goals),
    learningPreferences: strings(row?.learning_preferences),
    certifications: strings(row?.certifications),
    collegeInterest:
      typeof row?.college_interest === "boolean" ? row.college_interest : null,
    tradeInterest:
      typeof row?.trade_interest === "boolean" ? row.trade_interest : null,
    currentEmployment: String(row?.current_employment ?? ""),
    militaryExperience: String(row?.military_experience ?? ""),
    otherEducationalContext: String(row?.other_educational_context ?? ""),
  };
}

function unique(values: readonly string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function captured(message: string, pattern: RegExp) {
  return message.match(pattern)?.[1]?.trim().replace(/[.!?]+$/, "") || "";
}

function withoutLeadingArticle(value: string) {
  return value.replace(/^(?:a|an|the)\s+/i, "").trim();
}

export function learnFromDiscoveryTurn(
  message: string,
  current: GuidanceDiscoveryProfile
) {
  const text = message.trim();
  const next: GuidanceDiscoveryProfile = { ...current };

  const career =
    captured(
      text,
      /\bi (?:want|hope|plan|would like|'d like) to (?:be|become|work (?:in|as)|pursue)\s+([^,.]+)(?:[,.]|$)/i
    ) ||
    captured(text, /\bi(?:'m| am) interested in\s+([^,.]+)(?:[,.]|$)/i) ||
    captured(text, /\bmy (?:career )?goal is (?:to )?(?:be|become|work (?:in|as)|pursue)?\s*([^,.]+)(?:[,.]|$)/i) ||
    captured(
      text,
      /\bi (?:currently )?work as [^,.]+?\s+and (?:want|hope|plan|would like) (?:a )?(?:career|job) (?:in|as)\s+([^,.]+)(?:[,.]|$)/i
    ) ||
    captured(text, /\bi (?:want|hope|plan|would like|'d like) (?:a )?(?:career|job) (?:in|as)\s+([^,.]+)(?:[,.]|$)/i);
  if (career) {
    const supportedCareer = withoutLeadingArticle(career);
    next.careerInterests = unique([
      ...current.careerInterests,
      supportedCareer,
    ]);
    if (!next.goal) next.goal = supportedCareer;
  }

  const educationalGoal =
    text.match(
      /\bi (?:want|hope|plan|would like|'d like|need) to (?:earn|get|complete|start|attend|study|learn|pursue)[^.!?]*\b(?:degree|college|university|certification|certificate|credential|course|program|training)\b[^.!?]*/i
    )?.[0]?.trim() ||
    text.match(
      /\bmy (?:education|educational) goal is[^.!?]+/i
    )?.[0]?.trim();
  if (educationalGoal) {
    next.educationalGoals = unique([...current.educationalGoals, text]);
    if (!next.goal) next.goal = text;
  }

  const employment = captured(
    text,
    /(?:i (?:currently )?work as|my current job is|i(?:'m| am) employed as)\s+([^,.]+?)(?:\s+and\s+(?:i\s+)?(?:want|hope|plan|would like)|[,.]|$)/i
  );
  if (employment) next.currentEmployment = withoutLeadingArticle(employment);

  if (
    /\b(?:i (?:am|was|serve|served)|i(?:'m| was)|my (?:military|service))\b[^.]*\b(military|army|navy|air force|marine|coast guard|space force|veteran|active duty)\b/i.test(
      text
    )
  ) {
    next.militaryExperience = text;
  }

  const strength = captured(
    text,
    /(?:i(?:'m| am) (?:good|strong) at|my strengths? (?:are|include)|i do well with)\s+(.+)/i
  );
  if (strength) next.strengths = strength;

  const growth = captured(
    text,
    /(?:i (?:need|want) to (?:improve|strengthen)|i struggle with|my weak(?:ness| areas?) (?:is|are))\s+(.+)/i
  );
  if (growth) next.growthAreas = growth;

  const hours =
    text.match(
      /\b(?:i\s+(?:can|could|have)|and\s+can)\s+(?:study|spend|protect|give|set aside)?\s*(\d{1,3}(?:\.\d+)?)\s*hours?\b/i
    )?.[1] ||
    text.match(
      /\bi(?:'m| am) available (?:to study )?for\s+(\d{1,3}(?:\.\d+)?)\s*hours?\b/i
    )?.[1];
  if (hours !== undefined) {
    next.weeklyHours = Math.max(0, Math.min(168, Number(hours)));
    next.availableStudyTimeKnown = true;
  }

  const preferences = [
    ["hands-on", /\b(hands.on|projects?|practice|learn by doing)\b/i],
    ["video", /\b(video|watching)\b/i],
    ["reading", /\b(reading|books?|written)\b/i],
    ["guided instruction", /\b(classroom|teacher|instructor|guided)\b/i],
    ["self-paced", /\b(self.paced|on my own|independent)\b/i],
  ] as const;
  if (
    /\b(?:i (?:really )?prefer|i learn best|i do best with|works? (?:best )?for me|helps? me learn)\b/i.test(
      text
    ) ||
    /(?:^|[,;]\s*)prefer\b/i.test(
      text
    )
  ) {
    next.learningPreferences = unique([
      ...current.learningPreferences,
      ...preferences
        .filter(([, pattern]) => pattern.test(text))
        .map(([label]) => label),
    ]);
  }

  if (
    /\b(?:i (?:have|hold|earned|completed|passed)|i(?:'m| am) certified (?:in|as)|my certifications? (?:are|include))\b[^.!?]*(?:\bcertif(?:ication|icate|ied)\b|\bcredential\b|\bexam\b|[A-Z][A-Za-z0-9-]*\+)/i.test(
      text
    )
  ) {
    next.certifications = unique([...current.certifications, text]);
  }
  if (
    /\bi(?:'m| am)\b[^.!?]{0,80}\b(?:considering|interested in|open to)\b[^.!?]*\b(college|university|degree)\b/i.test(
      text
    ) ||
    /\bi (?:want|plan|hope|would like) to (?:attend|go to|apply to|pursue)[^.!?]*\b(college|university|degree)\b/i.test(
      text
    )
  ) {
    next.collegeInterest = true;
  } else if (
    /\b(?:i(?:'m| am) not interested in|i do not want|i don't want|i(?:'m| am) not considering)\b[^.!?]*\b(college|university|degree)\b/i.test(
      text
    )
  ) {
    next.collegeInterest = false;
  }
  if (
    /\bi(?:'m| am)\b[^.!?]{0,80}\b(?:considering|interested in|open to)\b[^.!?]*\b(trade school|apprenticeship|skilled trade|vocational)\b/i.test(
      text
    ) ||
    /\bi (?:want|plan|hope|would like) to (?:attend|start|pursue)[^.!?]*\b(trade school|apprenticeship|skilled trade|vocational)\b/i.test(
      text
    )
  ) {
    next.tradeInterest = true;
  } else if (
    /\b(?:i(?:'m| am) not interested in|i do not want|i don't want|i(?:'m| am) not considering)\b[^.!?]*\b(trade school|apprenticeship|skilled trade|vocational)\b/i.test(
      text
    )
  ) {
    next.tradeInterest = false;
  }

  if (
    /\b(?:my .{0,30}(?:constraint|concern|problem|schedule)|i (?:can't|cannot|can only|need to work around|am limited by)|cost is (?:my concern|a concern for me)|my (?:money|budget) is tight|i can only study (?:in the )?evenings?|i can only study (?:on )?weekends?)\b/i.test(
      text
    )
  ) {
    next.constraints = text;
  }

  if (
    !next.currentSituation &&
    /\b(?:my current situation is|right now i(?:'m| am) (?:in school|a student|unemployed|between jobs|looking for work|working)|i(?:'m| am) currently (?:in school|a student|unemployed|between jobs|looking for work|working))\b/i.test(
      text
    )
  ) {
    next.currentSituation = text;
  }
  if (
    !next.otherEducationalContext &&
    (/\bi (?:completed|attended|studied|trained|graduated from)\b/i.test(
      text
    ) ||
      /\bi (?:have|finished|earned)\b[^.]*\b(?:education|training|experience|degree|diploma|certificate|certification|credential|course|program|school|college|university)\b/i.test(
        text
      ) ||
      /\bmy (?:education|educational|training) background (?:is|includes)\b/i.test(
        text
      ) ||
      /\bmy previous (?:education|training|experience) (?:is|includes)\b/i.test(
        text
      ))
  ) {
    next.otherEducationalContext = text;
  }

  return next;
}

export function nextDiscoveryQuestion(profile: GuidanceDiscoveryProfile) {
  if (!profile.goal && profile.careerInterests.length === 0) {
    return "What would you like education or career guidance to help you change?";
  }
  if (!profile.currentEmployment && !profile.militaryExperience) {
    return "What does your current work, school, or military situation look like?";
  }
  if (!profile.otherEducationalContext && profile.certifications.length === 0) {
    return "What education, training, certifications, or experience are you already bringing with you?";
  }
  if (!profile.strengths) {
    return "What kinds of work or learning tend to come naturally to you?";
  }
  if (!profile.growthAreas) {
    return "What is one skill or area you most want to strengthen?";
  }
  if (!profile.availableStudyTimeKnown) {
    return "About how many hours could you realistically protect for learning in a typical week?";
  }
  if (profile.learningPreferences.length === 0) {
    return "When learning goes well for you, what usually helps it click?";
  }
  if (!profile.constraints) {
    return "Is there one practical constraint I should plan around, such as cost, schedule, location, or family responsibilities?";
  }
  if (profile.collegeInterest === null && profile.tradeInterest === null) {
    return "Are you currently considering college, a skilled trade, certifications, or an experience-first path?";
  }
  return "What would you like us to work on first?";
}

export function discoveryProfileUpdate(profile: GuidanceDiscoveryProfile) {
  return {
    goal: profile.goal,
    current_situation: profile.currentSituation,
    strengths: profile.strengths,
    growth_areas: profile.growthAreas,
    constraints: profile.constraints,
    weekly_hours: profile.weeklyHours,
    available_study_time_known: profile.availableStudyTimeKnown,
    selected_providers: profile.selectedProviders,
    career_interests: profile.careerInterests,
    educational_goals: profile.educationalGoals,
    learning_preferences: profile.learningPreferences,
    certifications: profile.certifications,
    college_interest: profile.collegeInterest,
    trade_interest: profile.tradeInterest,
    current_employment: profile.currentEmployment,
    military_experience: profile.militaryExperience,
    other_educational_context: profile.otherEducationalContext,
    updated_at: new Date().toISOString(),
  };
}
