import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  DEBT_STRATEGIES,
  getDebtStrategyDescription,
  getDebtStrategyLabel,
  normalizeDebtStrategy,
} from "../src/lib/debtStrategies";
import {
  ADMIN_VIEW_MODES,
  FEATURE_ENTITLEMENTS,
  hasEntitlement,
  isAdminViewSimulationActive,
  resolveEffectiveEntitlementContext,
  resolveEntitlementContext,
} from "../src/lib/entitlements";
import {
  DEFAULT_FREE_MEMBERSHIP,
  buildCheckoutSessionCreateParams,
  getMembershipEntitlementPlan,
  syncSubscription,
  type MembershipSnapshot,
} from "../src/lib/membership";
import {
  getCheckoutStartErrorMessage,
} from "../src/lib/billing/checkoutErrors";
import {
  APP_VERSION,
  BEASTOS_UI_POLISH_NOTE,
  BEAST_LEARNING_VERSION,
} from "../src/lib/appVersion";
import {
  buildMonthGrid,
  getLocalCalendarDate,
  getMonthLength,
} from "../src/lib/calendar";
import {
  getBillingReturnUrl,
  getCheckoutPriceId,
  getStripeCheckoutConfigIssue,
  getStripeBillingConfig,
  mapStripeStatusToMembershipPlan,
  mapStripeStatusToMembershipStatus,
} from "../src/lib/billing/stripeConfig";
import { buildResetDueDatePayload } from "../src/app/dashboard/money/cashflow/dueDateReset";
import {
  requireBillingUser,
  requireStripeCustomer,
} from "../src/lib/billing/guards";
import { buildMembershipUpdateFromStripeSubscription } from "../src/lib/billing/subscriptionSync";
import {
  formatCurrency,
  formatMonthCount,
  formatPercent,
  parseNumber,
  parseOptionalNumber,
} from "../src/lib/formatters";
import {
  calculateMonthlyRecurringTotal,
  countActiveRecurringSources,
  normalizeRecurringAmountToMonthly,
} from "../src/lib/financialMetrics";
import {
  buildLearningAchievementUnlocks,
  learningAchievementCatalog,
} from "../src/lib/learning/achievements";
import {
  getAgeFromBirthday,
  isRestrictedForLearningOnlyNavigation,
  shouldUseLearningOnlyNavigation,
} from "../src/lib/learning/access";
import { buildAdaptiveLearningPlan } from "../src/lib/learning/adaptivePlanner";
import { buildAIOrchestrationDashboard } from "../src/lib/learning/aiOrchestrationDashboard";
import { aiSpecialistRegistry, getAISpecialistById, getAISpecialistByRole } from "../src/lib/learning/aiRegistry";
import { createMockAISession } from "../src/lib/learning/aiSessionManager";
import { getFavoriteBookmarks, learningBookmarks } from "../src/lib/learning/bookmarks";
import {
  generateLearningCertificateId,
  mockLearningCertificates,
} from "../src/lib/learning/certificates";
import { careerKnowledgeCatalog } from "../src/lib/learning/careers";
import { certificationCatalog } from "../src/lib/learning/certificationCatalog";
import {
  getCollectionResourceCount,
  learningResourceCollections,
} from "../src/lib/learning/collections";
import { curriculumConceptLibrary } from "../src/lib/learning/concepts";
import {
  builtLearningCourses,
  calculateBuiltCourseProgress,
} from "../src/lib/learning/courses";
import { curriculumSubjects } from "../src/lib/learning/curriculum";
import { buildLearningDashboardContent } from "../src/lib/learning/dashboardContent";
import { buildDependencyGraphState } from "../src/lib/learning/dependencyGraph";
import { buildLearningExperienceDashboard } from "../src/lib/learning/experience";
import { buildLearningAIContext } from "../src/lib/learning/contextBuilder";
import { mockConversationMemory, updateMockConversationMemory } from "../src/lib/learning/conversationMemory";
import { getDueFlashcards, learningFlashcards } from "../src/lib/learning/flashcards";
import {
  buildGamificationProfile,
  calculateLearningLevel,
  calculateNextLevelXp,
} from "../src/lib/learning/gamification";
import { buildLearningIntelligenceSnapshot } from "../src/lib/learning/intelligenceEngine";
import { buildLearnerInsights } from "../src/lib/learning/insights";
import { buildLearningJourneys } from "../src/lib/learning/journeys";
import { buildKnowledgeIntelligenceDashboard } from "../src/lib/learning/knowledgeDashboard";
import { mockLearningKnowledgeModel } from "../src/lib/learning/knowledgeGraph";
import { mockLearningMemory } from "../src/lib/learning/learningMemory";
import { learningLessons } from "../src/lib/learning/lessons";
import { learningLibraryMaterials } from "../src/lib/learning/library";
import { calculateMasteryProfile } from "../src/lib/learning/mastery";
import { buildMasteryMap } from "../src/lib/learning/masteryMap";
import { buildMotivationSnapshot } from "../src/lib/learning/motivation";
import { buildOpenAILearningMessages, isOpenAILearningConfigured } from "../src/lib/learning/openai";
import { getHomeworkPolicyForRequest, homeworkPolicy } from "../src/lib/learning/homeworkPolicy";
import { conversationTypeFromIntent, detectLearningIntent } from "../src/lib/learning/intentDetection";
import {
  mockLearners,
  mockLearningAchievements,
  mockLearningCourses,
  mockLearningGoals,
  mockLearningPlan,
  mockLearningQuickActions,
  mockLearningSessions,
  mockLearningSignals,
  mockStudySessionCommand,
} from "../src/lib/learning/mockData";
import { buildGuidanceCounselorRoadmap } from "../src/lib/learning/guidanceCounselor";
import { learnerNotes } from "../src/lib/learning/notes";
import { learningOnboardingSteps } from "../src/lib/learning/onboarding";
import {
  buildOnboardingCompletionProfileUpdate,
  getOnboardingRedirect,
  getOnboardingSaveErrorMessage,
  hasCompleteLearningOnboardingData,
  isLearningOnboardingComplete,
  isProtectedLearningOnboardingPath,
  profileOnboardingCompletionKeyColumn,
  shouldAttemptLearningOnboardingRepair,
  validateLearningOnboardingForm,
} from "../src/lib/learning/onboardingCompletion";
import { mockParentDashboard } from "../src/lib/learning/parentDashboard";
import {
  buildFeedbackInsertPayload,
  learningTableNames,
  mapFeedbackRow,
} from "../src/lib/learning/persistence";
import { generateLearningPlan } from "../src/lib/learning/planGenerator";
import { buildLearnerPortfolio } from "../src/lib/learning/portfolio";
import { predictLearningProgress } from "../src/lib/learning/prediction";
import {
  buildCertificateDocuments,
  buildLearningBetaReadiness,
  buildLearningTimeline,
  buildStaticPrivateBetaData,
} from "../src/lib/learning/privateBeta";
import {
  getPracticeExamFrameworkSummary,
  learningPracticeExams,
} from "../src/lib/learning/practiceExams";
import { buildLearningProgressSignals } from "../src/lib/learning/progressSignals";
import { getQuizzesRequiringReview, learningQuizzes } from "../src/lib/learning/quizzes";
import { buildLearningRecommendations } from "../src/lib/learning/recommendations";
import { recommendLearningResources } from "../src/lib/learning/resourceEngine";
import { getResourceLinksForConcept, resourceMapLinks } from "../src/lib/learning/resourceMapping";
import { routeLearningAI } from "../src/lib/learning/router";
import { buildLearningSearchIndex, searchLearningContent } from "../src/lib/learning/search";
import { generateStudySession } from "../src/lib/learning/sessionGenerator";
import { buildSkillTree } from "../src/lib/learning/skills";
import { learningSpecialists, routeMockLearningSpecialist } from "../src/lib/learning/specialists";
import {
  buildSpacedRepetitionSchedule,
  getFlashcardsDueForReview,
} from "../src/lib/learning/spacedRepetition";
import { buildStudyHabitsSnapshot } from "../src/lib/learning/studyHabits";
import { mockStudyPlanner } from "../src/lib/learning/studyPlanner";
import { learningStudyGuides } from "../src/lib/learning/studyGuides";
import { globalSubjectCatalog, learningSubjects } from "../src/lib/learning/subjects";
import {
  getLearningActivityChecklist,
  getLearningActivityCompletionPayload,
  getLearningActivityPrimaryActionLabel,
  getLearningActivityRoute,
  getNextQueuedLearningActivity,
} from "../src/lib/learning/activityRunner";
import { learningStandards } from "../src/lib/learning/standards";
import { generateCurriculumLearningPath } from "../src/lib/learning/learningPaths";
import { learningPathTemplates } from "../src/lib/learning/templates";
import { mockLearningUploads } from "../src/lib/learning/uploads";
import { analyzeLearningWeaknesses } from "../src/lib/learning/weaknessAnalysis";
import {
  buildBeastOSIntelligence,
  buildLearningFoundationIntelligence,
  buildMoneyIntelligence,
  sortRecommendations,
} from "../src/lib/platform/recommendationEngine";
import type { PlatformRecommendation } from "../src/lib/platform/types";
import {
  DEFAULT_VELOCITY_SETTINGS,
  mapVelocitySettingsRow,
  mergeStoredVelocitySettings,
  velocitySettingsToUpsertPayload,
} from "../src/lib/velocity/settings";
import {
  beastModuleNavigation,
  beastLearningNavigation,
  beastMoneyNavigation,
  getModuleChildren,
  primaryNavigation,
  sharedNavigation,
} from "../src/lib/moduleNavigation";

test("debt strategy registry includes existing strategy options", () => {
  assert.deepEqual(
    DEBT_STRATEGIES.map((strategy) => strategy.value),
    ["minimum", "snowball", "avalanche", "velocity"]
  );
  assert.equal(getDebtStrategyLabel("velocity"), "Velocity");
  assert.equal(
    getDebtStrategyDescription("minimum"),
    "Minimum payments only. No extra attack or rollover."
  );
  assert.equal(normalizeDebtStrategy("unknown"), "snowball");
});

