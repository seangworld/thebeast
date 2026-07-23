import {
  calculateObservationPriority,
  createObservationEvidenceSignature,
  createObservationFingerprint,
  SharedObservationIntelligence,
  type Observation,
  type ObservationDetector,
  type ObservationDraft,
  type ObservationEvidenceItem,
  type ObservationSeverity,
  type ObservationType,
} from "../platform/agents";

const specialistId = "beasteducation.guidance-counselor";

export type LearningObservationAttempt = {
  id: string;
  title: string;
  completedAt: string;
  strengths: readonly string[];
  weakConcepts: readonly string[];
  reviewDue?: boolean;
  confidenceScore?: number;
  durationMinutes?: number;
  personalBaselineMinutes?: number;
  readingWordsPerMinute?: number;
};

export type LearningObservationData = {
  attempts: readonly LearningObservationAttempt[];
  completedCourses?: readonly {
    id: string;
    title: string;
    completedAt: string;
  }[];
};

type DraftInput = {
  key: readonly (string | number)[];
  category: string;
  type: ObservationType;
  title: string;
  summary: string;
  detail: string;
  whyNoticed: string;
  whyItMayMatter: string;
  evidence: ObservationEvidenceItem[];
  ruleId: string;
  ruleDescription: string;
  severity: ObservationSeverity;
  urgency: number;
  materiality: number;
  confidence: number;
  workspaceTarget: string;
};

function fact(
  id: string,
  label: string,
  value: string | number | boolean,
  observedAt: string,
  recordId: string
): ObservationEvidenceItem {
  return {
    id,
    kind: "fact",
    label,
    value,
    source: "beasteducation.learning-records",
    observedAt,
    recordId,
  };
}

function draft(asOf: string, input: DraftInput): ObservationDraft {
  const priority = calculateObservationPriority({
    urgency: input.urgency,
    materiality: input.materiality,
    memberRelevance: 90,
    actionability: 75,
    confidence: input.confidence,
  });
  return {
    fingerprint: createObservationFingerprint([specialistId, ...input.key]),
    evidenceSignature: createObservationEvidenceSignature(input.evidence),
    domain: "education",
    category: input.category,
    type: input.type,
    time: { observedAt: asOf, periodLabel: "Current personal learning review" },
    evidence: input.evidence,
    provenance: {
      ruleId: input.ruleId,
      ruleDescription: input.ruleDescription,
      sourceSystems: ["beasteducation.learning-records"],
      supportingRecordIds: input.evidence.flatMap(({ recordId }) =>
        recordId ? [recordId] : []
      ),
      retrievedAt: asOf,
      freshness: "current",
      limitations: [
        "This insight uses only authenticated BeastEducation records.",
        "It is an educational observation, not a guarantee of grades, admissions, credentials, or future performance.",
      ],
    },
    assessment: {
      ...priority,
      severity: input.severity,
      confidence: input.confidence,
      urgency: input.urgency,
      materiality: input.materiality,
      memberRelevance: 90,
      actionability: 75,
    },
    presentation: {
      title: input.title,
      summary: input.summary,
      detail: input.detail,
      whyNoticed: input.whyNoticed,
      whyItMayMatter: input.whyItMayMatter,
      workspaceTarget: input.workspaceTarget,
      suggestedQuestion: `Ask your Mentor to explain ${input.category.toLowerCase()}.`,
    },
    relatedEntityIds: input.evidence.flatMap(({ recordId }) =>
      recordId ? [recordId] : []
    ),
  };
}

function newestFirst(attempts: readonly LearningObservationAttempt[]) {
  return [...attempts].sort(
    (a, b) =>
      new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
  );
}

