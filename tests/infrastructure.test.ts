Warning: truncated output (original token count: 58997)
Total output lines: 6692

import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
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
  getBeastModuleNavigationForPersona,
  memberBeastEducationNavigation,
  memberBeastMoneyNavigation,
} from "../src/lib/moduleNavigation";
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
  BEAST_MONEY_VERSION,
  BEAST_MONEY_VERSION_LABEL,
  versionManifest,
} from "../src/lib/appVersion";
import {
  buildCalendarEvent,
  buildCalendarReminders,
  buildCalendarRescheduleRequest,
  buildCalendarViews,
  buildMonthGrid,
  buildRecurringCalendarEvents,
  calendarContractRules,
  calendarViewModes,
  detectCalendarConflicts,
  getLocalCalendarDate,
  getMonthLength,
  normalizeCalendarTimeZone,
  type CalendarEvent,
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
  beastAcademyAssessmentPolicy,
  decideTutorLessonReadiness,
  evaluateBeastAcademyCompletion,
} from "../src/lib/learning/academyCompletion";
import {
  getAgeFromBirthday,
  isRestrictedForLearningOnlyNavigation,
  shouldUseLearningOnlyNavigation,
} from "../src/lib/learning/access";
import {
  buildAdaptiveLearningPlan,
  decideAdaptiveProgression,
} from "../src/lib/learning/adaptivePlanner";
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
import { buildCertificationIntelligence } from "../src/lib/learning/certificationIntelligence";
import {
  getCollectionResourceCount,
  learningResourceCollections,
} from "../src/lib/learning/collections";
import {
  buildRequiredContentQualityReview,
  evaluateContentQualityReview,
  getCourseContentStatus,
  getLessonContentStatus,
  getRecommendationContentStatus,
  getStudyGuideContentStatus,
  learningContentReviewRequirements,
  learningStarterPathStandards,
  thirdPartyLearningSiteDirection,
} from "../src/lib/learning/contentGovernance";
import {
  buildAlternativeExplanationTurn,
  buildCoreLearnerProfile,
  buildHintTurn,
  buildTutorResponseTurn,
  completeCoreLessonMasteryCheck,
  generateCoreLearningPath,
  scorePlacementAssessment,
  startCoreLessonSession,
} from "../src/lib/learning/coreLearningLoop";
import { curriculumConceptLibrary } from "../src/lib/learning/concepts";
import {
  builtLearningCourses,
  calculateBuiltCourseProgress,
} from "../src/lib/learning/courses";
import { curriculumSubjects } from "../src/lib/learning/curriculum";
import { buildLearningDashboardContent } from "../src/lib/learning/dashboardContent";
import { buildDependencyGraphState } from "../src/lib/learning/dependencyGraph";
import { adjustLearningDifficulty } from "../src/lib/learning/difficultyAdjustment";
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
import {
  buildCurriculumKnowledgeGraph,
  mockLearningKnowledgeModel,
  recommendFromKnowledgeGraph,
} from "../src/lib/learning/knowledgeGraph";
import { mockLearningMemory } from "../src/lib/learning/learningMemory";
import { learningLessons } from "../src/lib/learning/lessons";
import { learningLibraryMaterials } from "../src/lib/learning/library";
import {
  calculateEvidenceMasteryScore,
  calculateMasteryProfile,
} from "../src/lib/learning/mastery";
import {
  buildLearnerSkillState,
  skillStateHasEvidence,
} from "../src/lib/learning/learnerSkillModel";
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
import {
  buildStudentProfile,
  studentProfileOwnershipRules,
} from "../src/lib/learning/studentProfile";
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
import { buildHomeworkPrompt } from "../src/lib/learning/promptLibrary";
import {
  buildCertificateDocuments,
  buildLearningBetaReadiness,
  buildLearningTimeline,
  buildStaticPrivateBetaData,
} from "../src/lib/learning/privateBeta";
import { buildBeastEducationPrivateBetaReadiness } from "../src/lib/learning/privateBetaReadiness";
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
  detectForgottenSkillReviews,
  buildSpacedRepetitionSchedule,
  generateMasteryDecayReviewSchedule,
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
  getNewestReadyLearningActivity,
  getNextQueuedLearningActivity,
  buildLearningActivityContinuityState,
} from "../src/lib/learning/activityRunner";
import {
  buildGeneratedLearningActivityPayload,
  getGeneratedActivityTitle,
  getGeneratedLearningSubject,
} from "../src/lib/learning/generatedActivities";
import {
  buildPlatformSearchItem,
  buildRecentSearches,
  buildSavedSearch,
  buildSearchActionRequest,
  buildUniversalSearchIndex,
  interpretNaturalLanguageSearch,
  searchContractRules,
  searchPlatformIndex,
  type PlatformSearchItem,
} from "../src/lib/platform/search";
import {
  buildTimelineDetail,
  buildTimelineItem,
  buildTimelineStream,
  groupTimelineByDate,
  summarizeTimeline,
  timelineContractRules,
  type PlatformTimelineItem,
} from "../src/lib/platform/timeline";
import {
  buildNotificationActionRequest,
  buildNotificationDigest,
  buildNotificationInbox,
  buildNotificationItem,
  groupNotificationsBySeverity,
  notificationContractRules,
  type PlatformNotificationItem,
} from "../src/lib/platform/notifications";
import {
  buildSharedAIContext,
  buildSharedAIMemoryBoundary,
  buildSharedAIRecommendation,
  buildSharedAISpecialistHandoff,
  sharedAIContractRules,
  type SharedAIContextItem,
} from "../src/lib/platform/sharedAI";
import {
  buildPlatformUXReadiness,
  buildPlatformUXState,
  getPlatformSupportLinks,
  platformUXCoreRoutes,
  platformUXRules,
  type PlatformUXStateKind,
} from "../src/lib/platform/ux";
import { generateDynamicLearningLesson } from "../src/lib/learning/dynamicLessonGenerator";
import {
  createGeneratedLearningContentRecord,
  getLearningActivityTitleForGoal,
  getSampleActivityTitleForGoal,
  getSampleCurriculumScope,
  resolveLearningContentRecordForSubject,
  sampleLearningContentRecords,
} from "../src/lib/learning/sampleContentRegistry";
import {
  buildLessonEngineDefinition,
  combiningLikeTermsLesson,
  getGuidedPracticeScore,
  getLessonEngineProgress,
  getLessonTeacherResponse,
  getQuizScore,
  getTeachingVisualSelectionFeedback,
  isPracticeAnswerCorrect,
} from "../src/lib/learning/lessonEngine";
import {
  getLessonTemplateCoverage,
  getLessonTemplateForLesson,
  lessonSatisfiesTemplate,
  lessonTemplateLibrary,
} from "../src/lib/learning/lessonTemplates";
import {
  getPracticeTemplateForStep,
  getPracticeTemplateVariation,
  lessonPracticeSatisfiesTemplates,
  practiceTemplateLibrary,
} from "../src/lib/learning/practiceTemplates";
import {
  assessmentQuestionTypeRegistry,
  getAssessmentQuestionTypeCoverage,
  getAssessmentQuestionTypeForQuestion,
  questionSatisfiesAssessmentType,
} from "../src/lib/learning/assessmentQuestionTypes";
import {
  normalizeAnswerForValidation,
  validateAnswer,
} from "../src/lib/learning/answerValidation";
import {
  evaluateWrittenResponseRubric,
  getWrittenResponseRubricById,
  writtenResponseRubrics,
} from "../src/lib/learning/writtenResponseRubrics";
import {
  contentCanBePublished,
  contentMetadataIsComplete,
  contentRequiresReview,
  createLearningContentMetadata,
  generatedContentHasReviewStatus,
  learningContentVersion,
} from "../src/lib/learning/contentVersioning";
import {
  buildGeneratedContentProvenance,
  courseCurriculumLifecycleRecords,
  courseAuthorityMappings,
  courseCanBeProductionTeachable,
  curriculumAuthorityDomains,
  curriculumLifecycleOrder,
  curriculumAuthorityObjectives,
  curriculumAuthoritySources,
  createGeneratedCurriculumLifecycleRecord,
  generatedContentCanBecomeProductionCurriculum,
  getCourseAuthorityGaps,
  getCourseAuthorityMapping,
  getAuthorityTypesForCourse,
  resolveTutorCurriculumAccess,
  tutorCanTeachCourseByDefault,
  getLessonObjectiveAlignment,
  getObjectivesForCourse,
  lessonObjectiveAlignments,
} from "../src/lib/learning/curriculumAuthority";
import { buildMentorCurriculumIntelligence } from "../src/lib/learning/mentorCurriculumIntelligence";
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
  beastAdminNavigation,
  beastOSNavigation,
  buildApplicationNavigationForPersona,
  buildBeastModuleNavigationForPersona,
  buildOwnerNavigationForPersona,
  beastLearningNavigation,
  beastMoneyNavigation,
  getModuleChildren,
  primaryNavigation,
  secondaryNavigation,
  sharedNavigation,
} from "../src/lib/moduleNavigation";
import {
  beastModuleRegistry,
  getModuleVisibilityLabel,
  getVisibleModuleRegistryEntries,
  MODULE_VISIBILITY_LABELS,
  updateModuleVisibility,
} from "../src/lib/moduleRegistry";
import {
  assignBetaModule,
  beastAdminBetaAssignableModules,
  buildBeastAdminAnalytics,
  buildBetaAssignmentRows,
  canAccessBeastAdmin,
  getBetaAssignableModuleLabels,
  isBeastAdminOwnerRole,
  type BeastAdminBetaAssignment,
  type BeastAdminFeedbackItem,
  type BeastAdminMember,
} from "../src/lib/beastAdmin";

const beastAdminFixtureMembers: BeastAdminMember[] = [
  {
    id: "fixture-owner",
    name: "Fixture Owner",
    email: "owner@example.com",
    joinDate: "2026-07-01",
    status: "Active",
    role: "Owner",
  },
  {
    id: "fixture-beta",
    name: "Fixture Beta",
    email: "beta@example.com",
    joinDate: "2026-07-10",
    status: "Invited",
    role: "Beta",
  },
];

const beastAdminFixtureAssignments: BeastAdminBetaAssignment[] = [
  {
    id: "fixture-learning-beta",
    memberId: "fixture-beta",
    moduleId: "learning",
    assignedAt: "2026-07-13T00:00:00.000Z",
  },
];

const beastAdminFixtureFeedback: BeastAdminFeedbackItem[] = [
  {
    id: "fixture-feedback",
    date: "2026-07-13",
    module: "BeastEducation",
    user: "Fixture Beta",
    status: "New",
    summary: "Fixture feedback for deterministic helper coverage.",
  },
];

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