test("shared formatters preserve current formatting semantics", () => {
  assert.equal(formatCurrency(1234.5), "$1,234.50");
  assert.equal(formatPercent(7.125), "7.13%");
  assert.equal(formatMonthCount(1), "1 Month");
  assert.equal(formatMonthCount(2.1), "3 Months");
  assert.equal(parseNumber(""), 0);
  assert.equal(parseNumber("12.5"), 12.5);
  assert.equal(parseOptionalNumber(""), null);
  assert.equal(parseOptionalNumber("12.5"), 12.5);
});

test("app version constants reflect BeastOS and BeastLearning closeout", () => {
  assert.equal(APP_VERSION, "v2.1");
  assert.equal(BEAST_LEARNING_VERSION, "v1.0 Private Beta");
  assert.equal(BEASTOS_UI_POLISH_NOTE, "two-tone module branding restored");
});

test("module navigation centralizes expandable child items", () => {
  assert.deepEqual(
    primaryNavigation.map((item) => item.label),
    ["Home", "Today", "Search", "Notifications"]
  );
  assert.deepEqual(
    beastModuleNavigation.map((item) => item.label),
    [
      "BeastMoney",
      "BeastLearning",
      "BeastHealth",
      "BeastProjects",
      "BeastGoals",
      "BeastHome",
      "BeastDocuments",
    ]
  );
  assert.deepEqual(
    sharedNavigation.map((item) => item.label),
    ["Calendar", "Timeline", "Upload Center", "Profile", "Settings"]
  );
  assert.deepEqual(
    beastLearningNavigation.children?.map((item) => item.label),
    [
      "Learning Path",
      "Activities",
      "Goals",
      "Study Plan",
      "Courses",
      "Flashcards",
      "Achievements",
      "Certificates",
      "Parent View",
      "Feedback",
    ]
  );
  assert.equal(
    beastLearningNavigation.children?.[1].href,
    "/dashboard/learning/activities"
  );
  assert.equal(beastMoneyNavigation.label, "BeastMoney");
  assert.equal(
    beastMoneyNavigation.children?.map((item) => item.label).slice(0, 8).join(","),
    "Dashboard,Cash Flow,Bills,Debts,Payoff Plan,Velocity,Billing,Settings"
  );
  assert.equal(getModuleChildren("learning").length, 10);
  assert.equal(
    getModuleChildren("money").some((item) => item.future && item.label === "Add Bill"),
    true
  );
});

test("calendar date generation uses local-safe weekday alignment", () => {
  const julyFirst = getLocalCalendarDate(2026, 6, 1);
  const julyFourth = getLocalCalendarDate(2026, 6, 4);

  assert.equal(julyFirst.getDay(), 3);
  assert.equal(julyFourth.getDay(), 6);
});

test("calendar month grid aligns July 2026 with leading and trailing days", () => {
  const grid = buildMonthGrid(2026, 6);
  const currentMonthDays = grid.filter((day) => day.inCurrentMonth);
  const julyFirstIndex = grid.findIndex(
    (day) => day.inCurrentMonth && day.dayOfMonth === 1
  );
  const julyFourthIndex = grid.findIndex(
    (day) => day.inCurrentMonth && day.dayOfMonth === 4
  );

  assert.equal(grid.length, 35);
  assert.equal(julyFirstIndex, 3);
  assert.equal(julyFourthIndex, 6);
  assert.deepEqual(
    grid.slice(0, 3).map((day) => [day.monthIndex, day.dayOfMonth]),
    [
      [5, 28],
      [5, 29],
      [5, 30],
    ]
  );
  assert.deepEqual(grid.at(-1) && [grid.at(-1)?.monthIndex, grid.at(-1)?.dayOfMonth], [
    7,
    1,
  ]);
  assert.equal(currentMonthDays.length, 31);
});

test("calendar month length is correct for July 2026", () => {
  assert.equal(getMonthLength(2026, 6), 31);
});

test("financial metrics normalize recurring income to monthly amounts", () => {
  assert.equal(normalizeRecurringAmountToMonthly(1200, "monthly"), 1200);
  assert.equal(normalizeRecurringAmountToMonthly(600, "semi-monthly"), 1200);
  assert.equal(normalizeRecurringAmountToMonthly(12000, "annual"), 1000);
  assert.equal(normalizeRecurringAmountToMonthly(12000, "yearly"), 1000);
  assert.equal(normalizeRecurringAmountToMonthly(0, "weekly"), 0);
  assert.ok(
    Math.abs(normalizeRecurringAmountToMonthly(1000, "weekly") - 4333.3333) <
      0.01
  );
  assert.ok(
    Math.abs(normalizeRecurringAmountToMonthly(2000, "biweekly") - 4333.3333) <
      0.01
  );
});

test("financial metrics include active recurring income sources only", () => {
  const monthlyIncome = calculateMonthlyRecurringTotal([
    { amount: 2000, frequency: "biweekly" }, // Employment
    { amount: 1200, frequency: "monthly" }, // VA
    { amount: 300, frequency: "weekly" }, // Other recurring
    { amount: 500, frequency: "monthly", is_active: false },
    { amount: 700, frequency: "monthly", is_archived: true },
  ]);

  assert.ok(Math.abs(monthlyIncome - 6833.3333) < 0.01);
  assert.equal(
    countActiveRecurringSources([
      { amount: 2000, frequency: "biweekly" },
      { amount: 1200, frequency: "monthly" },
      { amount: 300, frequency: "weekly" },
      { amount: 500, frequency: "monthly", is_active: false },
      { amount: 700, frequency: "monthly", is_archived: true },
    ]),
    3
  );
});

test("recommendation engine sorts by priority", () => {
  const recommendations = [
    { id: "low", priority: "Low", title: "Low" },
    { id: "critical", priority: "Critical", title: "Critical" },
    { id: "medium", priority: "Medium", title: "Medium" },
    { id: "high", priority: "High", title: "High" },
  ].map(
    (item) =>
      ({
        ...item,
        module: "money",
        severity: "info",
        summary: item.title,
        reason: item.title,
        recommendedAction: item.title,
        confidence: "reserved",
        dismissible: true,
        completed: false,
      } as PlatformRecommendation)
  );

  assert.deepEqual(
    sortRecommendations(recommendations).map((item) => item.priority),
    ["Critical", "High", "Medium", "Low"]
  );
});

test("money intelligence generates live structured recommendations", () => {
  const result = buildMoneyIntelligence({
    now: new Date("2026-07-03T12:00:00.000Z"),
    startingCash: 100,
    buffer: 500,
    monthlyIncome: 3000,
    monthlyBills: 3500,
    debtMinimums: 200,
    activeBills: [
      {
        id: "amex",
        name: "AMEX",
        amount: 250,
        due_date: 5,
      },
    ],
    activeDebts: [
      {
        id: "card",
        name: "Credit Card",
        balance: 1200,
        minimum_payment: 75,
        due_date: 12,
      },
    ],
    billPayments: [{ id: "bill-payment", amount_paid: 50 }],
    debtPayments: [{ id: "debt-payment", amount: 75 }],
  });

  assert.equal(result.recommendations[0].priority, "Critical");
  assert.equal(
    result.recommendations.some((item) => item.title.includes("AMEX")),
    true
  );
  assert.equal(
    result.notifications.some((item) => item.id === "money-buffer-alert"),
    true
  );
  assert.equal(result.activities.length >= 2, true);
  assert.equal(result.moduleSummaries[0].module, "money");
});

test("beastos intelligence has all-clear recommendations and module extension points", () => {
  const result = buildBeastOSIntelligence({
    now: new Date("2026-07-03T12:00:00.000Z"),
    startingCash: 2000,
    buffer: 500,
    monthlyIncome: 5000,
    monthlyBills: 1000,
    debtMinimums: 0,
    activeBills: [],
    activeDebts: [],
  });

  assert.equal(result.recommendations.length, 0);
  assert.equal(
    result.moduleSummaries.some((summary) => summary.module === "money"),
    true
  );
  assert.equal(
    result.moduleSummaries.some((summary) => summary.module === "health"),
    true
  );
  assert.equal(
    result.moduleSummaries.some(
      (summary) =>
        summary.module === "learning" &&
        summary.status === "ready" &&
        summary.href === "/dashboard/learning"
    ),
    true
  );
});

test("learning foundation uses shared platform intelligence contracts", () => {
  const result = buildLearningFoundationIntelligence(
    new Date("2026-07-03T12:00:00.000Z")
  );

  assert.equal(result.moduleSummaries[0].module, "learning");
  assert.equal(result.moduleSummaries[0].status, "ready");
  assert.equal(result.recommendations[0].module, "learning");
  assert.equal(result.recommendations[0].confidence, "reserved");
  assert.equal(result.notifications[0].module, "learning");
  assert.equal(result.activities[0].module, "learning");
  assert.equal(result.timelineEvents[0].module, "learning");
});

test("learning mock data satisfies the domain model foundation", () => {
  assert.equal(mockLearners.some((learner) => learner.active), true);
  assert.equal(mockLearningGoals.every((goal) => goal.learnerId), true);
  assert.equal(
    mockLearningCourses.some(
      (course) => course.id === mockLearningPlan.currentCourseId
    ),
    true
  );
  assert.equal(mockLearningPlan.weeklySessionTarget, 5);
  assert.equal(mockLearningSessions.every((session) => session.status), true);
  assert.equal(
    mockLearningSessions.some(
      (session) => session.id === mockStudySessionCommand.sessionId
    ),
    true
  );
  assert.equal(mockStudySessionCommand.estimatedTime, "35 min");
  assert.equal(mockStudySessionCommand.progressFeedback.includes("Session complete"), true);
  assert.equal(
    mockLearningAchievements.some((achievement) => achievement.earned),
    true
  );
  assert.equal(mockLearningSignals[0].kind, "goal");
  assert.equal(
    mockLearningQuickActions.some((action) => action.label === "Continue Learning"),
    true
  );
});