const mentorInsightDetector: ObservationDetector<LearningObservationData> = {
  id: "education.mentor-insights",
  specialistId,
  domain: "education",
  supportedTypes: ["Improvement", "Trend", "Follow-up item", "Milestone"],
  detect(context) {
    const attempts = newestFirst(context.data.attempts);
    const observations: ObservationDraft[] = [];

    for (const current of attempts) {
      for (const concept of current.strengths) {
        const earlierWeak = attempts.find(
          (attempt) =>
            new Date(attempt.completedAt) < new Date(current.completedAt) &&
            attempt.weakConcepts.some(
              (weak) => weak.toLowerCase() === concept.toLowerCase()
            )
        );
        if (!earlierWeak) continue;
        const evidence = [
          fact(
            `weak-${concept}`,
            `${concept} earlier learning signal`,
            "Needed reinforcement",
            earlierWeak.completedAt,
            earlierWeak.id
          ),
          fact(
            `strength-${concept}`,
            `${concept} latest learning signal`,
            "Recorded strength",
            current.completedAt,
            current.id
          ),
        ];
        observations.push(
          draft(context.asOf, {
            key: ["concept-recovery", concept],
            category: concept,
            type: "Improvement",
            title: `You're improving in ${concept}`,
            summary: `${concept} changed from a saved weak-area signal to a recorded strength.`,
            detail: `An earlier activity identified ${concept} for reinforcement, while ${current.title} recorded it as a strength.`,
            whyNoticed: "The same concept moved from weak-area evidence to strength evidence across two saved attempts.",
            whyItMayMatter: "A repeated concept moving in this direction is useful evidence of learning progress.",
            evidence,
            ruleId: "education.concept.recovery",
            ruleDescription: "Compare an earlier weak-concept signal with a later strength signal for the same concept.",
            severity: "positive",
            urgency: 20,
            materiality: 75,
            confidence: 0.9,
            workspaceTarget: "/dashboard/education/history",
          })
        );
      }

      if (current.reviewDue) {
        const evidence = [
          fact(
            `review-${current.id}`,
            "Saved review state",
            "Review due",
            current.completedAt,
            current.id
          ),
        ];
        observations.push(
          draft(context.asOf, {
            key: ["review-due", current.id],
            category: "Review",
            type: "Follow-up item",
            title: `Review is recommended for ${current.title}`,
            summary: "The completed activity is marked for educational review.",
            detail: "This recommendation comes from the saved learning outcome, not from a generic schedule.",
            whyNoticed: "The activity's current session state is review due.",
            whyItMayMatter: "A focused review can reinforce the concept before the learning path adds more complexity.",
            evidence,
            ruleId: "education.review.due",
            ruleDescription: "Surface completed activities whose saved outcome explicitly requires review.",
            severity: "caution",
            urgency: 65,
            materiality: 60,
            confidence: 0.95,
            workspaceTarget: "/dashboard/education/reviews",
          })
        );
      }
    }

    const confidenceAttempts = attempts.filter(
      ({ confidenceScore }) => confidenceScore !== undefined
    );
    if (confidenceAttempts.length >= 2) {
      const [current, prior] = confidenceAttempts;
      if (
        current.confidenceScore !== undefined &&
        prior.confidenceScore !== undefined &&
        current.confidenceScore > prior.confidenceScore
      ) {
        const evidence = [
          fact("confidence-current", "Current confidence", current.confidenceScore, current.completedAt, current.id),
          fact("confidence-prior", "Prior confidence", prior.confidenceScore, prior.completedAt, prior.id),
        ];
        observations.push(
          draft(context.asOf, {
            key: ["confidence-increase"],
            category: "Confidence",
            type: "Improvement",
            title: "Your recorded confidence has increased",
            summary: `Confidence moved from ${prior.confidenceScore} to ${current.confidenceScore} across saved reflections.`,
            detail: "This describes the learner's recorded confidence, which is related to—but not the same as—demonstrated mastery.",
            whyNoticed: "The two most recent numeric confidence records moved upward.",
            whyItMayMatter: "Growing confidence can support persistence when it remains aligned with demonstrated understanding.",
            evidence,
            ruleId: "education.confidence.increase",
            ruleDescription: "Compare the two most recent saved numeric confidence reflections.",
            severity: "positive",
            urgency: 15,
            materiality: 55,
            confidence: 0.88,
            workspaceTarget: "/dashboard/education/history",
          })
        );
      }
    }

    const pace = attempts.find(
      ({ durationMinutes, personalBaselineMinutes }) =>
        durationMinutes !== undefined &&
        personalBaselineMinutes !== undefined &&
        personalBaselineMinutes > 0 &&
        durationMinutes < personalBaselineMinutes
    );
    if (pace?.durationMinutes !== undefined && pace.personalBaselineMinutes !== undefined) {
      const evidence = [
        fact("pace-current", "Current completion time", pace.durationMinutes, pace.completedAt, pace.id),
        fact("pace-baseline", "Personal baseline time", pace.personalBaselineMinutes, pace.completedAt, pace.id),
      ];
      observations.push(
        draft(context.asOf, {
          key: ["personal-pace", pace.id],
          category: "Learning pace",
          type: "Improvement",
          title: `You completed ${pace.title} faster than your personal baseline`,
          summary: `The activity took ${pace.durationMinutes} minutes compared with your ${pace.personalBaselineMinutes}-minute personal baseline.`,
          detail: "This compares only with your own saved pace and does not imply greater mastery by itself.",
          whyNoticed: "A current duration and a valid personal baseline were both available.",
          whyItMayMatter: "A shorter completion time may reflect growing fluency when accuracy and mastery evidence also remain strong.",
          evidence,
          ruleId: "education.pace.personal-baseline",
          ruleDescription: "Compare activity duration only with the learner's own saved baseline.",
          severity: "positive",
          urgency: 10,
          materiality: 50,
          confidence: 0.85,
          workspaceTarget: "/dashboard/education/history",
        })
      );
    }

    const reading = attempts.filter(
      ({ readingWordsPerMinute }) => readingWordsPerMinute !== undefined
    );
    if (
      reading.length >= 2 &&
      (reading[0].readingWordsPerMinute || 0) >
        (reading[1].readingWordsPerMinute || 0)
    ) {
      const evidence = [
        fact("reading-current", "Current reading speed", reading[0].readingWordsPerMinute || 0, reading[0].completedAt, reading[0].id),
        fact("reading-prior", "Prior reading speed", reading[1].readingWordsPerMinute || 0, reading[1].completedAt, reading[1].id),
      ];
      observations.push(
        draft(context.asOf, {
          key: ["reading-speed"],
          category: "Reading",
          type: "Improvement",
          title: "Your recorded reading speed improved",
          summary: `Reading speed moved from ${reading[1].readingWordsPerMinute} to ${reading[0].readingWordsPerMinute} words per minute.`,
          detail: "Speed is one learning signal and should be considered alongside comprehension.",
          whyNoticed: "Two comparable saved reading-speed measurements were available.",
          whyItMayMatter: "Improved fluency can make reading less effortful when comprehension remains steady.",
          evidence,
          ruleId: "education.reading.speed-change",
          ruleDescription: "Compare the two most recent comparable reading-speed measurements.",
          severity: "positive",
          urgency: 10,
          materiality: 50,
          confidence: 0.9,
          workspaceTarget: "/dashboard/education/history",
        })
      );
    }

    const weakCounts = new Map<string, LearningObservationAttempt[]>();
    for (const attempt of attempts) {
      for (const concept of attempt.weakConcepts) {
        weakCounts.set(concept, [...(weakCounts.get(concept) || []), attempt]);
      }
    }
    for (const [concept, records] of Array.from(weakCounts.entries())) {
      if (records.length < 2) continue;
      const evidence = records.slice(0, 3).map((record, index) =>
        fact(`weak-repeat-${index}`, `${concept} difficulty signal`, true, record.completedAt, record.id)
      );
      observations.push(
        draft(context.asOf, {
          key: ["repeated-difficulty", concept],
          category: concept,
          type: "Trend",
          title: `${concept} is still taking extra work`,
          summary: `${concept} appeared as a weak area in ${records.length} saved activities.`,
          detail: "The pattern is based on repeated saved difficulty signals, not a judgment about ability.",
          whyNoticed: "The same weak concept appeared in at least two completed activity records.",
          whyItMayMatter: "Repeated difficulty can mean the next lesson should use a smaller step or a different explanation.",
          evidence,
          ruleId: "education.difficulty.repeated",
          ruleDescription: "Detect the same weak concept across at least two saved attempts.",
          severity: "caution",
          urgency: 60,
          materiality: 70,
          confidence: 0.9,
          workspaceTarget: "/dashboard/education/reviews",
        })
      );
    }

    for (const course of context.data.completedCourses || []) {
      const evidence = [
        fact(`course-${course.id}`, "Course completion", course.title, course.completedAt, course.id),
      ];
      observations.push(
        draft(context.asOf, {
          key: ["course-complete", course.id],
          category: "Achievement",
          type: "Milestone",
          title: `You completed ${course.title}`,
          summary: "A saved course record reached completed status.",
          detail: "This milestone reflects the course completion record; separate mastery or certificate requirements may still apply.",
          whyNoticed: "The authenticated course record is marked completed.",
          whyItMayMatter: "Course completion is a meaningful step in the current learning path.",
          evidence,
          ruleId: "education.course.completed",
          ruleDescription: "Recognize authenticated course records with completed status.",
          severity: "positive",
          urgency: 10,
          materiality: 80,
          confidence: 0.98,
          workspaceTarget: "/dashboard/education/achievements",
        })
      );
    }

    return { observations };
  },
};

export function createMentorObservationIntelligence() {
  const engine = new SharedObservationIntelligence();
  engine.registerDetector(mentorInsightDetector);
  return engine;
}

export function buildMentorInsights(
  data: LearningObservationData,
  ownerId: string,
  asOf = new Date().toISOString()
): Observation[] {
  return createMentorObservationIntelligence().analyze({
    ownerId,
    specialistId,
    asOf,
    data,
    authorizedDomains: ["education"],
  });
}