test("app version constants reflect BeastOS and module releases", () => {
  assert.equal(APP_VERSION, `v${versionManifest.beastos.version}`);
  assert.equal(BEAST_MONEY_VERSION, `v${versionManifest.beastmoney.version}`);
  assert.equal(BEAST_MONEY_VERSION_LABEL, `${versionManifest.beastmoney.name} v${versionManifest.beastmoney.version}`);
  assert.equal(BEAST_LEARNING_VERSION, `v${versionManifest.beastlearning.version} ${versionManifest.beastlearning.channel}`);
  assert.equal(BEASTOS_UI_POLISH_NOTE, "two-tone module branding restored");
});

test("BeastMoney version is consistent across visible release surfaces", () => {
  const files = [
    "src/app/dashboard/money/BeastMoneyShell.tsx",
    "src/app/dashboard/releases/page.tsx",
    "src/app/release-notes/page.tsx",
  ];

  files.forEach((file) => {
    const source = readFileSync(file, "utf8");
    assert.equal(
      source.includes(BEAST_MONEY_VERSION_LABEL) ||
        source.includes("BEAST_MONEY_VERSION_LABEL") ||
        source.includes(`BeastMoney ${BEAST_MONEY_VERSION}`),
      true,
      `${file} should use the canonical BeastMoney identity`
    );
  });
});

test("platform release copy does not retain stale current-version literals", () => {
  const readme = readFileSync("README.md", "utf8");
  const releasesPage = readFileSync("src/app/dashboard/releases/page.tsx", "utf8");
  assert.match(readme, new RegExp(`BeastMoney v${versionManifest.beastmoney.version}`));
  assert.doesNotMatch(readme, /BeastMoney v2\.3\.0/);
  assert.match(releasesPage, /Current \{APP_VERSION\}/);
  assert.doesNotMatch(releasesPage, /Active v2\.1\.1/);
});

function readSourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = `${directory}/${entry}`;
    const stat = statSync(path);

    if (stat.isDirectory()) {
      return readSourceFiles(path);
    }

    return /\.(ts|tsx|js|jsx)$/.test(entry) ? [readFileSync(path, "utf8")] : [];
  });
}

test("source copy does not expose developer readiness labels", () => {
  const source = readSourceFiles("src").join("\n");
  const lowerSource = source.toLowerCase();

  assert.equal(source.includes("Supabase-ready"), false);
  assert.equal(source.includes("API-ready"), false);
  assert.equal(lowerSource.includes("supabase-ready"), false);
  assert.equal(lowerSource.includes("api-ready"), false);
});

test("module navigation centralizes expandable child items", () => {
  assert.deepEqual(
    primaryNavigation.map((item) => item.label),
    [
      "Dashboard",
      "Calendar",
      "Notifications",
      "Messages",
      "Timeline",
      "Personal Hub",
      "Search",
    ]
  );
  assert.deepEqual(
    beastModuleNavigation.map((item) => item.label),
    [
      "BeastMoney",
      "BeastEducation",
      "BeastGoals",
      "BeastDocuments",
      "BeastHealth",
      "BeastHome",
      "BeastAdmin",
      "BeastProjects",
    ]
  );
  assert.deepEqual(
    sharedNavigation.map((item) => item.label),
    ["Documents", "Goals"]
  );
  assert.deepEqual(
    secondaryNavigation.map((item) => item.label),
    ["Relationship Center", "Director", "Digital Staff"]
  );
  assert.deepEqual(
    buildApplicationNavigationForPersona({ isOwner: true }).map(
      (item) => item.label
    ),
    ["BeastMoney", "BeastEducation", "BeastHealth", "BeastHome"]
  );
  assert.deepEqual(
    buildOwnerNavigationForPersona({ isOwner: true }).map((item) => item.label),
    ["BeastAdmin", "BF-Dash"]
  );
  assert.deepEqual(buildOwnerNavigationForPersona({ isOwner: false }), []);
  assert.equal(beastMoneyNavigation.href, "/dashboard/money/dashboard");
  assert.equal(beastLearningNavigation.href, "/dashboard/education");
  assert.equal(beastAdminNavigation.href, "/dashboard/admin");
  assert.deepEqual(
    beastLearningNavigation.children?.map((item) => item.label),
    [
      "Dashboard",
      "Guidance Counselor",
      "About You",
      "Education Planning",
      "Career Planning",
      "Education Goals",
      "Schools",
      "Certifications",
      "Scholarships",
      "Education Documents",
      "Progress & Decisions",
    ]
  );
  assert.equal(
    beastLearningNavigation.children?.[2].href,
    "/dashboard/education/about-you"
  );
  assert.equal(beastMoneyNavigation.label, "BeastMoney");
  assert.equal(
    beastMoneyNavigation.children?.map((item) => item.label).join(","),
    "Dashboard,Money Coach,Cash Flow,Income,Expenses,Bills,Debts,Payoff Plan,Strategies,Timeline,Velocity Banking,Retirement,Financial Goals,Financial Documents,Reports"
  );
  assert.equal(getModuleChildren("learning").length, 11);
  const moneyChildren = getModuleChildren("money");
  const addBill = moneyChildren.find((item) => item.label === "Add Bill");
  const addDebt = moneyChildren.find((item) => item.label === "Add Debt");

  assert.equal(addBill, undefined);
  assert.equal(addDebt, undefined);
  assert.match(
    readFileSync(
      "src/app/dashboard/money/cashflow/components/AddIncomeBillSection.tsx",
      "utf8"
    ),
    /<div id="add-bill" className="money-section-card">[\s\S]*<h2 className="money-section-title">Add Bill<\/h2>/
  );
  assert.match(
    readFileSync("src/app/dashboard/money/debts/page.tsx", "utf8"),
    /<section id="add-debt" className="money-section-card">[\s\S]*<h2 className="money-section-title">Add Debt<\/h2>/
  );
});