test("learning account access keeps students focused without blocking adults", () => {
  assert.equal(
    getAgeFromBirthday("2011-07-06", new Date("2026-07-05T12:00:00.000Z")),
    14
  );
  assert.equal(
    shouldUseLearningOnlyNavigation({
      role: "user",
      birthday: "2012-03-10",
      learnerRole: "Student",
      gradeLevel: "Middle school",
    }),
    true
  );
  assert.equal(
    shouldUseLearningOnlyNavigation({
      role: "user",
      birthday: "1990-03-10",
      learnerRole: "Adult learner",
      gradeLevel: "Certification prep",
    }),
    false
  );
  assert.equal(
    shouldUseLearningOnlyNavigation({
      role: "admin",
      birthday: "2012-03-10",
      learnerRole: "Student",
      gradeLevel: "High school",
    }),
    false
  );
  assert.equal(isRestrictedForLearningOnlyNavigation("/dashboard/money"), true);
  assert.equal(
    isRestrictedForLearningOnlyNavigation("/dashboard/money/cashflow"),
    true
  );
  assert.equal(isRestrictedForLearningOnlyNavigation("/dashboard/admin"), true);
  assert.equal(isRestrictedForLearningOnlyNavigation("/dashboard/learning"), false);
  assert.equal(isRestrictedForLearningOnlyNavigation("/dashboard/profile"), false);
});

test("learning progress signals derive dashboard intelligence", () => {
  const signals = buildLearningProgressSignals({
    goals: mockLearningGoals,
    courses: mockLearningCourses,
    plan: mockLearningPlan,
    sessions: mockLearningSessions,
    achievements: mockLearningAchievements,
    studySession: mockStudySessionCommand,
  });

  assert.equal(signals.activeGoalsCount, 1);
  assert.equal(signals.currentStreakDays, 7);
  assert.equal(signals.sessionsCompleted, 1);
  assert.equal(signals.estimatedWeeklyStudyMinutes, 80);
  assert.equal(signals.progressPercentage, 42);
  assert.equal(signals.readinessScore, 72);
  assert.equal(signals.weakArea, "Spanish Daily Practice");
  assert.equal(
    signals.recommendedNextAction,
    "Review Spanish Daily Practice after Authentication and access control."
  );
  assert.equal(signals.snapshotTiles.length, 5);
});

test("learning recommendations cover rule-based foundation actions", () => {
  const progress = buildLearningProgressSignals({
    goals: mockLearningGoals,
    courses: mockLearningCourses,
    plan: mockLearningPlan,
    sessions: mockLearningSessions,
    achievements: mockLearningAchievements,
    studySession: mockStudySessionCommand,
  });
  const recommendations = buildLearningRecommendations({
    progress,
    currentPlanTitle: mockLearningPlan.title,
    activeGoalsCount: progress.activeGoalsCount,
    currentFocus: mockStudySessionCommand.currentFocus,
  });

  assert.deepEqual(
    recommendations.map((recommendation) => recommendation.id),
    [
      "learning-continue-current-plan",
      "learning-review-weak-area",
      "learning-start-short-session",
      "learning-add-goal",
      "learning-upload-material-placeholder",
      "learning-schedule-study-time-placeholder",
      "learning-explore-related-path",
    ]
  );
  assert.equal(
    recommendations.every(
      (recommendation) =>
        recommendation.module === "learning" &&
        recommendation.confidence === "reserved"
    ),
    true
  );
  assert.equal(
    recommendations.some((recommendation) =>
      recommendation.title.includes(progress.weakArea)
    ),
    true
  );
});

test("learning path templates cover required starter paths", () => {
  assert.deepEqual(
    learningPathTemplates.map((template) => template.id),
    [
      "school-subject-support",
      "certification-prep",
      "career-change",
      "trade-skill",
      "language-learning",
      "hobby-learning",
      "parent-support",
      "guidance-counselor-planning",
    ]
  );
  assert.equal(
    learningPathTemplates.every(
      (template) =>
        template.templateName &&
        template.audience &&
        template.goalType &&
        template.milestones.length >= 3 &&
        template.exampleSessions.length >= 3 &&
        template.recommendedPace &&
        template.suggestedNextStep
    ),
    true
  );
});

test("guidance counselor roadmap uses static goal-type rules", () => {
  const roadmap = buildGuidanceCounselorRoadmap({
    goalType: "Certification",
    futureGoal: "Security+",
  });

  assert.equal(roadmap.title, "Certification: Security+");
  assert.equal(roadmap.previewLabel, "Early planning preview");
  assert.equal(roadmap.estimatedTimeline, "6-10 week prep placeholder");
  assert.equal(
    roadmap.requiredEducationOrTraining.some((item) =>
      item.includes("exam objectives")
    ),
    true
  );
  assert.equal(roadmap.skillsToBuild.includes("Exam readiness"), true);
  assert.equal(roadmap.suggestedMilestones.length >= 3, true);
  assert.equal(roadmap.questionsToConsider.length >= 3, true);
  assert.equal(
    roadmap.nextRecommendedAction,
    "Choose the exam domain with the lowest confidence."
  );
});

test("learning foundation completion engines expose static platform data", () => {
  const progress = buildLearningProgressSignals({
    goals: mockLearningGoals,
    courses: mockLearningCourses,
    plan: mockLearningPlan,
    sessions: mockLearningSessions,
    achievements: mockLearningAchievements,
    studySession: mockStudySessionCommand,
  });
  const achievementUnlocks = buildLearningAchievementUnlocks({
    progress,
    goalsCreated: mockLearningGoals.length,
    goalsCompleted: 0,
    masteredSkills: 0,
    foundingStudent: true,
  });
  const portfolio = buildLearnerPortfolio({
    learnerName: "Current learner",
    goals: mockLearningGoals,
    progress,
    certificates: mockLearningCertificates,
    achievementCount: achievementUnlocks.filter((achievement) => achievement.unlocked).length,
  });

  assert.equal(learningAchievementCatalog.length, 8);
  assert.equal(
    achievementUnlocks.some(
      (achievement) => achievement.id === "founding-student" && achievement.unlocked
    ),
    true
  );
  assert.equal(
    generateLearningCertificateId({
      learnerName: "Current learner",
      pathName: "Security+ Foundations",
      completionDate: "2026-07-03",
    }),
    mockLearningCertificates[0].certificateId
  );
  assert.equal(portfolio.certificates, 1);
  assert.equal(mockParentDashboard.learners.length, 2);
  assert.equal(mockStudyPlanner.placeholderActions.includes("Create reminder"), true);
  assert.deepEqual(
    mockLearningUploads.map((upload) => upload.category),
    ["textbook", "PDF", "syllabus", "notes", "slides", "worksheet", "practice exam"]
  );
  assert.deepEqual(
    learningSpecialists.map((specialist) => specialist.role),
    [
      "Tutor",
      "Study Coach",
      "Homework Coach",
      "Guidance Counselor",
      "Career Mentor",
      "Parent Assistant",
      "Certification Coach",
      "Reading Coach",
      "Writing Coach",
      "Language Coach",
      "Math Coach",
      "Science Coach",
      "Coding Coach",
      "Trade Instructor",
      "Interview Coach",
      "Motivation Coach",
    ]
  );
  assert.equal(routeMockLearningSpecialist("Tutor").status, "mocked-preview");
});

test("learning knowledge model includes a prerequisite graph", () => {
  assert.equal(
    mockLearningKnowledgeModel.concepts.some(
      (concept) =>
        concept.id === "calculus" &&
        concept.prerequisiteIds.includes("functions")
    ),
    true
  );
  assert.equal(
    mockLearningKnowledgeModel.dependencies.some(
      (dependency) =>
        dependency.fromConceptId === "linear-equations" &&
        dependency.toConceptId === "quadratic-equations"
    ),
    true
  );
  assert.equal(mockLearningKnowledgeModel.nodes.length > 0, true);
});

test("learning mastery engine weights more than completion alone", () => {
  const mastery = calculateMasteryProfile([
    {
      conceptId: "confident-topic",
      completedSessions: 5,
      completedGoals: 1,
      completedMilestones: 2,
      quizzesPlaceholder: 2,
      practicePlaceholder: 4,
      studyStreakDays: 7,
      lastStudiedDaysAgo: 0,
    },
    {
      conceptId: "stale-topic",
      completedSessions: 1,
      completedGoals: 0,
      completedMilestones: 0,
      quizzesPlaceholder: 0,
      practicePlaceholder: 0,
      studyStreakDays: 0,
      lastStudiedDaysAgo: 10,
    },
  ]);

  assert.equal(mastery.strongestConcepts.includes("confident-topic"), true);
  assert.equal(mastery.weakConcepts.includes("stale-topic"), true);
  assert.notEqual(
    mastery.concepts.find((concept) => concept.conceptId === "confident-topic")
      ?.masteryPercent,
    mastery.concepts.find((concept) => concept.conceptId === "stale-topic")
      ?.masteryPercent
  );
});

test("learning dependency graph computes blocked and unlocked concepts", () => {
  const graph = buildDependencyGraphState({
    model: mockLearningKnowledgeModel,
    completedConceptIds: ["linear-equations", "identity-verification"],
  });

  assert.equal(graph.unlockedConcepts.includes("quadratic-equations"), true);
  assert.equal(graph.unlockedConcepts.includes("role-based-access"), true);
  assert.equal(graph.blockedConcepts.includes("functions"), true);
  assert.equal(graph.blockedConcepts.includes("calculus"), true);
  assert.equal(graph.visualizationEdges.length, mockLearningKnowledgeModel.dependencies.length);
});

test("learning weakness analysis identifies review needs", () => {
  const mastery = calculateMasteryProfile([
    {
      conceptId: "quadratic-equations",
      completedSessions: 1,
      completedGoals: 0,
      completedMilestones: 0,
      quizzesPlaceholder: 0,
      practicePlaceholder: 1,
      studyStreakDays: 2,
      lastStudiedDaysAgo: 6,
    },
    {
      conceptId: "identity-verification",
      completedSessions: 4,
      completedGoals: 1,
      completedMilestones: 2,
      quizzesPlaceholder: 1,
      practicePlaceholder: 2,
      studyStreakDays: 7,
      lastStudiedDaysAgo: 1,
    },
  ]);
  const weakness = analyzeLearningWeaknesses({
    mastery,
    memory: mockLearningMemory,
  });

  assert.equal(weakness.lowMasteryConcepts.includes("quadratic-equations"), true);
  assert.equal(
    weakness.repeatedReviewNeeds.includes(mockLearningMemory.frequentlyMissed[0]),
    true
  );
  assert.equal(weakness.improvementSuggestions.length > 0, true);
});

test("learning adaptive planner prioritizes review before new work", () => {
  const snapshot = buildLearningIntelligenceSnapshot({
    goals: mockLearningGoals,
    weeklyStudyMinutes: 80,
  });

  assert.equal(
    snapshot.adaptivePlan.nextRecommendedLesson,
    snapshot.weakness.lowMasteryConcepts[0]
  );
  assert.deepEqual(
    snapshot.adaptivePlan.reviewSessions,
    mockLearningMemory.frequentlyMissed.slice(0, 3)
  );
  assert.equal(snapshot.adaptivePlan.updatedMilestones.length, 3);

  const customPlan = buildAdaptiveLearningPlan({
    goals: mockLearningGoals,
    mastery: snapshot.mastery,
    memory: mockLearningMemory,
    weakness: snapshot.weakness,
    availableStudyMinutes: 120,
    learningPace: mockLearningMemory.learningPace,
    completedWorkCount: 4,
  });

  assert.equal(customPlan.estimatedCompletion, "4-6 weeks");
});

test("learning study session generator creates a six-stage session", () => {
  const snapshot = buildLearningIntelligenceSnapshot({
    goals: mockLearningGoals,
    weeklyStudyMinutes: 80,
  });
  const session = generateStudySession({
    mastery: snapshot.mastery,
    weakness: snapshot.weakness,
    availableMinutes: 45,
  });

  assert.equal(session.estimatedTime, "45 min");
  assert.equal(Boolean(session.warmUp), true);
  assert.equal(Boolean(session.review), true);
  assert.equal(Boolean(session.newLearning), true);
  assert.equal(Boolean(session.practice), true);
  assert.equal(Boolean(session.reflection), true);
  assert.equal(Boolean(session.confidenceCheck), true);
});

test("learning resource engine recommends resources from weak concepts", () => {
  const snapshot = buildLearningIntelligenceSnapshot({
    goals: mockLearningGoals,
    weeklyStudyMinutes: 80,
  });
  const resources = recommendLearningResources({
    model: mockLearningKnowledgeModel,
    mastery: snapshot.mastery,
    goals: mockLearningGoals,
    currentTopicId: "security-foundations",
  });

  assert.equal(resources.conceptId, snapshot.mastery.weakConcepts[0]);
  assert.equal(resources.resources.length > 0, true);
  assert.equal(
    resources.resources.some((resource) => resource.type === "external site"),
    true
  );
});

test("learning progress prediction estimates readiness and schedule health", () => {
  const snapshot = buildLearningIntelligenceSnapshot({
    goals: mockLearningGoals,
    weeklyStudyMinutes: 80,
  });
  const prediction = predictLearningProgress({
    mastery: snapshot.mastery,
    memory: mockLearningMemory,
    weeklyStudyMinutes: 100,
    now: new Date("2026-07-03T12:00:00.000Z"),
  });

  assert.equal(prediction.scheduleHealth, "strong");
  assert.equal(prediction.estimatedCompletionDate >= "2026-07-10", true);
  assert.equal(prediction.readiness > 0, true);
  assert.equal(prediction.likelihoodOfSuccess > 0, true);
});

test("learning content library and subjects expose organized material foundations", () => {
  assert.equal(learningSubjects.length >= 12, true);
  assert.equal(
    learningSubjects.some(
      (subject) =>
        subject.id === "cybersecurity" &&
        subject.topics.some((topic) => topic.id === "security-plus")
    ),
    true
  );
  assert.deepEqual(
    learningLibraryMaterials.map((material) => material.type),
    ["PDF", "Notes", "Audio", "Lab", "Practice Exam"]
  );
  assert.equal(
    learningLibraryMaterials.every(
      (material) =>
        material.title &&
        material.subject &&
        material.description &&
        material.estimatedStudyTime &&
        Array.isArray(material.tags)
    ),
    true
  );
});

test("learning course builder models modules lessons topics and activities", () => {
  const course = builtLearningCourses[0];

  assert.equal(course.title, "Security+ Foundations");
  assert.equal(course.modules[0].lessons[0].topics[0].activities.length > 0, true);
  assert.equal(course.milestones.length >= 3, true);
  assert.equal(calculateBuiltCourseProgress(course), 40);
  assert.equal(
    course.modules.some((module) =>
      module.lessons.some((lesson) =>
        lesson.topics.some((topic) =>
          topic.activities.some((activity) => activity.type === "assessment placeholder")
        )
      )
    ),
    true
  );
});

test("learning lesson models expose estimated completion time", () => {
  assert.equal(learningLessons.length >= 3, true);
  assert.equal(
    learningLessons.every(
      (lesson) =>
        lesson.courseId &&
        lesson.lessonType &&
        lesson.estimatedCompletionTime.endsWith("min")
    ),
    true
  );
  assert.equal(
    learningLessons.some((lesson) => lesson.completionStatus === "In progress"),
    true
  );
});

test("learning flashcards and spaced repetition identify due review work", () => {
  const schedule = buildSpacedRepetitionSchedule("2026-07-04");

  assert.equal(learningFlashcards.length >= 3, true);
  assert.equal(getDueFlashcards().length, 3);
  assert.deepEqual(schedule.overdueItems.map((item) => item.id), ["review-quadratic"]);
  assert.deepEqual(schedule.dueTodayItems.map((item) => item.id), ["review-rbac"]);
  assert.deepEqual(
    getFlashcardsDueForReview("2026-07-04").map((card) => card.id),
    ["flashcard-rbac", "flashcard-quadratic"]
  );
});

test("learning quiz and practice exam frameworks support review state", () => {
  const quiz = learningQuizzes[0];
  const exam = learningPracticeExams[0];
  const examSummary = getPracticeExamFrameworkSummary();

  assert.deepEqual(
    quiz.questions.map((question) => question.type),
    ["multiple choice", "true/false", "fill in blank"]
  );
  assert.equal(getQuizzesRequiringReview().map((item) => item.id)[0], quiz.id);
  assert.equal(exam.timed, true);
  assert.equal(exam.sections.length, 2);
  assert.deepEqual(examSummary, { totalExams: 1, timedExams: 1, sectionCount: 2 });
});

test("learning study guides notes bookmarks and collections are reusable assets", () => {
  const collection = learningResourceCollections.find(
    (item) => item.id === "security-plus-collection"
  );

  assert.equal(learningStudyGuides[0].reviewChecklist.length >= 3, true);
  assert.equal(learnerNotes.some((note) => note.pinned && note.favorite), true);
  assert.equal(getFavoriteBookmarks().length, 2);
  assert.equal(Boolean(collection), true);
  assert.equal(collection ? getCollectionResourceCount(collection) : 0, 7);
  assert.equal(
    learningBookmarks.some((bookmark) => bookmark.targetType === "study guide"),
    true
  );
});

test("learning search covers courses lessons library cards notes guides and resources", () => {
  const index = buildLearningSearchIndex();
  const securityResults = searchLearningContent({
    query: "security",
    tag: "Security+",
  });
  const beginnerMaterials = searchLearningContent({ difficulty: "Beginner" });

  assert.equal(index.some((item) => item.type === "course"), true);
  assert.equal(index.some((item) => item.type === "lesson"), true);
  assert.equal(index.some((item) => item.type === "library"), true);
  assert.equal(index.some((item) => item.type === "flashcard"), true);
  assert.equal(index.some((item) => item.type === "note"), true);
  assert.equal(index.some((item) => item.type === "study guide"), true);
  assert.equal(index.some((item) => item.type === "resource"), true);
  assert.equal(securityResults.length > 0, true);
  assert.equal(
    beginnerMaterials.every((item) => !item.difficulty || item.difficulty === "Beginner"),
    true
  );
});

test("learning dashboard content aggregates v0.4 study surfaces", () => {
  const content = buildLearningDashboardContent("2026-07-04");

  assert.equal(content.library.length, learningLibraryMaterials.length);
  assert.equal(content.recentMaterials.length, 4);
  assert.equal(content.continueStudying.length > 0, true);
  assert.equal(content.recommendedResources.length > 0, true);
  assert.equal(content.flashcardsDue.length, 3);
  assert.equal(content.upcomingReview.length, 2);
  assert.equal(content.bookmarkedItems.length, 3);
  assert.equal(content.studyCollections.length, learningResourceCollections.length);
  assert.equal(content.courseProgress.length, builtLearningCourses.length);
});

test("learning onboarding models the full first-time experience", () => {
  assert.deepEqual(
    learningOnboardingSteps.map((step) => step.id),
    [
      "welcome",
      "future-self",
      "interests",
      "education-level",
      "learning-style",
      "study-availability",
      "preferred-pace",
      "initial-goals",
      "starter-dashboard",
    ]
  );
  assert.equal(learningOnboardingSteps.every((step) => step.title && step.prompt), true);
  assert.equal(learningOnboardingSteps.at(-1)?.skippable, false);
});

test("learning onboarding completion validates and builds the final profile update", () => {
  const result = validateLearningOnboardingForm({
    preferredName: "Taylor",
    learnerType: "Student",
    gradeLevel: "High school",
    primaryGoal: "Build algebra confidence",
    courses: ["Algebra I"],
    courseDraft: "Biology",
    pace: "Steady",
    availability: "30 minutes",
  });

  assert.equal(result.valid, true);

  if (result.valid) {
    assert.deepEqual(result.value.courses, ["Algebra I", "Biology"]);
    assert.deepEqual(buildOnboardingCompletionProfileUpdate(result.value), {
      onboarding_complete: true,
    });
  }
});

test("learning onboarding completion uses profiles.id as the auth user key", () => {
  assert.equal(profileOnboardingCompletionKeyColumn, "id");
  assert.notEqual(profileOnboardingCompletionKeyColumn, "user_id");
});