test("BO-308 keeps BeastOS focused and BO-311 makes Personal Hub canonical", () => {
  const settingsPage = readFileSync("src/app/dashboard/settings/page.tsx", "utf8");
  const settingsProfilePage = readFileSync(
    "src/app/dashboard/settings/profile/page.tsx",
    "utf8"
  );
  const legacyProfilePage = readFileSync(
    "src/app/dashboard/profile/page.tsx",
    "utf8"
  );

  assert.deepEqual(
    primaryNavigation.map(({ label, href }) => [label, href]),
    [
      ["Dashboard", "/dashboard/today"],
      ["Calendar", "/dashboard/calendar"],
      ["Notifications", "/dashboard/notifications"],
      ["Messages", "/dashboard/messages"],
      ["Timeline", "/dashboard/timeline"],
      ["Personal Hub", "/dashboard/settings"],
      ["Search", "/dashboard/search"],
    ]
  );
  assert.equal(beastOSNavigation.href, "/dashboard/today");
  assert.doesNotMatch(
    primaryNavigation.map((item) => item.label).join(","),
    /Goals|Documents|Digital Staff|Relationship Center/
  );
  for (const destination of [
    "Personal Information",
    "Household",
    "Family",
    "Emergency Contacts",
    "Notification Preferences",
    "Privacy",
    "Connected Modules",
    "AI Preferences",
    "Communication Preferences",
    "Future Memory Settings",
    "Theme & Display",
  ]) {
    assert.match(
      [
        settingsPage,
        readFileSync("src/lib/platform/personalHub.ts", "utf8"),
      ].join("\n"),
      new RegExp(`label: "${destination}"`)
    );
  }
  assert.match(settingsPage, /availableSections\.map/);
  assert.match(settingsPage, /plannedSections\.map/);
  assert.match(settingsPage, /id=\{section\.id\}/);
  assert.match(settingsPage, /data-personal-hub-availability="available"/);
  assert.match(settingsPage, /data-personal-hub-availability="planned"/);
  assert.match(settingsPage, /Not available yet/);
  assert.match(settingsProfilePage, /Personal Information/);
  assert.match(legacyProfilePage, /redirect\(personalInformationCanonicalRoute\)/);
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

test("BO-31 Calendar models unified source events with permissions", () => {
  const calendarPage = readFileSync("src/app/dashboard/calendar/page.tsx", "utf8");
  const event: CalendarEvent = {
    id: "money-bill-calendar",
    source: "money",
    sourceRecordId: "bill-1",
    title: "Rent due",
    summary: "BeastMoney owns the bill date.",
    startsAt: "2026-07-16T13:00:00.000Z",
    endsAt: "2026-07-16T13:30:00.000Z",
    timeZone: "America/New_York",
    permissionScope: "Owner",
    actionUrl: "/dashboard/money/cashflow",
    recurrence: "None",
    reminderMinutesBefore: [60, 15],
  };
  const normalized = buildCalendarEvent(event);

  assert.equal(normalized.source, "money");
  assert.equal(normalized.sourceRecordId, "bill-1");
  assert.equal(normalized.permissionScope, "Owner");
  assert.deepEqual(normalized.reminderMinutesBefore, [15, 60]);
  assert.equal(normalizeCalendarTimeZone("America/New_York"), "America/New_York");
  assert.throws(
    () => buildCalendarEvent({ ...event, sourceRecordId: "" }),
    /source record id/
  );
  assert.match(calendarContractRules[2], /permission scope/);
  assert.doesNotMatch(calendarPage, /calendarContractRules/);
  assert.match(calendarPage, /permissionScope/);
});

test("BO-32 Calendar builds month week day and agenda views", () => {
  const calendarPage = readFileSync("src/app/dashboard/calendar/page.tsx", "utf8");
  const events: CalendarEvent[] = [
    {
      id: "today-learning",
      source: "learning",
      sourceRecordId: "activity-1",
      title: "Guidance Counselor session",
      summary: "BeastEducation owns learning readiness.",
      startsAt: "2026-07-16T14:00:00.000Z",
      endsAt: "2026-07-16T14:30:00.000Z",
      timeZone: "America/New_York",
      permissionScope: "Owner",
      actionUrl: "/dashboard/education",
      recurrence: "None",
      reminderMinutesBefore: [10],
    },
    {
      id: "next-week-money",
      source: "money",
      sourceRecordId: "bill-2",
      title: "Review bill",
      summary: "BeastMoney owns the bill date.",
      startsAt: "2026-07-23T14:00:00.000Z",
      endsAt: "2026-07-23T14:30:00.000Z",
      timeZone: "America/New_York",
      permissionScope: "Owner",
      actionUrl: "/dashboard/money/cashflow",
      recurrence: "None",
      reminderMinutesBefore: [10],
    },
  ];
  const views = buildCalendarViews({
    events,
    today: "2026-07-16T12:00:00.000Z",
  });

  assert.deepEqual(calendarViewModes, ["Month", "Week", "Day", "Agenda"]);
  assert.equal(views.month.length, 2);
  assert.equal(views.week.length, 1);
  assert.equal(views.day.length, 1);
  assert.equal(views.agenda.length, 2);
  assert.match(calendarPage, /buildCalendarViews/);
  assert.match(calendarPage, /calendarViews\.agenda/);
});

test("BO-33 Calendar recurrence and drag rescheduling preserve source rules", () => {
  const calendarPage = readFileSync("src/app/dashboard/calendar/page.tsx", "utf8");
  const event: CalendarEvent = {
    id: "weekly-review",
    source: "learning",
    sourceRecordId: "review-1",
    title: "Weekly Guidance Counselor review",
    summary: "BeastEducation owns the review cadence.",
    startsAt: "2026-07-16T15:00:00.000Z",
    endsAt: "2026-07-16T15:30:00.000Z",
    timeZone: "America/New_York",
    permissionScope: "Owner",
    actionUrl: "/dashboard/education#weekly-review",
    recurrence: "Weekly",
    reminderMinutesBefore: [30],
  };
  const recurring = buildRecurringCalendarEvents({ event, occurrences: 3 });
  const request = buildCalendarRescheduleRequest({
    event,
    requestedAt: "2026-07-16T12:00:00.000Z",
    newStartsAt: "2026-07-17T15:00:00.000Z",
    newEndsAt: "2026-07-17T15:30:00.000Z",
    reason: "User dragged the event to tomorrow.",
  });

  assert.deepEqual(
    recurring.map((item) => item.startsAt.slice(0, 10)),
    ["2026-07-16", "2026-07-23", "2026-07-30"]
  );
  assert.equal(request.dispatchMode, "source-contract-event");
  assert.equal(request.sourceRulesPreserved, true);
  assert.equal(request.source, "learning");
  assert.match(calendarContractRules[3], /source contract event/);
  assert.match(calendarPage, /buildRecurringCalendarEvents/);
  assert.doesNotMatch(calendarPage, /buildCalendarRescheduleRequest/);
  assert.doesNotMatch(calendarPage, /dispatchMode/);
});

test("BO-34 Calendar detects conflicts reminders and time zone issues", () => {
  const calendarPage = readFileSync("src/app/dashboard/calendar/page.tsx", "utf8");
  const first: CalendarEvent = {
    id: "money-review",
    source: "money",
    sourceRecordId: "bill-1",
    title: "Money review",
    summary: "Review due bill.",
    startsAt: "2026-07-16T14:00:00.000Z",
    endsAt: "2026-07-16T15:00:00.000Z",
    timeZone: "America/New_York",
    permissionScope: "Owner",
    actionUrl: "/dashboard/money/cashflow",
    recurrence: "None",
    reminderMinutesBefore: [60, 15],
  };
  const second: CalendarEvent = {
    ...first,
    id: "learning-review",
    source: "learning",
    sourceRecordId: "activity-1",
    title: "Learning review",
    startsAt: "2026-07-16T14:30:00.000Z",
    endsAt: "2026-07-16T15:30:00.000Z",
    actionUrl: "/dashboard/education",
  };
  const conflicts = detectCalendarConflicts([first, second]);
  const reminders = buildCalendarReminders(first);

  assert.equal(conflicts.length, 1);
  assert.deepEqual(conflicts[0].eventIds, ["money-review", "learning-review"]);
  assert.equal(conflicts[0].severity, "Overlap");
  assert.deepEqual(
    reminders.map((reminder) => reminder.minutesBefore),
    [15, 60]
  );
  assert.throws(() => normalizeCalendarTimeZone("Mars/Base"), /Unsupported/);
  assert.match(calendarPage, /detectCalendarConflicts/);
  assert.match(calendarPage, /buildCalendarReminders/);
  assert.match(calendarPage, /America\/New_York/);
});

function buildSearchFixtureItems(): PlatformSearchItem[] {
  return [
    {
      id: "money-cashflow",
      source: "money",
      sourceRecordId: "cashflow-1",
      domain: "Money",
      title: "Cashflow buffer",
      summary: "Review upcoming bills and safe operating cash.",
      keywords: ["money", "bills", "cashflow", "buffer"],
      href: "/dashboard/money/cashflow",
      permissionScope: "Owner",
      updatedAt: "2026-07-17T13:00:00.000Z",
      actions: [{ type: "Open", label: "Open Cashflow", href: "/dashboard/money/cashflow" }],
    },
    {
      id: "learning-next-step",
      source: "learning",
      sourceRecordId: "mentor-step-1",
      domain: "Learning",
      title: "Next learning step",
      summary: "Resume the Guidance Counselor-guided lesson.",
      keywords: ["learning", "mentor", "lesson"],
      href: "/dashboard/education",
      permissionScope: "Owner",
      updatedAt: "2026-07-17T12:00:00.000Z",
      actions: [{ type: "Resume", label: "Resume Education", href: "/dashboard/education" }],
    },
    {
      id: "household-document",
      source: "documents",
      sourceRecordId: "document-1",
      domain: "Documents",
      title: "Shared household document",
      summary: "A household-visible uploaded document.",
      keywords: ["document", "uploaded", "household"],
      href: "/dashboard/uploads",
      permissionScope: "Household",
      updatedAt: "2026-07-17T11:00:00.000Z",
      actions: [{ type: "Open", label: "Open Uploads", href: "/dashboard/uploads" }],
    },
  ];
}

test("BO-35 Search builds a universal index across platform and module records", () => {
  const searchPage = [
    readFileSync("src/app/dashboard/search/page.tsx", "utf8"),
    readFileSync(
      "src/app/dashboard/search/UnifiedSearchWorkspace.tsx",
      "utf8"
    ),
  ].join("\n");
  const index = buildUniversalSearchIndex(buildSearchFixtureItems());
  const moneyResult = searchPlatformIndex({
    items: index,
    query: "upcoming bills",
    allowedPermissionScopes: ["Owner"],
  });

  assert.equal(index.length, 3);
  assert.equal(index[0].id, "money-cashflow");
  assert.equal(moneyResult[0].source, "money");
  assert.equal(moneyResult[0].sourceRecordId, "cashflow-1");
  assert.match(searchContractRules[0], /indexing/);
  assert.match(searchPage, /buildUniversalSearchIndex/);
  assert.match(searchPage, /buildUnifiedSearchItems/);
});

test("BO-36 Search respects permissions filters recent and saved searches", () => {
  const searchPage = [
    readFileSync("src/app/dashboard/search/page.tsx", "utf8"),
    readFileSync(
      "src/app/dashboard/search/UnifiedSearchWorkspace.tsx",
      "utf8"
    ),
  ].join("\n");
  const index = buildUniversalSearchIndex(buildSearchFixtureItems());
  const ownerResults = searchPlatformIndex({
    items: index,
    query: "",
    allowedPermissionScopes: ["Owner"],
  });
  const householdResults = searchPlatformIndex({
    items: index,
    query: "document",
    allowedPermissionScopes: ["Owner", "Household"],
    filters: { domain: "Documents" },
  });
  const recent = buildRecentSearches(["cashflow", "Cashflow", "learning"], 5);
  const saved = buildSavedSearch({
    id: "saved-money",
    label: "Money alerts",
    query: "money alerts",
    filters: { module: "money" },
  });

  assert.equal(ownerResults.some((result) => result.permissionScope === "Household"), false);
  assert.equal(householdResults[0].id, "household-document");
  assert.deepEqual(recent, ["cashflow", "learning"]);
  assert.equal(saved.filters.module, "money");
  assert.match(searchPage, /buildRecentSearches/);
  assert.match(searchPage, /allowedPermissionScopes/);
});

test("BO-37 Search interprets natural language and routes actions safely", () => {
  const searchWorkspace = readFileSync(
    "src/app/dashboard/search/UnifiedSearchWorkspace.tsx",
    "utf8"
  );
  const item = buildPlatformSearchItem(buildSearchFixtureItems()[0]);
  const intent = interpretNaturalLanguageSearch("Show all Money alerts");
  const request = buildSearchActionRequest({ item, actionType: "Open" });

  assert.equal(intent.suggestedFilters.module, "money");
  assert.match(intent.interpretedQuery, /money alerts/);
  assert.equal(request.dispatchMode, "route-or-source-contract");
  assert.equal(request.sourceOwnershipPreserved, true);
  assert.equal(request.source, "money");
  assert.match(searchContractRules[3], /mutating module-owned records/);
  assert.match(searchWorkspace, /buildSearchActionRequest/);
});

function buildTimelineFixtureItems(): PlatformTimelineItem[] {
  return [
    {
      id: "money-reviewed",
      source: "money",
      sourceRecordId: "cashflow-1",
      kind: "Reviewed",
      title: "Cashflow reviewed",
      summary: "Money contributed a meaningful cashflow review.",
      occurredAt: "2026-07-17T13:00:00.000Z",
      visibility: "Owner",
      href: "/dashboard/money/cashflow",
      meaningful: true,
      details: [{ label: "Record", value: "cashflow-1" }],
    },
    {
      id: "learning-scheduled",
      source: "learning",
      sourceRecordId: "mentor-step-1",
      kind: "Scheduled",
      title: "Guidance Counselor step scheduled",
      summary: "Learning contributed the next Guidance Counselor step.",
      occurredAt: "2026-07-16T13:00:00.000Z",
      visibility: "Owner",
      href: "/dashboard/education",
      meaningful: true,
      details: [{ label: "Record", value: "mentor-step-1" }],
    },
    {
      id: "system-refresh",
      source: "beastos",
      sourceRecordId: "refresh-1",
      kind: "Updated",
      title: "Background refresh",
      summary: "Internal system churn.",
      occurredAt: "2026-07-17T12:00:00.000Z",
      visibility: "Owner",
      href: "/dashboard/timeline",
      meaningful: false,
      details: [{ label: "Internal", value: "Refresh" }],
    },
  ];
}

test("BO-38 Timeline models meaningful cross-module activity only", () => {
  const timelinePage = readFileSync("src/app/dashboard/timeline/page.tsx", "utf8");
  const stream = buildTimelineStream({
    items: buildTimelineFixtureItems(),
    allowedVisibility: ["Owner"],
  });
  const summary = summarizeTimeline(buildTimelineFixtureItems());

  assert.equal(stream.length, 2);
  assert.equal(stream.some((item) => item.id === "system-refresh"), false);
  assert.equal(stream[0].source, "money");
  assert.deepEqual(summary.sources, ["learning", "money"]);
  assert.match(timelineContractRules[0], /cross-module activity display/);
  assert.match(timelinePage, /buildTimelineStream/);
  assert.match(timelinePage, /meaningful/);
});

test("BO-39 Timeline supports filters date grouping and item details", () => {
  const timelinePage = readFileSync("src/app/dashboard/timeline/page.tsx", "utf8");
  const items = buildTimelineFixtureItems();
  const filtered = buildTimelineStream({
    items,
    filters: { source: "learning" },
    allowedVisibility: ["Owner"],
  });
  const groups = groupTimelineByDate(buildTimelineStream({ items }));
  const detail = buildTimelineDetail(buildTimelineItem(items[0]));

  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].sourceRecordId, "mentor-step-1");
  assert.equal(groups.length, 2);
  assert.equal(detail.sourceOwnershipPreserved, true);
  assert.equal(detail.details[0].value, "cashflow-1");
  assert.match(timelinePage, /groupTimelineByDate/);
  assert.match(timelinePage, /getProfessionalActivityFilter/);
  assert.match(timelinePage, /professionalActivityFilters/);
});