test("profile display name prefers profile names before username and email", () => {
  const profileSource = readFileSync("src/lib/profile.ts", "utf8");
  const returnExpression = profileSource.slice(profileSource.indexOf("return ("));
  const preferenceOrder = [
    "profile?.preferred_name",
    "profile?.display_name",
    "profile?.full_name",
    "profile?.username",
    "metadata?.preferred_name",
    "emailPrefix",
  ];
  const indexes = preferenceOrder.map((token) => returnExpression.indexOf(token));

  assert.equal(indexes.every((index) => index >= 0), true);
  assert.equal(
    indexes.every((index, position) => position === 0 || index > indexes[position - 1]),
    true
  );
});

test("today and learning avoid fallback-name flash while profile resolves", () => {
  const todaySource = readFileSync("src/app/dashboard/today/page.tsx", "utf8");
  const learningSource = readFileSync("src/app/dashboard/learning/page.tsx", "utf8");

  assert.match(todaySource, /name: ""/);
  assert.match(todaySource, /Loading Today/);
  assert.doesNotMatch(todaySource, /name: "Learner"/);
  assert.match(
    learningSource,
    /name: fallbackName,\s+role: String\(primaryLearnerRow\.learner_role/
  );
  assert.doesNotMatch(
    learningSource,
    /name: String\(primaryLearnerRow\.display_name \|\| fallbackName\)/
  );
});

test("learning onboarding validation names the exact missing required field", () => {
  const result = validateLearningOnboardingForm({
    preferredName: "Taylor",
    learnerType: "Student",
    gradeLevel: "",
    primaryGoal: "Build algebra confidence",
    courses: [],
    courseDraft: "Algebra I",
    pace: "Steady",
    availability: "30 minutes",
  });

  assert.equal(result.valid, false);

  if (!result.valid) {
    assert.equal(result.missingField, "Grade / level");
    assert.equal(
      result.message,
      "Grade / level is required before BeastLearning can finish setup."
    );
  }
});

test("learning onboarding routing keeps completed users out of setup", () => {
  assert.equal(isProtectedLearningOnboardingPath("/dashboard/today"), true);
  assert.equal(isProtectedLearningOnboardingPath("/dashboard/learning"), true);
  assert.equal(isProtectedLearningOnboardingPath("/dashboard/profile"), false);
  assert.equal(isProtectedLearningOnboardingPath("/dashboard/money"), false);
  assert.equal(
    getOnboardingRedirect({
      isAuthenticated: true,
      onboardingComplete: true,
      pathname: "/dashboard/onboarding",
    }),
    "/dashboard/today"
  );
  assert.equal(
    getOnboardingRedirect({
      isAuthenticated: true,
      onboardingComplete: true,
      pathname: "/dashboard/today",
    }),
    null
  );
});

test("learning onboarding routing sends incomplete users to setup once", () => {
  assert.equal(
    getOnboardingRedirect({
      isAuthenticated: true,
      pathname: "/dashboard/today",
    }),
    null
  );
  assert.equal(
    getOnboardingRedirect({
      isAuthenticated: true,
      onboardingComplete: false,
      pathname: "/dashboard/today",
    }),
    "/dashboard/onboarding"
  );
  assert.equal(
    getOnboardingRedirect({
      isAuthenticated: true,
      onboardingComplete: false,
      pathname: "/dashboard/onboarding",
    }),
    null
  );
  assert.equal(
    getOnboardingRedirect({
      isAuthenticated: true,
      onboardingComplete: false,
      pathname: "/dashboard/profile",
    }),
    null
  );
});

test("dashboard global loading copy stays module neutral", () => {
  const dashboardLayout = readFileSync(
    "src/app/dashboard/layout.tsx",
    "utf8"
  );

  assert.match(dashboardLayout, /Opening your dashboard\.\.\./);
  assert.doesNotMatch(dashboardLayout, /Opening BeastLearning\.\.\./);
});

test("dashboard module accordion keeps a single expanded group", () => {
  const dashboardLayout = readFileSync(
    "src/app/dashboard/layout.tsx",
    "utf8"
  );

  assert.match(dashboardLayout, /const \[expandedModule, setExpandedModule\]/);
  assert.match(dashboardLayout, /setExpandedModule\(activeExpandableModule\)/);
  assert.match(dashboardLayout, /expandedModule === item\.module/);
  assert.doesNotMatch(dashboardLayout, /expandedModules/);
  assert.doesNotMatch(dashboardLayout, /Record<string, boolean>/);
});

test("learning activities have a dedicated runner and next-activity unlock logic", () => {
  const activityRunner = readFileSync(
    "src/app/dashboard/learning/activities/[activityId]/page.tsx",
    "utf8"
  );

  assert.equal(
    getLearningActivityRoute("activity-123"),
    "/dashboard/learning/activities/activity-123"
  );
  assert.equal(getLearningActivityPrimaryActionLabel("Quiz"), "Complete quiz");
  assert.equal(getLearningActivityChecklist("Reflection").length, 3);
  assert.deepEqual(
    getNextQueuedLearningActivity(
      [
        {
          id: "done",
          activity_type: "Lesson",
          title: "Done",
          difficulty: "Beginner",
          estimated_minutes: 15,
          xp: 10,
          status: "Completed",
          sort_order: 1,
        },
        {
          id: "next",
          activity_type: "Practice",
          title: "Next",
          difficulty: "Beginner",
          estimated_minutes: 20,
          xp: 15,
          status: "Queued",
          sort_order: 2,
        },
      ],
      "done"
    )?.id,
    "next"
  );
  assert.equal(
    getLearningActivityCompletionPayload(new Date("2026-07-06T12:00:00.000Z"))
      .completed_at,
    "2026-07-06T12:00:00.000Z"
  );
  assert.match(activityRunner, /Activity Complete/);
  assert.match(activityRunner, /Return to Today/);
  assert.match(activityRunner, /View Activities/);
});

test("learning onboarding redirect has no duplicate direct redirect sources", () => {
  const sourceFiles = [
    "src/app/dashboard/layout.tsx",
    "src/app/dashboard/onboarding/page.tsx",
    "src/app/dashboard/today/page.tsx",
    "src/lib/learning/onboardingCompletion.ts",
  ];
  const directRedirectSources = sourceFiles.flatMap((file) => {
    const source = readFileSync(file, "utf8");
    const matches = source.match(/router\.replace\("\/dashboard\/onboarding"\)/g) || [];

    return matches.map(() => file);
  });

  assert.deepEqual(directRedirectSources, []);
});

test("learning onboarding completion tolerates a stale profile read after confirmed save", () => {
  assert.equal(
    isLearningOnboardingComplete({
      profileComplete: false,
      sessionComplete: true,
    }),
    true
  );
  assert.equal(
    getOnboardingRedirect({
      isAuthenticated: true,
      onboardingComplete: true,
      pathname: "/dashboard/today",
    }),
    null
  );
});

test("learning onboarding repair path only runs once for complete saved setup data", () => {
  const completeStatus = {
    profiles: 1,
    goals: 1,
    courses: 1,
    plans: 1,
    sessions: 1,
    activities: 1,
  };
  const incompleteStatus = {
    profiles: 1,
    goals: 1,
    courses: 1,
    plans: 1,
    sessions: 1,
    activities: 0,
  };

  assert.equal(hasCompleteLearningOnboardingData(completeStatus), true);
  assert.equal(hasCompleteLearningOnboardingData(incompleteStatus), false);
  assert.equal(
    shouldAttemptLearningOnboardingRepair({
      onboardingComplete: false,
      status: completeStatus,
      repairAlreadyAttempted: false,
    }),
    true
  );
  assert.equal(
    shouldAttemptLearningOnboardingRepair({
      onboardingComplete: false,
      status: completeStatus,
      repairAlreadyAttempted: true,
    }),
    false
  );
  assert.equal(
    shouldAttemptLearningOnboardingRepair({
      onboardingComplete: true,
      status: completeStatus,
      repairAlreadyAttempted: false,
    }),
    false
  );
  assert.equal(
    shouldAttemptLearningOnboardingRepair({
      onboardingComplete: false,
      status: incompleteStatus,
      repairAlreadyAttempted: false,
    }),
    false
  );
});

test("learning onboarding backend failures include the failed save step", () => {
  assert.equal(
    getOnboardingSaveErrorMessage(
      "your account completion status",
      new Error("permission denied for table profiles")
    ),
    "Could not save your account completion status: permission denied for table profiles"
  );
});

test("learning gamification calculates XP levels and goals", () => {
  const progress = buildLearningProgressSignals({
    goals: mockLearningGoals,
    courses: mockLearningCourses,
    plan: mockLearningPlan,
    sessions: mockLearningSessions,
    achievements: mockLearningAchievements,
    studySession: mockStudySessionCommand,
  });
  const gamification = buildGamificationProfile({
    progress,
    masteredConcepts: 2,
  });

  assert.equal(calculateLearningLevel(0), 1);
  assert.equal(calculateLearningLevel(500), 2);
  assert.equal(calculateNextLevelXp(3), 1500);
  assert.equal(gamification.xp > 0, true);
  assert.equal(gamification.skillLevels.length, 3);
  assert.equal(gamification.dailyGoal.includes("focused"), true);
});

test("learning motivation habits and insights are rule-based", () => {
  const progress = buildLearningProgressSignals({
    goals: mockLearningGoals,
    courses: mockLearningCourses,
    plan: mockLearningPlan,
    sessions: mockLearningSessions,
    achievements: mockLearningAchievements,
    studySession: mockStudySessionCommand,
  });
  const habits = buildStudyHabitsSnapshot();
  const gamification = buildGamificationProfile({
    progress,
    masteredConcepts: 1,
  });
  const motivation = buildMotivationSnapshot({ progress, habits });
  const insights = buildLearnerInsights({ progress, habits, gamification });

  assert.equal(habits.averageSessionLength.endsWith("min"), true);
  assert.equal(habits.consistency, 60);
  assert.equal(motivation.dailyEncouragement.includes(progress.weakArea), true);
  assert.equal(insights.length, 4);
  assert.equal(insights.some((insight) => insight.id === "review-skip"), true);
});

test("learning journeys model goal to completion roadmaps", () => {
  const journeys = buildLearningJourneys(mockLearningGoals);
  const activeJourney = journeys.find((journey) => journey.active);

  assert.equal(Boolean(activeJourney), true);
  assert.deepEqual(
    activeJourney?.steps.map((step) => step.kind),
    ["goal", "milestone", "course", "lesson", "mastery", "completion"]
  );
  assert.equal(
    activeJourney?.steps.some((step) => step.status === "active"),
    true
  );
});

test("learning experience dashboard aggregates v0.5 LX surfaces", () => {
  const progress = buildLearningProgressSignals({
    goals: mockLearningGoals,
    courses: mockLearningCourses,
    plan: mockLearningPlan,
    sessions: mockLearningSessions,
    achievements: mockLearningAchievements,
    studySession: mockStudySessionCommand,
  });
  const achievements = buildLearningAchievementUnlocks({
    progress,
    goalsCreated: mockLearningGoals.length,
    goalsCompleted: 0,
    masteredSkills: 1,
    foundingStudent: true,
  });
  const experience = buildLearningExperienceDashboard({
    learnerName: "Current learner",
    progress,
    goals: mockLearningGoals,
    achievements,
    parentDashboard: mockParentDashboard,
  });

  assert.equal(experience.daily.nextAction, progress.recommendedNextAction);
  assert.equal(experience.focusMode.exitLabel, "Exit focus mode");
  assert.equal(experience.achievements.some((item) => item.rarity === "Founding"), true);
  assert.equal(experience.certificate.skillsEarned.length, 3);
  assert.equal(experience.accessibility.largerTextOption, true);
  assert.equal(experience.learnerProfile.level, experience.gamification.level);
  assert.equal(experience.parentExperience.nextConversationSuggestions.length, 2);
  assert.equal(experience.beta.badges.includes("Beta Tester"), true);
});

test("learning global subject catalog covers knowledge domains", () => {
  assert.equal(globalSubjectCatalog.length >= 17, true);
  assert.equal(
    globalSubjectCatalog.some(
      (subject) =>
        subject.id === "cybersecurity" &&
        subject.relatedSubjectIds.includes("programming") &&
        subject.estimatedLearningHours > 0
    ),
    true
  );
  assert.equal(
    globalSubjectCatalog.every(
      (subject) =>
        subject.name &&
        subject.description &&
        subject.iconPlaceholder &&
        subject.color &&
        subject.difficultyRange
    ),
    true
  );
});

test("learning curriculum hierarchy reaches objectives", () => {
  const curriculum = curriculumSubjects[0];
  const objective =
    curriculum.courses[0].modules[0].lessons[0].concepts[0].skills[0].objectives[0];

  assert.equal(curriculum.id, "cybersecurity");
  assert.equal(curriculum.courses[0].id, "security-plus-foundations-course");
  assert.equal(curriculum.courses[0].modules[0].lessons.length >= 2, true);
  assert.equal(objective.id, "objective-identity-proofing");
  assert.equal(Boolean(objective.metadata), true);
});

test("learning concept library models prerequisites and dependents", () => {
  const rbac = curriculumConceptLibrary.find(
    (concept) => concept.id === "role-based-access-control"
  );
  const identity = curriculumConceptLibrary.find(
    (concept) => concept.id === "identity-verification"
  );

  assert.equal(rbac?.prerequisiteIds.includes("authentication-factors"), true);
  assert.equal(identity?.dependentConceptIds.includes("authentication-factors"), true);
  assert.equal(rbac?.commonMistakes.length, 1);
  assert.equal(rbac?.relatedConceptIds.includes("least-privilege"), true);
});

test("learning skill tree exposes visualization-ready status", () => {
  const tree = buildSkillTree("cybersecurity");

  assert.equal(tree.nodes.length, 4);
  assert.equal(tree.edges.some((edge) => edge.to === "role-based-access-control"), true);
  assert.equal(
    tree.nodes.some(
      (node) => node.id === "identity-verification" && node.status === "mastered"
    ),
    true
  );
  assert.equal(
    tree.nodes.some((node) => node.status === "blocked"),
    true
  );
  assert.equal(tree.nodes.every((node) => typeof node.x === "number" && typeof node.y === "number"), true);
});

test("learning standards careers and certifications remain mocked catalogs", () => {
  assert.deepEqual(
    learningStandards.map((standard) => standard.type),
    [
      "Common Core",
      "State standards",
      "National standards",
      "Certification objectives",
      "Trade competencies",
    ]
  );
  assert.equal(careerKnowledgeCatalog[0].recommendedCertificationIds[0], "comptia-security-plus");
  assert.equal(
    certificationCatalog.some(
      (certification) =>
        certification.provider === "CompTIA" &&
        certification.recommendedConceptIds.includes("role-based-access-control")
    ),
    true
  );
  assert.equal(
    new Set(certificationCatalog.map((certification) => certification.provider)).size >= 10,
    true
  );
});

test("learning path generator produces curriculum sequence and milestones", () => {
  const path = generateCurriculumLearningPath({
    goal: "Become a security analyst",
    careerId: "security-analyst",
    certificationId: "comptia-security-plus",
    subjectId: "cybersecurity",
    interest: "security operations",
  });

  assert.equal(path.recommendedCurriculum[0], "security-plus-foundations-course");
  assert.deepEqual(path.recommendedSequence, [
    "identity-verification",
    "authentication-factors",
    "role-based-access-control",
  ]);
  assert.equal(path.estimatedTimeline, "8-12 weeks");
  assert.equal(path.milestones.length, 4);
});

test("learning resource mapping connects resources across curriculum entities", () => {
  const rbacLinks = getResourceLinksForConcept("role-based-access-control");

  assert.equal(resourceMapLinks.length >= 4, true);
  assert.equal(rbacLinks.some((link) => link.courseIds.includes("security-plus-foundations-course")), true);
  assert.equal(rbacLinks.some((link) => link.certificationIds.includes("comptia-security-plus")), true);
  assert.equal(rbacLinks.some((link) => link.careerIds.includes("security-analyst")), true);
});

test("learning mastery map recommends next concept", () => {
  const masteryMap = buildMasteryMap("cybersecurity");

  assert.deepEqual(
    masteryMap.nodes.map((node) => node.status),
    ["Known", "Learning", "Needs Review", "Not Started"]
  );
  assert.equal(masteryMap.recommendedNextConceptId, "role-based-access-control");
});

test("learning knowledge dashboard aggregates v0.6 curriculum intelligence", () => {
  const dashboard = buildKnowledgeIntelligenceDashboard();

  assert.equal(dashboard.subjects.length, globalSubjectCatalog.length);
  assert.equal(dashboard.curriculum.length, curriculumSubjects.length);
  assert.equal(dashboard.concepts.length, curriculumConceptLibrary.length);
  assert.equal(dashboard.skillTree.nodes.length, 4);
  assert.equal(dashboard.standards.length, learningStandards.length);
  assert.equal(dashboard.careers.length, careerKnowledgeCatalog.length);
  assert.equal(dashboard.certifications.length, certificationCatalog.length);
  assert.equal(dashboard.generatedPath.certificationId, "comptia-security-plus");
  assert.equal(dashboard.resourceLinks.length, resourceMapLinks.length);
  assert.equal(dashboard.masteryMap.recommendedNextConceptId, "role-based-access-control");
});

test("learning AI specialist registry exposes v0.7 contracts", () => {
  assert.equal(aiSpecialistRegistry.length, 16);
  assert.deepEqual(
    aiSpecialistRegistry.map((specialist) => specialist.name),
    [
      "Tutor",
      "Study Coach",
      "Homework Coach",
      "Guidance Counselor",
      "Career Mentor",
      "Certification Coach",
      "Writing Coach",
      "Reading Coach",
      "Language Coach",
      "Math Coach",
      "Science Coach",
      "Coding Coach",
      "Trade Instructor",
      "Interview Coach",
      "Parent Assistant",
      "Motivation Coach",
    ]
  );
  assert.equal(getAISpecialistByRole("Tutor")?.id, "tutor");
  assert.equal(getAISpecialistById("homework-coach")?.requiredContext.includes("currentLesson"), true);
  assert.equal(getAISpecialistById("homework-coach")?.futureAIStatus, "connected");
  assert.equal(
    aiSpecialistRegistry.every(
      (specialist) =>
        specialist.description &&
        specialist.supportedSubjects.length > 0 &&
        specialist.supportedGoals.length > 0 &&
        specialist.supportedLearnerAges.length > 0 &&
        specialist.supportedOutputTypes.length > 0 &&
        specialist.requiredContext.length > 0
    ),
    true
  );
});

test("learning AI intent detection maps requests to conversation types", () => {
  assert.equal(detectLearningIntent("Can you help with this homework?"), "Homework help");
  assert.equal(detectLearningIntent("Quiz me on RBAC"), "Quiz me");
  assert.equal(detectLearningIntent("I need career advice"), "Career advice");
  assert.equal(conversationTypeFromIntent("Homework help"), "Question");
  assert.equal(conversationTypeFromIntent("Quiz me"), "Assessment");
});

test("learning AI context builder gathers reusable learner context", () => {
  const snapshot = buildLearningIntelligenceSnapshot({
    goals: mockLearningGoals,
    weeklyStudyMinutes: 80,
  });
  const context = buildLearningAIContext({
    learnerName: "Current learner",
    mastery: snapshot.mastery,
    weakAreas: snapshot.mastery.weakConcepts,
    currentLesson: "Access Control",
    goals: mockLearningGoals.map((goal) => goal.title),
    courses: mockLearningCourses.map((course) => course.title),
    recentSessions: mockLearningSessions.map((session) => session.title),
  });

  assert.equal(context.profile, "Current learner");
  assert.equal(context.goals.includes("Security+"), true);
  assert.equal(context.recentSessions.includes("Authentication and access control"), true);
  assert.equal(context.career, "Security Analyst");
  assert.equal(context.currentLesson, "Access Control");
  assert.equal(context.mastery.some((item) => item.includes("role-based-access")), true);
});

test("learning AI router selects deterministic specialists", () => {
  const snapshot = buildLearningIntelligenceSnapshot({
    goals: mockLearningGoals,
    weeklyStudyMinutes: 80,
  });
  const context = buildLearningAIContext({
    learnerName: "Current learner",
    mastery: snapshot.mastery,
    weakAreas: snapshot.mastery.weakConcepts,
    currentLesson: "Access Control",
  });
  const homeworkRoute = routeLearningAI({
    userRequest: "Help me with this homework without giving the answer",
    context,
    goal: "homework help",
    subject: "Cybersecurity",
    currentLesson: "Access Control",
    mastery: "Needs Review",
    conversationType: "Question",
  });
  const certificationRoute = routeLearningAI({
    userRequest: "Build my Security+ certification plan",
    context,
    goal: "certification",
    subject: "Cybersecurity",
    currentLesson: "Access Control",
    mastery: "Needs Review",
    conversationType: "Planning",
  });

  assert.equal(homeworkRoute.selectedSpecialistIds[0], "homework-coach");
  assert.equal(certificationRoute.selectedSpecialistIds[0], "certification-coach");
  assert.equal(homeworkRoute.reasonSelected.includes("Homework help"), true);
});

test("learning AI memory homework policy and session manager remain mocked", () => {
  const updatedMemory = updateMockConversationMemory({
    topic: "RBAC",
    question: "What hint should I try next?",
  });
  const answerPolicy = getHomeworkPolicyForRequest("What is the answer?");
  const session = createMockAISession({
    specialistId: "homework-coach",
    topic: "Access Control",
    learningObjective: "Reason through RBAC.",
  });

  assert.equal(mockConversationMemory.activeTopic, "Access Control");
  assert.equal(updatedMemory.openQuestions.includes("What hint should I try next?"), true);
  assert.equal(homeworkPolicy.neverImmediatelyAnswer, true);
  assert.equal(answerPolicy.policyName, "Answer Check After Reasoning");
  assert.equal(session.completed, false);
  assert.equal(session.conversationId.includes("homework-coach"), true);
});

test("learning AI orchestration dashboard aggregates v0.7 platform state", () => {
  const snapshot = buildLearningIntelligenceSnapshot({
    goals: mockLearningGoals,
    weeklyStudyMinutes: 80,
  });
  const dashboard = buildAIOrchestrationDashboard({
    learnerName: "Current learner",
    mastery: snapshot.mastery,
  });

  assert.equal(dashboard.registry.length, 16);
  assert.equal(dashboard.intent, "Homework help");
  assert.equal(dashboard.routerResult.selectedSpecialistIds[0], "homework-coach");
  assert.equal(dashboard.context.currentLesson, "Access Control");
  assert.equal(dashboard.requiredContext.includes("currentLesson"), true);
  assert.equal(dashboard.futureAIStatus.includes("OpenAI adapter"), true);
});

test("learning private beta readiness drives mission stages", () => {
  const readiness = buildLearningBetaReadiness({ completedMissionCount: 5 });

  assert.equal(readiness.stage, "Active Learner");
  assert.equal(readiness.completionPercent, 63);
  assert.equal(readiness.nextBestAction, "Create first learning plan");
  assert.equal(readiness.badges.some((badge) => badge.label === "Founding Student"), true);
  assert.equal(readiness.missions[0].status, "complete");
  assert.equal(readiness.missions[5].status, "active");
});

test("learning private beta timeline certificates and fallback data are structured", () => {
  const timeline = buildLearningTimeline({
    learnerName: "Current learner",
    goals: mockLearningGoals,
    sessions: mockLearningSessions,
  });
  const certificateDocuments = buildCertificateDocuments(mockLearningCertificates);
  const privateBeta = buildStaticPrivateBetaData({
    learnerName: "Current learner",
    goals: mockLearningGoals,
    sessions: mockLearningSessions,
    certificates: mockLearningCertificates,
  });

  assert.equal(timeline[0].type, "joined");
  assert.equal(timeline.some((item) => item.type === "goal"), true);
  assert.equal(certificateDocuments[0].downloadUrl.includes("/api/learning/certificates/"), true);
  assert.equal(privateBeta.persistenceStatus, "fallback-static");
  assert.equal(privateBeta.feedback[0].status, "Reviewing");
});

test("learning OpenAI adapter builds centralized prompt messages without requiring configuration", () => {
  const snapshot = buildLearningIntelligenceSnapshot({
    goals: mockLearningGoals,
    weeklyStudyMinutes: 80,
  });
  const context = buildLearningAIContext({
    learnerName: "Current learner",
    mastery: snapshot.mastery,
    weakAreas: snapshot.mastery.weakConcepts,
    currentLesson: "Access Control",
  });
  const messages = buildOpenAILearningMessages({
    specialistId: "homework-coach",
    specialistName: "Homework Coach",
    conversationType: "Question",
    messages: [{ role: "user", content: "Help me with homework." }],
    context,
    homeworkPolicy: getHomeworkPolicyForRequest("Help me with homework."),
  });

  assert.equal(isOpenAILearningConfigured(), Boolean(process.env.OPENAI_API_KEY));
  assert.equal(messages[0].role, "system");
  assert.equal(messages[0].content.includes("Homework Coach"), true);
  assert.equal(messages[0].content.includes("Never immediately answer: yes"), true);
  assert.equal(messages[1].content, "Help me with homework.");
});

test("learning persistence maps feedback and table names for Supabase", () => {
  const payload = buildFeedbackInsertPayload({
    userId: "user-1",
    category: "feature request",
    message: "Add calmer onboarding.",
    context: "Private Beta",
  });
  const item = mapFeedbackRow({
    id: "feedback-1",
    category: "feature request",
    message: "Add calmer onboarding.",
    context: "Private Beta",
    status: "New",
    created_at: "2026-07-04T00:00:00.000Z",
  });

  assert.equal(learningTableNames.profiles, "learning_profiles");
  assert.equal(learningTableNames.feedback, "learning_feedback");
  assert.deepEqual(payload, {
    user_id: "user-1",
    category: "feature request",
    message: "Add calmer onboarding.",
    context: "Private Beta",
    status: "New",
  });
  assert.equal(item.submittedAt, "2026-07-04T00:00:00.000Z");
});

test("learning plan generator creates deterministic starter plans", () => {
  const plan = generateLearningPlan({
    learningObjective: "Security+",
    motivation: "Career growth",
    targetOutcome: "Pass the exam",
    timeline: "8 weeks",
    currentLevel: "Beginner",
    studyPace: "Focused: 5 sessions per week",
  });

  assert.equal(plan.title, "Security+ starter plan");
  assert.equal(plan.recommendedSessions.length, 3);
  assert.equal(plan.weeklyRhythm[0], "5 study sessions per week");
  assert.equal(plan.recommendedSessions[0].duration, "35 min");
  assert.equal(plan.readinessSignal.label, "Starter-ready");
  assert.equal(plan.readinessSignal.confidence, "reserved");
  assert.equal(
    plan.skillCheckpoints.some((checkpoint) =>
      checkpoint.includes("core vocabulary")
    ),
    true
  );
  assert.equal(
    plan.suggestedNextAction,
    "Schedule the first 35 min foundation scan for Security+."
  );
});

test("velocity settings helpers map persisted and stored values", () => {
  const mapped = mapVelocitySettingsRow({
    velocity_source_type: "ploc",
    credit_limit: 10000,
    current_balance: 2500,
    source_apr: 8.5,
    allow_super_velocity: true,
  });

  assert.equal(mapped.velocity_source_type, "ploc");
  assert.equal(mapped.credit_limit, "10000");
  assert.equal(mapped.max_utilization_percent, "66");
  assert.equal(mapped.recovery_months, "6");
  assert.equal(mapped.allow_super_velocity, true);

  const merged = mergeStoredVelocitySettings(
    JSON.stringify({ credit_limit: "5000" })
  );
  assert.deepEqual(merged, {
    ...DEFAULT_VELOCITY_SETTINGS,
    credit_limit: "5000",
  });

  assert.deepEqual(velocitySettingsToUpsertPayload(mapped), {
    velocity_source_type: "ploc",
    credit_limit: 10000,
    current_balance: 2500,
    source_apr: 8.5,
    max_utilization_percent: 66,
    recovery_months: 6,
    emergency_reserve_amount: null,
    allow_super_velocity: true,
  });
});

test("entitlement helpers resolve plans and roles", () => {
  const proMembership: MembershipSnapshot = {
    ...DEFAULT_FREE_MEMBERSHIP,
    plan: "pro",
    source: "database",
  };

  assert.equal(FEATURE_ENTITLEMENTS.velocity_planner.requiredPlan, "pro");
  assert.deepEqual(resolveEntitlementContext(null), {
    plan: "free",
    role: "user",
  });
  assert.deepEqual(
    resolveEntitlementContext({ role: "user", membership: proMembership }),
    {
      plan: "pro",
      role: "user",
    }
  );
  assert.deepEqual(resolveEntitlementContext({ role: "beta" }), {
    plan: "pro",
    role: "beta",
  });
});

test("hasEntitlement gates pro features while keeping free features open", () => {
  const proMembership: MembershipSnapshot = {
    ...DEFAULT_FREE_MEMBERSHIP,
    plan: "pro",
    source: "database",
  };

  assert.equal(
    hasEntitlement(
      { role: "user", membership: DEFAULT_FREE_MEMBERSHIP },
      "cashflow"
    ),
    true
  );
  assert.equal(
    hasEntitlement(
      { role: "user", membership: DEFAULT_FREE_MEMBERSHIP },
      "velocity_planner"
    ),
    false
  );
  assert.equal(
    hasEntitlement(
      { role: "user", membership: proMembership },
      "velocity_planner"
    ),
    true
  );
  assert.equal(hasEntitlement({ role: "admin" }, "beast_advisor"), true);
  assert.equal(hasEntitlement({ role: "beta" }, "scenario_planning"), true);
});

test("admin view mode changes effective entitlements without changing real context", () => {
  assert.deepEqual([...ADMIN_VIEW_MODES], ["admin", "pro", "free"]);

  const adminProfile = { role: "admin", membership: DEFAULT_FREE_MEMBERSHIP };

  assert.deepEqual(resolveEntitlementContext(adminProfile), {
    plan: "pro",
    role: "admin",
  });
  assert.deepEqual(resolveEffectiveEntitlementContext(adminProfile, "admin"), {
    plan: "pro",
    role: "admin",
  });
  assert.deepEqual(resolveEffectiveEntitlementContext(adminProfile, "pro"), {
    plan: "pro",
    role: "user",
  });
  assert.deepEqual(resolveEffectiveEntitlementContext(adminProfile, "free"), {
    plan: "free",
    role: "user",
  });
  assert.equal(isAdminViewSimulationActive(adminProfile, "free"), true);
  assert.equal(isAdminViewSimulationActive(adminProfile, "admin"), false);
});

test("admin view mode has priority over database membership", () => {
  const databaseProMembership: MembershipSnapshot = {
    ...DEFAULT_FREE_MEMBERSHIP,
    plan: "pro",
    status: "active",
    isActive: true,
    source: "database",
  };
  const adminProfile = {
    role: "admin",
    membership: databaseProMembership,
  };

  assert.deepEqual(resolveEffectiveEntitlementContext(adminProfile, "free"), {
    plan: "free",
    role: "user",
  });
  assert.deepEqual(resolveEffectiveEntitlementContext(adminProfile, "pro"), {
    plan: "pro",
    role: "user",
  });
});

test("admin view mode is ignored for non-admin users", () => {
  const proMembership: MembershipSnapshot = {
    ...DEFAULT_FREE_MEMBERSHIP,
    plan: "pro",
    source: "database",
  };
  const proUser = { role: "user", membership: proMembership };

  assert.deepEqual(resolveEffectiveEntitlementContext(proUser, "free"), {
    plan: "pro",
    role: "user",
  });
  assert.equal(isAdminViewSimulationActive(proUser, "free"), false);
});

test("membership entitlement plan falls back to Free for inactive subscriptions", () => {
  assert.equal(getMembershipEntitlementPlan(DEFAULT_FREE_MEMBERSHIP), "free");
  assert.equal(
    getMembershipEntitlementPlan({
      ...DEFAULT_FREE_MEMBERSHIP,
      plan: "pro",
      status: "trial",
      isActive: true,
    }),
    "pro"
  );
  assert.equal(
    getMembershipEntitlementPlan({
      ...DEFAULT_FREE_MEMBERSHIP,
      plan: "pro",
      status: "canceled",
      isActive: false,
    }),
    "free"
  );
});

test("Stripe billing config and price selection fail safely", () => {
  const stripeConfig = {
    secretKey: "sk_test_123",
    publishableKey: "pk_test_123",
    monthlyPriceId: "price_monthly",
    annualPriceId: "price_annual",
    successUrl: "http://localhost:3000/dashboard/money/billing?success=true",
    cancelUrl: "http://localhost:3000/dashboard/money/billing?canceled=true",
    webhookSecret: "whsec_123",
  };

  assert.deepEqual(
    getStripeBillingConfig({
      STRIPE_SECRET_KEY: "sk_test_123",
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_123",
      STRIPE_PRO_MONTHLY_PRICE_ID: "price_monthly",
      STRIPE_PRO_ANNUAL_PRICE_ID: "price_annual",
      STRIPE_SUCCESS_URL: "http://localhost:3000/dashboard/money/billing?success=true",
      STRIPE_CANCEL_URL: "http://localhost:3000/dashboard/money/billing?canceled=true",
      STRIPE_WEBHOOK_SECRET: "whsec_123",
    }),
    {
      ok: true,
      config: stripeConfig,
    }
  );

  const config = {
    monthlyPriceId: "price_monthly",
    annualPriceId: "price_annual",
  };
  assert.equal(getCheckoutPriceId("monthly", config), "price_monthly");
  assert.equal(getCheckoutPriceId("annual", config), "price_annual");
  assert.equal(
    getBillingReturnUrl(stripeConfig),
    "http://localhost:3000/dashboard/money/billing"
  );

  const missing = getStripeBillingConfig({});
  assert.equal(missing.ok, false);
  assert.ok(
    !missing.ok && missing.missing.includes("STRIPE_SECRET_KEY")
  );
});

test("Stripe checkout config validation catches unsafe setup", () => {
  const validConfig = {
    secretKey: "sk_test_123",
    publishableKey: "pk_test_123",
    monthlyPriceId: "price_monthly",
    annualPriceId: "price_annual",
    successUrl: "http://localhost:3000/dashboard/money/billing?success=true",
    cancelUrl: "http://localhost:3000/dashboard/money/billing?canceled=true",
    webhookSecret: "whsec_123",
  };

  assert.equal(getStripeCheckoutConfigIssue(validConfig), null);
  assert.equal(
    getStripeCheckoutConfigIssue({
      ...validConfig,
      publishableKey: "pk_live_123",
    }),
    "Stripe secret and publishable keys must use the same test/live mode."
  );
  assert.equal(
    getStripeCheckoutConfigIssue({
      ...validConfig,
      monthlyPriceId: "prod_123",
    }),
    "Stripe Pro price IDs must start with price_."
  );
  assert.match(
    getCheckoutStartErrorMessage("invalid_price"),
    /same Stripe test\/live mode/
  );
});

test("Checkout session params use monthly and annual Stripe prices", () => {
  const stripeConfig = {
    secretKey: "sk_test_123",
    publishableKey: "pk_test_123",
    monthlyPriceId: "price_monthly",
    annualPriceId: "price_annual",
    successUrl: "http://localhost:3000/dashboard/money/billing?success=true",
    cancelUrl: "http://localhost:3000/dashboard/money/billing?canceled=true",
    webhookSecret: "whsec_123",
  };

  const monthly = buildCheckoutSessionCreateParams({
    userId: "user-1",
    interval: "monthly",
    customerId: "cus_123",
    config: stripeConfig,
  });
  const annual = buildCheckoutSessionCreateParams({
    userId: "user-1",
    interval: "annual",
    customerId: "cus_123",
    config: stripeConfig,
  });

  assert.equal(monthly.mode, "subscription");
  assert.deepEqual(monthly.line_items, [
    { price: "price_monthly", quantity: 1 },
  ]);
  assert.equal(monthly.metadata?.user_id, "user-1");
  assert.equal(monthly.subscription_data?.metadata?.user_id, "user-1");
  assert.deepEqual(annual.line_items, [
    { price: "price_annual", quantity: 1 },
  ]);
});

test("billing guards require authentication and customer ID", () => {
  assert.deepEqual(requireBillingUser(null), {
    ok: false,
    status: 401,
    message: "Authentication required.",
  });
  assert.deepEqual(requireBillingUser({ id: "user-1" }), {
    ok: true,
    user: { id: "user-1" },
  });
  assert.deepEqual(requireStripeCustomer(DEFAULT_FREE_MEMBERSHIP), {
    ok: false,
    status: 400,
    message: "A Stripe customer is required to manage billing.",
  });
  assert.deepEqual(
    requireStripeCustomer({
      ...DEFAULT_FREE_MEMBERSHIP,
      source: "database",
      subscription: {
        id: "sub-row-1",
        user_id: "user-1",
        plan: "pro",
        status: "active",
        billing_provider: "stripe",
        provider_customer_id: "cus_123",
        provider_subscription_id: "sub_123",
        current_period_end: null,
        cancel_at_period_end: false,
        created_at: "2026-07-02T00:00:00.000Z",
        updated_at: "2026-07-02T00:00:00.000Z",
      },
    }),
    { ok: true, customerId: "cus_123" }
  );
});

test("Stripe subscription sync maps paid and unsafe statuses to membership", () => {
  assert.equal(mapStripeStatusToMembershipPlan("active"), "pro");
  assert.equal(mapStripeStatusToMembershipPlan("trialing"), "pro");
  assert.equal(mapStripeStatusToMembershipPlan("canceled"), "free");
  assert.equal(mapStripeStatusToMembershipPlan("incomplete_expired"), "free");
  assert.equal(mapStripeStatusToMembershipPlan("past_due"), "free");
  assert.equal(mapStripeStatusToMembershipStatus("trialing"), "trial");
  assert.equal(mapStripeStatusToMembershipStatus("unpaid"), "past_due");
  assert.equal(
    mapStripeStatusToMembershipStatus("incomplete_expired"),
    "incomplete"
  );

  assert.deepEqual(
    buildMembershipUpdateFromStripeSubscription({
      id: "sub_123",
      customer: "cus_123",
      status: "active",
      current_period_end: 1782950400,
      cancel_at_period_end: false,
      metadata: { user_id: "user-1" },
    }),
    {
      userId: "user-1",
      plan: "pro",
      status: "active",
      providerCustomerId: "cus_123",
      providerSubscriptionId: "sub_123",
      currentPeriodEnd: "2026-07-02T00:00:00.000Z",
      cancelAtPeriodEnd: false,
    }
  );

  assert.deepEqual(
    buildMembershipUpdateFromStripeSubscription({
      id: "sub_123",
      customer: "cus_123",
      status: "past_due",
      metadata: { user_id: "user-1" },
    })?.plan,
    "free"
  );
  assert.deepEqual(
    buildMembershipUpdateFromStripeSubscription({
      id: "sub_123",
      customer: { id: "cus_123" },
      status: "canceled",
      metadata: { user_id: "user-1" },
    })?.status,
    "canceled"
  );
});

test("legacy syncSubscription interface no longer performs direct Stripe writes", async () => {
  assert.equal(
    (await syncSubscription({ userId: "user-1" })).message,
    "Subscription sync is handled by the Stripe webhook endpoint."
  );
});

test("due date reset payload only clears projected override date", () => {
  assert.deepEqual(buildResetDueDatePayload(), {
    next_due_date_after_payment: null,
  });
  assert.equal("assigned_paycheck" in buildResetDueDatePayload(), false);
  assert.equal("funding_source_id" in buildResetDueDatePayload(), false);
});