function buildNotificationFixtureItems(): PlatformNotificationItem[] {
  return [
    {
      id: "money-buffer",
      source: "money",
      sourceRecordId: "cashflow-alert-1",
      title: "Cashflow buffer needs review",
      summary: "Money contributed a warning.",
      priority: "High",
      severity: "warning",
      state: "Unread",
      createdAt: "2026-07-17T13:00:00.000Z",
      actionUrl: "/dashboard/money/cashflow",
      actions: [
        { type: "Open", label: "Open", href: "/dashboard/money/cashflow" },
        { type: "Dismiss", label: "Dismiss" },
      ],
    },
    {
      id: "learning-ready",
      source: "learning",
      sourceRecordId: "mentor-step-1",
      title: "Learning step ready",
      summary: "Learning contributed an info notification.",
      priority: "Medium",
      severity: "info",
      state: "Unread",
      createdAt: "2026-07-17T12:00:00.000Z",
      actionUrl: "/dashboard/education",
      actions: [{ type: "Complete", label: "Complete from source" }],
    },
    {
      id: "dismissed-platform",
      source: "beastos",
      sourceRecordId: "platform-info",
      title: "Dismissed info",
      summary: "Already dismissed.",
      priority: "Low",
      severity: "info",
      state: "Dismissed",
      createdAt: "2026-07-17T11:00:00.000Z",
      actionUrl: "/dashboard",
      actions: [{ type: "Open", label: "Open" }],
    },
  ];
}

test("BO-40 Notifications centralize source priority severity and state", () => {
  const notificationsPage = readFileSync("src/app/dashboard/notifications/page.tsx", "utf8");
  const inbox = buildNotificationInbox({
    items: buildNotificationFixtureItems(),
    preferences: { enabled: true, digestFrequency: "Daily", mutedSources: [] },
  });
  const grouped = groupNotificationsBySeverity(inbox);

  assert.equal(inbox.length, 2);
  assert.equal(inbox[0].source, "money");
  assert.equal(grouped.warning[0].sourceRecordId, "cashflow-alert-1");
  assert.equal(grouped.info[0].source, "learning");
  assert.match(notificationContractRules[0], /shared inbox/);
  assert.match(notificationsPage, /buildNotificationInbox/);
  assert.match(notificationsPage, /sourceRecordId/);
});

test("BO-41 Notifications route actions preferences and digests safely", () => {
  const notificationsPage = readFileSync("src/app/dashboard/notifications/page.tsx", "utf8");
  const item = buildNotificationItem(buildNotificationFixtureItems()[0]);
  const request = buildNotificationActionRequest({ item, actionType: "Dismiss" });
  const mutedInbox = buildNotificationInbox({
    items: buildNotificationFixtureItems(),
    preferences: { enabled: true, digestFrequency: "Daily", mutedSources: ["money"] },
  });
  const digest = buildNotificationDigest({
    items: buildNotificationFixtureItems(),
    preferences: { enabled: true, digestFrequency: "Daily", mutedSources: [] },
  });

  assert.equal(request.dispatchMode, "source-contract-event");
  assert.equal(request.sourceOwnershipPreserved, true);
  assert.equal(request.source, "money");
  assert.equal(mutedInbox.some((notification) => notification.source === "money"), false);
  assert.equal(digest.enabled, true);
  assert.deepEqual(digest.sources, ["learning", "money"]);
  assert.match(notificationContractRules[3], /source contract events/);
  assert.doesNotMatch(notificationsPage, /buildNotificationActionRequest/);
  assert.match(notificationsPage, /buildNotificationDigest/);
});

function buildSharedAIContextFixtureItems(): SharedAIContextItem[] {
  return [
    {
      id: "owner-preferences",
      kind: "User",
      source: "beastos",
      sourceRecordId: "profile-context",
      summary: "Owner preference context for platform-level assistance.",
      permission: "Allowed",
      retention: "Exportable",
    },
    {
      id: "money-cashflow",
      kind: "Module",
      source: "money",
      sourceRecordId: "cashflow-summary",
      summary: "Money can summarize cashflow while calculations stay with BeastMoney.",
      permission: "Allowed",
      retention: "Session",
    },
    {
      id: "private-document",
      kind: "Document",
      source: "documents",
      sourceRecordId: "restricted-upload",
      summary: "Restricted upload context should not be used by Shared AI.",
      permission: "Restricted",
      retention: "Session",
    },
  ];
}

test("BO-42 Shared AI assembles permissioned context without exposing contracts in Personal Hub", () => {
  const settingsPage = readFileSync("src/app/dashboard/settings/page.tsx", "utf8");
  const allowed = buildSharedAIContext(buildSharedAIContextFixtureItems());

  assert.deepEqual(
    allowed.map((item) => item.id),
    ["owner-preferences", "money-cashflow"]
  );
  assert.equal(allowed[1].source, "money");
  assert.equal(allowed[1].sourceRecordId, "cashflow-summary");
  assert.match(sharedAIContractRules[0], /permissioned context assembly/);
  assert.doesNotMatch(settingsPage, /buildSharedAIContext/);
  assert.doesNotMatch(settingsPage, /sharedAIContractRules/);
  assert.match(settingsPage, /Planned Personal Hub settings/);
});

test("BO-43 Shared AI frames recommendations from context metadata", () => {
  const recommendation = buildSharedAIRecommendation({
    id: "next-step",
    title: "Review the next useful step",
    context: buildSharedAIContextFixtureItems(),
    ownerModule: "beastos",
  });

  assert.equal(recommendation.ownerModule, "beastos");
  assert.deepEqual(recommendation.sourceContextIds, ["owner-preferences", "money-cashflow"]);
  assert.equal(recommendation.assumptions.some((item) => item.includes("restricted")), false);
  assert.match(recommendation.explanation, /leaves module logic with the source owner/);
  assert.match(sharedAIContractRules[1], /business actions/);
});

test("BO-44 Shared AI memory boundaries expose correction export and deletion controls", () => {
  const settingsPage = readFileSync("src/app/dashboard/settings/page.tsx", "utf8");
  const boundary = buildSharedAIMemoryBoundary({
    context: buildSharedAIContextFixtureItems(),
    retentionDays: -5,
  });

  assert.equal(boundary.correctionsAllowed, true);
  assert.equal(boundary.exportAllowed, true);
  assert.equal(boundary.deletionAllowed, true);
  assert.equal(boundary.retentionDays, 0);
  assert.deepEqual(boundary.restrictedContextIds, ["private-document"]);
  assert.match(sharedAIContractRules[2], /retention/);
  assert.doesNotMatch(settingsPage, /buildSharedAIMemoryBoundary/);
  assert.match(settingsPage, /plannedSections/);
});

test("BO-45 Shared AI routes specialist handoffs while preserving ownership", () => {
  const settingsPage = readFileSync("src/app/dashboard/settings/page.tsx", "utf8");
  const moneyHandoff = buildSharedAISpecialistHandoff({
    request: "Help me understand this money bill",
  });
  const tutorHandoff = buildSharedAISpecialistHandoff({
    request: "Ask the tutor to explain this lesson",
  });

  assert.equal(moneyHandoff.targetModule, "money");
  assert.equal(moneyHandoff.specialist, "BeastMoney");
  assert.equal(tutorHandoff.targetModule, "learning");
  assert.equal(tutorHandoff.specialist, "BeastEducation Tutor");
  assert.equal(moneyHandoff.dispatchMode, "specialist-handoff");
  assert.equal(moneyHandoff.sourceOwnershipPreserved, true);
  assert.match(sharedAIContractRules[3], /Specialist handoffs/);
  assert.doesNotMatch(settingsPage, /buildSharedAISpecialistHandoff/);
  assert.match(settingsPage, /plannedSections/);
});

test("BO-48 Platform UX tracks responsive accessible core services", () => {
  const settingsPage = readFileSync("src/app/dashboard/settings/page.tsx", "utf8");
  const readiness = buildPlatformUXReadiness(platformUXCoreRoutes);

  assert.equal(readiness.totalServices, 8);
  assert.equal(readiness.mobileReadyServices, 8);
  assert.equal(readiness.keyboardReadyServices, 8);
  assert.equal(readiness.responsive, true);
  assert.equal(readiness.accessible, true);
  assert.deepEqual(
    platformUXCoreRoutes.map((route) => route.href),
    [
      "/dashboard/today",
      "/dashboard/calendar",
      "/dashboard/timeline",
      "/dashboard/notifications",
      "/dashboard/search",
      "/dashboard/settings",
      "/dashboard/uploads",
      "/dashboard/goals",
    ]
  );
  assert.match(platformUXRules[1], /mobile and desktop/);
  assert.doesNotMatch(settingsPage, /buildPlatformUXReadiness/);
  assert.match(settingsPage, /sm:grid-cols-2 xl:grid-cols-3/);
});

test("BO-49 Platform UX standardizes useful service fallback states", () => {
  const settingsPage = readFileSync("src/app/dashboard/settings/page.tsx", "utf8");
  const stateKinds: PlatformUXStateKind[] = [
    "Loading",
    "Empty",
    "Error",
    "Offline",
    "Degraded",
  ];
  const states = stateKinds.map((kind) => buildPlatformUXState(kind));

  assert.deepEqual(
    states.map((state) => state.kind),
    ["Loading", "Empty", "Error", "Offline", "Degraded"]
  );
  states.forEach((state) => {
    assert.equal(state.message.length > 20, true);
    assert.equal(state.recoveryAction.length > 20, true);
  });
  assert.match(platformUXRules[2], /what the user can do next/);
  assert.doesNotMatch(settingsPage, /buildPlatformUXState/);
  assert.doesNotMatch(settingsPage, /Degraded state/);
});

test("BO-50 Platform UX exposes onboarding help feedback and release notes", () => {
  const settingsPage = readFileSync("src/app/dashboard/settings/page.tsx", "utf8");
  const releasesPage = readFileSync("src/app/dashboard/releases/page.tsx", "utf8");
  const supportLinks = getPlatformSupportLinks();

  assert.deepEqual(
    supportLinks.map((link) => link.id),
    ["onboarding", "help", "feedback", "release-notes"]
  );
  assert.equal(supportLinks.find((link) => link.id === "release-notes")?.href, "/dashboard/releases");
  assert.match(platformUXRules[3], /Onboarding help feedback and release notes/);
  assert.doesNotMatch(settingsPage, /getPlatformSupportLinks/);
  assert.match(releasesPage, /BeastOS v2\.2 Shared Services Progress/);
  assert.match(releasesPage, /loading, empty, error, offline, and degraded/);
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
        summary.href === "/dashboard/education"
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
      "mentor-planning",
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

test("mentor roadmap uses static goal-type rules", () => {
  const roadmap = buildGuidanceCounselorRoadmap({
    goalType: "Certification",
    futureGoal: "Security+",
  });

  assert.equal(roadmap.title, "Certification: Security+");
  assert.equal(roadmap.previewLabel, "Planning Guidance Counselor");
  assert.equal(roadmap.estimatedTimeline, "6-10 week prep plan");
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
  assert.equal(roadmap.assumptions.length >= 2, true);
  assert.equal(
    roadmap.planningBoundaries.some((boundary) =>
      boundary.includes("not official school counsel…28997 tokens truncated…stic.lesson.guidedPractice.map((step) => [step.prompt, step.hint].join(" ")),
    ...generatedRecord.lesson.reflectionPrompts,
  ].join("\n");

  [
    /AI generated/i,
    /generated lesson/i,
    /generated course/i,
    /What does this lesson prove/i,
    /Which idea are we practicing/i,
    /Something unrelated/i,
    /A progress chart/i,
    /Learning pieces/i,
    /lesson payload/i,
    /curriculum implementation/i,
  ].forEach((pattern) => {
    assert.doesNotMatch(dynamicLessonText, pattern);
  });

  const lessonEngine = readFileSync("src/lib/learning/lessonEngine.ts", "utf8");
  assert.match(lessonEngine, /generateDynamicLearningLesson/);
  assert.match(lessonEngine, /learningDifficultyFromActivity/);
  assert.match(lessonEngine, /mode: learnerLevel === "Advanced" \? "challenge" : "lesson"/);
});

test("teaching intelligence keeps learner-facing diagnostics subject-first", () => {
  const mathRecord = createGeneratedLearningContentRecord("7th Grade Math");
  const techRecord = createGeneratedLearningContentRecord("Network+");
  const learnerFacingText = [
    mathRecord.activityTitle,
    mathRecord.emptyStateLabel,
    mathRecord.courseTitle,
    mathRecord.lesson.title,
    mathRecord.lesson.learningObjective,
    mathRecord.lesson.explanation,
    ...mathRecord.lesson.prerequisiteConcepts,
    ...mathRecord.lesson.quizQuestions.map((question) =>
      [
        question.prompt,
        question.answer,
        question.explanation,
        ...question.options,
      ].join(" ")
    ),
    ...mathRecord.placementQuestions.map((question) => question.prompt),
    ...techRecord.placementQuestions.map((question) => question.prompt),
    readFileSync("src/lib/learning/mentorHome.ts", "utf8"),
    readFileSync("src/lib/learning/guidedSession.ts", "utf8"),
    readFileSync("src/app/dashboard/learning/LearningGoalBuilder.tsx", "utf8"),
    readFileSync("src/app/dashboard/learning/LegacyLearningDashboard.tsx", "utf8"),
  ].join("\n");

  [
    /generated lesson/i,
    /generated course/i,
    /curriculum mapping/i,
    /mastery signal/i,
    /recommendation generated/i,
    /prerequisite check/i,
    /lesson payload/i,
    /starter lesson/i,
    /confidence signal/i,
    /allowed to prove/i,
    /dashboard metric/i,
    /objective ID/i,
  ].forEach((pattern) => {
    assert.doesNotMatch(learnerFacingText, pattern);
  });
  assert.equal(mathRecord.activityTitle, "7th Grade Math: First Practice");
  assert.equal(mathRecord.placementQuestions[0].prompt, "Solve: 8 + 7.");
  assert.equal(
    mathRecord.placementQuestions.some((question) => question.prompt.includes("x + 3 = 10")),
    true
  );
  assert.equal(
    techRecord.placementQuestions.some((question) => question.prompt.includes("computer network")),
    true
  );
  assert.match(mathRecord.lesson.explanation, /guided practice question/);
});

test("curriculum authority separates teachable objectives from AI teaching behavior", () => {
  const teachableCourseIds = [
    ...sampleLearningContentRecords.map((record) => record.courseId),
    ...builtLearningCourses.map((course) => course.id),
  ];
  const generatedBiology = createGeneratedLearningContentRecord("Biology");
  const generatedProvenance = buildGeneratedContentProvenance({
    contentId: generatedBiology.lesson.id,
    courseId: generatedBiology.courseId,
    reviewStatus: generatedBiology.lesson.contentMetadata.reviewStatus,
  });

  assert.equal(curriculumAuthoritySources.length >= 11, true);
  assert.equal(curriculumAuthorityObjectives.length >= 16, true);
  assert.deepEqual(
    [
      "state_standard",
      "common_core",
      "college_curriculum",
      "open_educational_resource",
      "internal_proving_ground",
    ].every((authorityType) =>
      curriculumAuthoritySources.some((source) => source.authorityType === authorityType)
    ),
    true
  );
  assert.deepEqual(
    curriculumAuthorityDomains
      .filter((domain) => domain.authoritySourceId === "comptia-security-plus-sy0-701")
      .map((domain) => [domain.domainCode, domain.weightPercent]),
    [
      ["1.0", 12],
      ["2.0", 22],
      ["3.0", 18],
      ["4.0", 28],
      ["5.0", 20],
    ]
  );
  assert.deepEqual(curriculumLifecycleOrder, [
    "Draft",
    "Generated",
    "Reviewed",
    "Authority Mapped",
    "Approved",
    "Published",
    "Retired",
  ]);
  assert.equal(
    courseAuthorityMappings.every(
      (mapping) =>
        mapping.authorityType &&
        mapping.publisher &&
        mapping.version &&
        mapping.effectiveDate &&
        mapping.canonicalSource &&
        mapping.objectiveIds.length > 0 &&
        mapping.coverage.percent > 0
    ),
    true
  );
  assert.deepEqual(getCourseAuthorityGaps(teachableCourseIds), [
    { courseId: "pre-algebra-foundations-course", issue: "not_production_teachable" },
    { courseId: "algebra-expansion-course", issue: "not_production_teachable" },
    { courseId: "cybersecurity-certification-prep-course", issue: "not_production_teachable" },
    { courseId: "spanish-greeting-course", issue: "not_production_teachable" },
    { courseId: "college-algebra-course", issue: "not_production_teachable" },
  ]);
  assert.equal(
    teachableCourseIds.every((courseId) => Boolean(getCourseAuthorityMapping(courseId))),
    true
  );
  const securityPlusMapping = getCourseAuthorityMapping("security-plus-foundations-course");
  assert.equal(securityPlusMapping?.authoritySourceId, "comptia-security-plus-sy0-701");
  assert.equal(securityPlusMapping?.version, "SY0-701 / V7");
  assert.equal(securityPlusMapping?.coverage.mappedObjectiveCount, 4);
  assert.equal(securityPlusMapping?.coverage.totalObjectiveCount, 28);
  assert.equal(securityPlusMapping?.coverage.status, "partial");
  assert.deepEqual(securityPlusMapping?.objectiveIds, [
    "security-plus-3-2-secure-infrastructure",
    "security-plus-4-6-iam",
    "security-plus-4-8-incident-response",
    "security-plus-4-9-investigation-data",
  ]);
  assert.equal(courseCanBeProductionTeachable("security-plus-foundations-course"), true);
  assert.equal(courseCanBeProductionTeachable("pre-algebra-foundations-course"), false);
  assert.deepEqual(
    getLessonObjectiveAlignment("identity-verification-lesson"),
    {
      id: "alignment-identity-verification",
      lessonId: "identity-verification-lesson",
      courseId: "security-plus-foundations-course",
      objectiveIds: ["security-plus-4-6-iam"],
      whyItExists:
        "Learners need identity and access vocabulary before the Tutor asks them to reason about permissions, roles, or access evidence.",
      prerequisiteObjectiveIds: [],
      prerequisiteSummary: "No prior Security+ objective is required.",
      knowledgeCheckIds: ["objective-identity-proofing", "objective-auth-factors"],
      progressWeightPercent: 35,
      coveragePercent: 25,
      productionAligned: true,
    }
  );
  assert.deepEqual(
    getLessonObjectiveAlignment("rbac-lesson")?.objectiveIds,
    [
      "security-plus-3-2-secure-infrastructure",
      "security-plus-4-6-iam",
      "security-plus-4-8-incident-response",
      "security-plus-4-9-investigation-data",
    ]
  );
  assert.equal(courseCanBeProductionTeachable("generated-biology-course"), false);
  assert.equal(tutorCanTeachCourseByDefault("security-plus-foundations-course"), false);
  assert.equal(tutorCanTeachCourseByDefault("pre-algebra-foundations-course"), false);
  assert.deepEqual(
    resolveTutorCurriculumAccess({ courseId: "pre-algebra-foundations-course" }),
    {
      courseId: "pre-algebra-foundations-course",
      lifecycleState: "Authority Mapped",
      defaultAllowed: false,
      adminOverrideAllowed: false,
      canTeach: false,
      reason: "Tutor default teaching requires Published curriculum.",
    }
  );
  assert.deepEqual(
    resolveTutorCurriculumAccess({
      courseId: "pre-algebra-foundations-course",
      adminOverride: true,
    }),
    {
      courseId: "pre-algebra-foundations-course",
      lifecycleState: "Authority Mapped",
      defaultAllowed: false,
      adminOverrideAllowed: true,
      canTeach: true,
      reason: "Admin testing override allows this non-published curriculum.",
    }
  );
  assert.deepEqual(createGeneratedCurriculumLifecycleRecord({
    courseId: generatedBiology.courseId,
  }).state, "Generated");
  assert.equal(generatedProvenance.authorityMappingId, undefined);
  assert.equal(generatedProvenance.productionEligible, false);
  assert.equal(generatedContentCanBecomeProductionCurriculum(generatedProvenance), false);
  assert.equal(
    getObjectivesForCourse("pre-algebra-foundations-course").some(
      (objective) => objective.id === "objective-combine-like-terms"
    ),
    true
  );
  assert.deepEqual(
    getLessonObjectiveAlignment("pre-algebra-combining-like-terms")?.objectiveIds,
    [
      "state-math-expression-equivalence",
      "common-core-6-ee-a-3",
      "common-core-6-ee-a-4",
      "openstax-prealgebra-expressions",
      "objective-identify-like-terms",
      "objective-combine-like-terms",
    ]
  );
  assert.deepEqual(
    getAuthorityTypesForCourse("pre-algebra-foundations-course"),
    [
      "state_standard",
      "common_core",
      "open_educational_resource",
      "fixture",
    ]
  );
  assert.deepEqual(
    getAuthorityTypesForCourse("algebra-expansion-course"),
    ["college_curriculum", "fixture"]
  );
  assert.deepEqual(
    getAuthorityTypesForCourse("spanish-greeting-course"),
    ["internal_proving_ground", "fixture"]
  );
  assert.equal(
    lessonObjectiveAlignments.every(
      (alignment) =>
        alignment.objectiveIds.length > 0 &&
        alignment.whyItExists.length > 20 &&
        Array.isArray(alignment.prerequisiteObjectiveIds) &&
        alignment.prerequisiteSummary.length > 10
    ),
    true
  );
  assert.equal(
    lessonObjectiveAlignments
      .filter((alignment) => alignment.courseId === "security-plus-foundations-course")
      .every((alignment) => alignment.productionAligned === true),
    true
  );
  assert.equal(
    lessonObjectiveAlignments
      .filter((alignment) => alignment.courseId !== "security-plus-foundations-course")
      .every((alignment) => alignment.productionAligned === false),
    true
  );
});

test("mentor curriculum intelligence translates objective state into learner language", () => {
  const intelligence = buildMentorCurriculumIntelligence({
    courseId: "security-plus-foundations-course",
    demonstratedObjectiveIds: ["security-plus-4-6-iam"],
    demonstratedObjectiveCount: 23,
    targetDomainCode: "4.0",
    reviewObjectiveIds: ["security-plus-4-8-incident-response"],
  });

  assert.equal(intelligence.officialCoveragePercent, 82);
  assert.equal(intelligence.completedObjectiveCount, 23);
  assert.equal(intelligence.totalObjectiveCount, 28);
  assert.equal(
    intelligence.coverageMessage,
    "You've completed 82% of the official CompTIA Security+ objectives."
  );
  assert.equal(
    intelligence.skippedLessonMessages.some((message) =>
      message.includes("because you've already demonstrated")
    ),
    true
  );
  assert.equal(
    intelligence.readinessMessages.some((message) =>
      message.includes("Before we move into Security operations")
    ),
    true
  );
  assert.equal(
    intelligence.reviewMessages[0],
    "I recommend reviewing Use incident-response activities appropriately before taking the final assessment."
  );
  assert.equal(
    [
      ...intelligence.skippedLessonMessages,
      ...intelligence.readinessMessages,
      ...intelligence.reviewMessages,
      intelligence.coverageMessage,
    ].some((message) => /SY0-701|security-plus-/.test(message)),
    false
  );

  const explicitIds = buildMentorCurriculumIntelligence({
    courseId: "security-plus-foundations-course",
    demonstratedObjectiveIds: [],
    targetDomainCode: "4.0",
    reviewObjectiveIds: ["security-plus-4-8-incident-response"],
    includeObjectiveIds: true,
  });

  assert.equal(
    explicitIds.reviewMessages[0].includes("SY0-701-4.8"),
    true
  );
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

test("learning standards careers and certifications expose catalog alignments", () => {
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

test("certification intelligence weights objectives and targets weak exam domains", () => {
  const intelligence = buildCertificationIntelligence({
    certificationId: "comptia-security-plus",
    courseId: "security-plus-foundations-course",
    objectiveEvidence: [
      {
        objectiveId: "security-plus-3-2-secure-infrastructure",
        masteryPercent: 90,
        confidencePercent: 86,
        lastPracticeScorePercent: 92,
      },
      {
        objectiveId: "security-plus-4-6-iam",
        masteryPercent: 84,
        confidencePercent: 78,
        lastPracticeScorePercent: 80,
      },
      {
        objectiveId: "security-plus-4-8-incident-response",
        masteryPercent: 52,
        confidencePercent: 48,
        lastPracticeScorePercent: 58,
      },
      {
        objectiveId: "security-plus-4-9-investigation-data",
        masteryPercent: 70,
        confidencePercent: 64,
        lastPracticeScorePercent: 68,
      },
    ],
  });
  const operations = intelligence.domainReadiness.find(
    (domain) => domain.domainCode === "4.0"
  );

  assert.equal(intelligence.certificationTitle, "Security+");
  assert.equal(intelligence.authorityCoveragePercent, 14);
  assert.equal(intelligence.examReady, false);
  assert.equal(intelligence.readinessLabel, "not-ready");
  assert.equal(operations?.weightPercent, 28);
  assert.equal(operations?.weak, true);
  assert.equal(
    intelligence.weakDomains.some((domain) => domain.domainCode === "1.0"),
    true
  );
  assert.equal(
    intelligence.targetedReview.some((review) =>
      review.includes("Security operations")
    ),
    true
  );
  assert.equal(intelligence.adaptivePracticeExam.timed, true);
  assert.equal(
    intelligence.adaptivePracticeExam.sections.some(
      (section) =>
        section.domainId === "security-plus-domain-4" &&
        section.questionCount === 14 &&
        section.targetObjectiveIds.includes("security-plus-4-8-incident-response")
    ),
    true
  );
  assert.match(intelligence.mentorSummary, /not exam-ready/);
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
  assert.equal(dashboard.curriculumAuthority.length, curriculumAuthoritySources.length);
  assert.equal(dashboard.courseAuthorityMappings.length, courseAuthorityMappings.length);
  assert.equal(dashboard.lessonObjectiveAlignments.length, lessonObjectiveAlignments.length);
  assert.equal(dashboard.courseCurriculumLifecycle.length, courseCurriculumLifecycleRecords.length);
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
      "Career Path Specialist",
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
  assert.equal(homeworkPolicy.safetyBoundaries.length > 0, true);
  assert.equal(homeworkPolicy.disallowedClaims.includes("Full curriculum coverage"), true);
  assert.equal(answerPolicy.policyName, "Answer Check After Reasoning");
  assert.equal(buildHomeworkPrompt(homeworkPolicy).includes("Disallowed claims"), true);
  assert.equal(session.completed, false);
  assert.equal(session.conversationId.includes("homework-coach"), true);
});

test("BeastEducation v1.1 private beta readiness protects Personal Hub boundaries", () => {
  const readiness = buildBeastEducationPrivateBetaReadiness();

  assert.equal(readiness.version, "v1.1 Private Beta");
  assert.equal(
    readiness.capabilitiesVerified.some((capability) =>
      capability.includes("Lesson runner supports assessment")
    ),
    true
  );
  assert.equal(
    readiness.personalHubReferences.every(
      (reference) =>
        reference.moduleAccess === "permissioned_reference" &&
        reference.duplicateStorageAllowed === false
    ),
    true
  );
  assert.equal(
    readiness.guardianBoundaries.some(
      (boundary) => boundary.id === "consent-required" && boundary.required
    ),
    true
  );
  assert.equal(readiness.accessPolicy.essentialLearnerAccess, "free");
  assert.equal(readiness.accessPolicy.proBoundaryStatus, "requires_decision");
  assert.equal(readiness.seangworldPublishingGuardrails.includes("Do not claim school compliance."), true);
  assert.equal(readiness.excludedClaims.includes("Teacher portal"), true);
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
  assert.equal(readiness.badges.some((badge) => badge.label === "Early Access"), true);
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
  assert.equal(privateBeta.persistenceStatus, "limited");
  assert.equal(privateBeta.feedback[0].status, "Reviewing");
});

test("learning path identity panel does not render internal persistence status", () => {
  const privateBetaPanel = readFileSync(
    "src/app/dashboard/learning/PrivateBetaPanels.tsx",
    "utf8"
  );

  assert.doesNotMatch(privateBetaPanel, /label=\{beta\.persistenceStatus\}/);
  assert.match(privateBetaPanel, /title="Learner identity"/);
  assert.match(privateBetaPanel, /label="Learner Record"/);
  assert.doesNotMatch(privateBetaPanel, /Beta identity/i);
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
    context: "BeastEducation feedback",
  });
  const item = mapFeedbackRow({
    id: "feedback-1",
    category: "feature request",
    message: "Add calmer onboarding.",
    context: "BeastEducation feedback",
    status: "New",
    created_at: "2026-07-04T00:00:00.000Z",
  });

  assert.equal(learningTableNames.profiles, "learning_profiles");
  assert.equal(learningTableNames.feedback, "learning_feedback");
  assert.deepEqual(payload, {
    user_id: "user-1",
    category: "feature request",
    message: "Add calmer onboarding.",
    context: "BeastEducation feedback",
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
    selected_debt_id: null,
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

test("current member experience keeps approved planning features open", () => {
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
    true
  );
  assert.equal(hasEntitlement({ role: "admin" }, "beast_advisor"), true);
  assert.equal(hasEntitlement({ role: "beta" }, "scenario_planning"), true);
});

test("admin view mode changes effective entitlements without changing real context", () => {
  assert.deepEqual([...ADMIN_VIEW_MODES], ["admin", "member"]);

  const adminProfile = { role: "admin", membership: DEFAULT_FREE_MEMBERSHIP };

  assert.deepEqual(resolveEntitlementContext(adminProfile), {
    plan: "pro",
    role: "admin",
  });
  assert.deepEqual(resolveEffectiveEntitlementContext(adminProfile, "admin"), {
    plan: "pro",
    role: "admin",
  });
  assert.deepEqual(resolveEffectiveEntitlementContext(adminProfile, "member"), {
    plan: "free",
    role: "user",
  });
  assert.equal(isAdminViewSimulationActive(adminProfile, "member"), true);
  assert.equal(isAdminViewSimulationActive(adminProfile, "admin"), false);
  assert.equal(hasEntitlement(resolveEffectiveEntitlementContext(adminProfile, "admin"), "beast_admin"), true);
  assert.equal(hasEntitlement(resolveEffectiveEntitlementContext(adminProfile, "member"), "beast_admin"), false);
  assert.equal(canAccessBeastAdmin({ role: "admin", adminViewMode: "admin" }), true);
  assert.equal(canAccessBeastAdmin({ role: "admin", adminViewMode: "member" }), false);

  const entitlementHook = readFileSync("src/lib/hooks/useEntitlements.ts", "utf8");
  assert.match(entitlementHook, /window\.localStorage\.setItem\(ADMIN_VIEW_MODE_STORAGE_KEY, normalizedMode\)/);
  assert.match(entitlementHook, /window\.location\.reload\(\)/);
  assert.ok(
    entitlementHook.indexOf("window.localStorage.setItem") <
      entitlementHook.indexOf("window.location.reload()")
  );
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

  assert.deepEqual(resolveEffectiveEntitlementContext(adminProfile, "member"), {
    plan: "free",
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

  assert.deepEqual(resolveEffectiveEntitlementContext(proUser, "member"), {
    plan: "pro",
    role: "user",
  });
  assert.equal(isAdminViewSimulationActive(proUser, "member"), false);
  assert.equal(hasEntitlement({ role: "user", membership: proMembership }, "beast_admin"), false);
  assert.equal(hasEntitlement({ role: "beta" }, "beast_admin"), false);
  assert.equal(canAccessBeastAdmin({ role: "user", adminViewMode: "admin" }), false);
  assert.equal(canAccessBeastAdmin({ role: "beta", adminViewMode: "admin" }), false);
});

test("member navigation hides admin and monetization surfaces", () => {
  assert.deepEqual(
    memberBeastEducationNavigation.children?.map((item) => item.label),
    [
      "Dashboard",
      "Guidance Counselor",
      "About You",
      "Education Planning",
      "Career Planning",
      "Education Goals",
      "Schools",
      "Certifications",
      "Scholarships",
      "Education Documents",
      "Progress & Decisions",
    ]
  );
  assert.deepEqual(
    memberBeastEducationNavigation.children?.map((item) => item.href),
    [
      "/dashboard/education",
      "/dashboard/education/guidance-counselor",
      "/dashboard/education/about-you",
      "/dashboard/education/education-planning",
      "/dashboard/education/career-planning",
      "/dashboard/education/goals",
      "/dashboard/education/schools",
      "/dashboard/education/certifications",
      "/dashboard/education/scholarships",
      "/dashboard/education/documents",
      "/dashboard/education/progress",
    ]
  );
  assert.equal(
    memberBeastMoneyNavigation.children?.some((item) => item.label === "Billing"),
    false
  );
  assert.equal(
    memberBeastMoneyNavigation.children?.some((item) => item.future),
    false
  );
  assert.deepEqual(
    getBeastModuleNavigationForPersona(false).map((item) => item.label),
    ["BeastMoney", "BeastEducation", "BeastHealth"]
  );
  assert.deepEqual(
    buildApplicationNavigationForPersona({ isOwner: false }).map(
      (item) => item.label
    ),
    ["BeastMoney", "BeastEducation", "BeastHealth"]
  );
  assert.deepEqual(buildOwnerNavigationForPersona({ isOwner: false }), []);
  assert.equal(
    getBeastModuleNavigationForPersona(true)
      .find((item) => item.label === "BeastMoney")
      ?.children?.some((item) => item.label === "Billing"),
    false
  );
  assert.equal(
    getBeastModuleNavigationForPersona(true).some((item) => item.comingSoon),
    true
  );
  assert.equal(
    getBeastModuleNavigationForPersona(true).some((item) => item.label === "BeastAdmin"),
    true
  );
  assert.deepEqual(
    buildOwnerNavigationForPersona({
      isOwner: canAccessBeastAdmin({ role: "admin", adminViewMode: "admin" }),
    }).map((item) => item.label),
    ["BeastAdmin", "BF-Dash"]
  );
  assert.deepEqual(
    buildOwnerNavigationForPersona({
      isOwner: canAccessBeastAdmin({ role: "admin", adminViewMode: "member" }),
    }),
    []
  );
  assert.deepEqual(
    buildOwnerNavigationForPersona({
      isOwner: canAccessBeastAdmin({ role: "admin", adminViewMode: "admin" }),
    }).map((item) => item.label),
    ["BeastAdmin", "BF-Dash"]
  );
  assert.equal(
    getBeastModuleNavigationForPersona(false).some((item) => item.label === "BeastAdmin"),
    false
  );

  const dashboardLayout = readFileSync("src/app/dashboard/layout.tsx", "utf8");
  assert.match(dashboardLayout, /beastOSNavigation/);
  assert.match(dashboardLayout, /buildApplicationNavigationForPersona/);
  assert.match(dashboardLayout, /buildOwnerNavigationForPersona/);
  assert.match(dashboardLayout, /ADMIN_VIEW_MODE_EVENT/);
  assert.match(dashboardLayout, /canAccessBeastAdmin/);
  assert.match(dashboardLayout, /pathname\.startsWith\("\/dashboard\/admin"\) && !canUseBeastAdmin/);
  const entitlementHook = readFileSync("src/lib/hooks/useEntitlements.ts", "utf8");
  assert.match(entitlementHook, /window\.location\.reload\(\)/);
  assert.equal(
    primaryNavigation.some(
      (item) => item.label === "Documents" && item.href === "/dashboard/uploads"
    ),
    false
  );
  assert.equal(
    sharedNavigation.some(
      (item) => item.label === "Goals" && item.href === "/dashboard/goals"
    ),
    true
  );
  assert.equal(
    sharedNavigation.some(
      (item) => item.label === "Documents" && item.href === "/dashboard/uploads"
    ),
    true
  );
});

test("BeastAdmin foundation registers modules and protects owner-only navigation", () => {
  assert.deepEqual(
    beastModuleRegistry.map((module) => module.name),
    [
      "BeastOS",
      "BeastMoney",
      "BeastEducation",
      "BeastGoals",
      "BeastDocuments",
      "BeastHealth",
      "BeastHome",
      "BeastAdmin",
    ]
  );
  assert.deepEqual(
    beastModuleRegistry.map((module) => [
      module.name,
      module.id,
      module.version,
      module.status,
      module.visibility,
      module.enabled,
      module.beta,
      Boolean(module.ownerNotes),
    ]),
    [
      ["BeastOS", "beastos", `v${versionManifest.beastos.version}`, "active", "released", true, false, true],
      ["BeastMoney", "money", `v${versionManifest.beastmoney.version}`, "active", "released", true, false, true],
      ["BeastEducation", "learning", `v${versionManifest.beastlearning.version} ${versionManifest.beastlearning.channel}`, "active", "released", true, false, true],
      ["BeastGoals", "goals", `v${versionManifest.beastgoals.version}`, "foundation", "adminOnly", true, false, true],
      ["BeastDocuments", "documents", `v${versionManifest.beastdocuments.version}`, "foundation", "adminOnly", true, false, true],
      ["BeastHealth", "health", `v${versionManifest.beasthealth.version} ${versionManifest.beasthealth.channel}`, "active", "released", true, false, true],
      ["BeastHome", "home", `v${versionManifest.beasthome.version} ${versionManifest.beasthome.channel}`, "foundation", "adminOnly", true, false, true],
      ["BeastAdmin", "admin", "foundation", "foundation", "adminOnly", true, false, true],
    ]
  );
  assert.deepEqual(
    MODULE_VISIBILITY_LABELS,
    {
      adminOnly: "Admin Only",
      beta: "Beta",
      released: "Released",
      disabled: "Disabled",
    }
  );
  assert.equal(getModuleVisibilityLabel("adminOnly"), "Admin Only");
  assert.deepEqual(
    beastAdminNavigation.children?.map((item) => item.label),
    [
      "CEO Mode",
      "Development Console",
      "Platform Health",
      "Migration Status",
      "SQL Explorer",
      "Release Center",
      "Execution History",
      "Roadmap",
      "Executive Metrics",
      "AI Analytics",
      "SEANGWORLD Intelligence",
      "BeastHunter",
      "Knowledge Inspector",
      "Ecosystem Map",
      "Members",
      "Member Messages",
      "Beta Feedback",
      "Modules",
      "Feature Flags",
      "Prompt Library",
      "Planned Workspaces",
      "Revenue",
      "Settings",
    ]
  );
  assert.deepEqual(
    getModuleChildren("health").map((item) => item.label),
    [
      "Overview",
      "Health Advisor",
      "Health Profile",
      "Conditions",
      "Medications",
      "Procedures",
      "Family History",
      "Lifestyle",
      "Health Measurements",
      "Health Goals",
      "Health Documents",
      "Providers",
      "Appointments",
      "Timeline",
    ]
  );
  assert.equal(
    beastModuleRegistry.find((module) => module.id === "health")?.href,
    "/dashboard/health"
  );
  assert.deepEqual(
    getModuleChildren("home").map((item) => item.label),
    [
      "Overview",
      "Home",
      "Vehicles",
      "Maintenance",
      "Security",
      "Home Goals",
      "Home Documents",
      "Settings",
    ]
  );
  assert.equal(
    beastModuleRegistry.find((module) => module.id === "home")?.href,
    "/dashboard/home"
  );
  assert.equal(isBeastAdminOwnerRole("admin"), true);
  assert.equal(isBeastAdminOwnerRole("user"), false);

  const memberVisible = getVisibleModuleRegistryEntries({ isOwner: false }).map(
    (module) => module.name
  );
  assert.deepEqual(memberVisible, ["BeastOS", "BeastMoney", "BeastEducation", "BeastHealth"]);
  assert.equal(
    buildBeastModuleNavigationForPersona({
      isOwner: false,
      registry: beastModuleRegistry,
    }).some((item) => item.label === "BeastHealth"),
    true
  );
  assert.equal(
    buildBeastModuleNavigationForPersona({
      isOwner: false,
      registry: beastModuleRegistry,
    }).some((item) => item.label === "BeastHome"),
    false
  );

  const releasedGoalsRegistry = updateModuleVisibility(
    beastModuleRegistry,
    "goals",
    "released"
  );
  assert.equal(
    buildBeastModuleNavigationForPersona({
      isOwner: false,
      registry: releasedGoalsRegistry,
    }).some((item) => item.label === "BeastGoals"),
    true
  );

  const betaHealthRegistry = updateModuleVisibility(
    beastModuleRegistry,
    "health",
    "beta"
  );
  assert.equal(
    buildBeastModuleNavigationForPersona({
      isOwner: false,
      registry: betaHealthRegistry,
    }).some((item) => item.label === "BeastHealth"),
    true
  );

  assert.equal(
    buildBeastModuleNavigationForPersona({
      isOwner: false,
      registry: beastModuleRegistry,
    }).some((item) => item.label === "BeastAdmin"),
    false
  );

  const disabledMoneyRegistry = updateModuleVisibility(
    beastModuleRegistry,
    "money",
    "disabled"
  );
  assert.equal(
    buildBeastModuleNavigationForPersona({
      isOwner: false,
      registry: disabledMoneyRegistry,
    }).some((item) => item.label === "BeastMoney"),
    false
  );
});

test("BeastAdmin routes cover CEO operations members analytics feedback ads and settings", () => {
  const adminFiles = [
    "src/app/dashboard/admin/page.tsx",
    "src/app/dashboard/admin/development/page.tsx",
    "src/app/dashboard/admin/platform-health/page.tsx",
    "src/app/dashboard/admin/metrics/page.tsx",
    "src/app/dashboard/admin/migrations/page.tsx",
    "src/app/dashboard/admin/migrations/explorer/page.tsx",
    "src/app/dashboard/admin/releases/page.tsx",
    "src/app/dashboard/admin/members/page.tsx",
    "src/app/dashboard/admin/modules/page.tsx",
    "src/app/dashboard/admin/flags/page.tsx",
    "src/app/dashboard/admin/prompt-library/page.tsx",
    "src/app/dashboard/admin/analytics/page.tsx",
    "src/app/dashboard/admin/feedback/page.tsx",
    "src/app/dashboard/admin/ads/page.tsx",
    "src/app/dashboard/admin/settings/page.tsx",
    "src/app/dashboard/admin/BeastAdminShell.tsx",
  ];

  adminFiles.forEach((file) => {
    assert.equal(readFileSync(file, "utf8").includes("BeastAdmin"), true, file);
  });

  const adminDashboard = readFileSync("src/app/dashboard/admin/page.tsx", "utf8");
  [
    "CEO Mode",
    "daily operating headquarters",
    "BeastAdminCEOModeWorkspace",
  ].forEach((label) => {
    assert.match(adminDashboard, new RegExp(label));
  });
  assert.match(adminDashboard, /owner-only/);

  const shell = readFileSync("src/app/dashboard/admin/BeastAdminShell.tsx", "utf8");
  const layout = readFileSync("src/app/dashboard/layout.tsx", "utf8");
  assert.match(shell, /canAccessBeastAdmin/);
  assert.match(shell, /ADMIN_VIEW_MODE_EVENT/);
  assert.match(shell, /adminViewMode/);
  assert.match(shell, /setAccessState\("denied"\)/);
  assert.match(layout, /pathname\.startsWith\("\/dashboard\/admin"\) && !canUseBeastAdmin/);

  const membersPage = readFileSync(
    "src/app/dashboard/admin/members/page.tsx",
    "utf8"
  );
  const memberTimelineWorkspace = readFileSync(
    "src/app/dashboard/admin/members/BeastAdminMemberTimelineWorkspace.tsx",
    "utf8"
  );
  const memberTimelineModel = readFileSync(
    "src/lib/beastAdminMemberTimeline.ts",
    "utf8"
  );
  assert.match(membersPage, /Member Directory/);
  assert.match(membersPage, /BeastAdminMemberManagementWorkspace/);
  assert.match(memberTimelineWorkspace, /Search members/);
  assert.match(memberTimelineModel, /Registration/);
  assert.match(memberTimelineWorkspace, /Permission and Source Coverage/);
  const analytics = buildBeastAdminAnalytics({
    members: beastAdminFixtureMembers,
    moduleCount: beastModuleRegistry.length,
    feedbackCount: beastAdminFixtureFeedback.length,
    betaAssignments: beastAdminFixtureAssignments,
  });
  assert.deepEqual(analytics, {
    totalMembers: 2,
    activeMembers: 1,
    moduleCount: 8,
    feedbackCount: 1,
    betaUsers: 1,
  });
});

test("BeastAdmin beta assignments are independent of member role", () => {
  assert.deepEqual(beastAdminBetaAssignableModules, [
    "learning",
    "health",
    "home",
    "goals",
    "documents",
  ]);
  assert.deepEqual(getBetaAssignableModuleLabels(), [
    "BeastEducation",
    "BeastHealth",
    "BeastHome",
    "BeastGoals",
    "BeastDocuments",
  ]);

  assert.deepEqual(
    buildBetaAssignmentRows({
      members: beastAdminFixtureMembers,
      assignments: beastAdminFixtureAssignments,
    }).map((assignment) => [
      assignment.memberName,
      assignment.memberRole,
      assignment.moduleName,
    ]),
    [["Fixture Beta", "Beta", "BeastEducation"]]
  );

  const nextAssignments = assignBetaModule(beastAdminFixtureAssignments, {
    id: "assignment-health-beta",
    memberId: "fixture-owner",
    moduleId: "health",
    assignedAt: "2026-07-14T00:00:00.000Z",
  });

  assert.equal(nextAssignments.length, beastAdminFixtureAssignments.length + 1);
  assert.equal(
    nextAssignments.some(
      (assignment) =>
        assignment.memberId === "fixture-owner" && assignment.moduleId === "health"
    ),
    true
  );
  assert.equal(
    assignBetaModule(nextAssignments, nextAssignments[nextAssignments.length - 1]).length,
    nextAssignments.length
  );

  assert.equal(
    beastAdminFixtureMembers.find((member) => member.id === "fixture-owner")?.role,
    "Owner"
  );

  const settingsPage = readFileSync(
    "src/app/dashboard/admin/settings/page.tsx",
    "utf8"
  );
  assert.match(settingsPage, /Manage live assignments in Feature Flags/);
  assert.match(settingsPage, /beast_admin_feature_flag_assignments/);
  assert.match(settingsPage, /does not display seeded members/);
  assert.doesNotMatch(settingsPage, /owner@beastos\.local|beta@beastos\.local/);
});

test("BeastHealth is released to eligible members and preserves medical boundaries", () => {
  const shell = readFileSync(
    "src/app/dashboard/health/BeastHealthShell.tsx",
    "utf8"
  );
  const pages = readFileSync("src/app/dashboard/health/pages.ts", "utf8");
  const layout = readFileSync("src/app/dashboard/layout.tsx", "utf8");

  [
    "Overview",
    "Health Profile",
    "Conditions",
    "Medications",
    "Procedures",
    "Family History",
    "Lifestyle",
    "Health Measurements",
    "Health Goals",
    "Health Documents",
    "Providers",
    "Appointments",
    "Timeline",
    "Health Advisor",
  ].forEach((label) => assert.equal(shell.includes(label), true));

  const workspace = readFileSync(
    "src/app/dashboard/health/BeastHealthWorkspace.tsx",
    "utf8"
  );
  assert.match(workspace, /HealthOverviewWorkspace/);
  assert.match(workspace, /HealthRecordWorkspace/);
  assert.match(workspace, /HealthTimelineWorkspace/);
  assert.match(workspace, /\.from\("beast_health_records"\)/);

  assert.match(shell, /resolveMemberModuleEntitlement/);
  assert.match(shell, /getModuleRegistryEntry\("health"\)/);
  const advisor = readFileSync(
    "src/app/dashboard/health/HealthAdvisorWorkspace.tsx",
    "utf8"
  );
  assert.match(advisor, /Medical Safety Boundary/);
  assert.match(advisor, /never diagnoses or replaces clinicians/);
  assert.match(advisor, /SupabaseExecutionHistoryStore/);
  assert.match(advisor, /recordResultAndOutcome/);
  assert.match(pages, /Build your health story/);
  assert.match(shell, /Health Advisor Active/);
  assert.match(layout, /pathname\.startsWith\("\/dashboard\/health"\)/);
  assert.equal(
    buildBeastModuleNavigationForPersona({
      isOwner: true,
      registry: beastModuleRegistry,
    }).some(
      (item) =>
        item.label === "BeastHealth" && item.href === "/dashboard/health"
    ),
    true
  );
});

test("BHM-001 BeastHome foundation is admin-only placeholder application", () => {
  const shell = readFileSync(
    "src/app/dashboard/home/BeastHomeShell.tsx",
    "utf8"
  );
  const pages = readFileSync("src/app/dashboard/home/pages.ts", "utf8");
  const layout = readFileSync("src/app/dashboard/layout.tsx", "utf8");
  const access = readFileSync("src/lib/learning/access.ts", "utf8");

  [
    "Overview",
    "Home",
    "Vehicles",
    "Maintenance",
    "Security",
    "Home Goals",
    "Home Documents",
    "Settings",
  ].forEach((label) => assert.match(shell, new RegExp(label)));

  [
    "src/app/dashboard/home/page.tsx",
    "src/app/dashboard/home/property/page.tsx",
    "src/app/dashboard/home/vehicles/page.tsx",
    "src/app/dashboard/home/maintenance/page.tsx",
    "src/app/dashboard/home/security/page.tsx",
    "src/app/dashboard/home/settings/page.tsx",
  ].forEach((path) =>
    assert.match(readFileSync(path, "utf8"), /BeastHomePlaceholderPage/)
  );
  assert.match(
    readFileSync("src/app/dashboard/home/documents/page.tsx", "utf8"),
    /UploadsPage[\s\S]*module: "home"/
  );

  assert.match(shell, /isBeastAdminOwnerRole/);
  assert.match(shell, /router\.replace\("\/dashboard"\)/);
  assert.match(
    shell,
    /No maintenance scheduling, security automation, vehicle workflow, or household sharing workflow is active/
  );
  assert.match(pages, /No scheduling automation in this package/);
  assert.match(layout, /pathname\.startsWith\("\/dashboard\/home"\)/);
  assert.match(access, /"\/dashboard\/home"/);
  assert.equal(
    buildBeastModuleNavigationForPersona({
      isOwner: true,
      registry: beastModuleRegistry,
    }).some(
      (item) => item.label === "BeastHome" && item.href === "/dashboard/home"
    ),
    true
  );
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
