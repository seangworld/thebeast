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
    ["custom", "minimum", "snowball", "avalanche", "velocity"]
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
    ["SEANGWORLD HQ", "BeastAdmin"]
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
      "Homework Helper / AI Tutor",
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
    beastLearningNavigation.children?.[3].href,
    "/dashboard/education/about-you"
  );
  assert.equal(beastMoneyNavigation.label, "BeastMoney");
  assert.equal(
    beastMoneyNavigation.children?.map((item) => item.label).join(","),
    "Dashboard,Money Coach,Cash Flow,Income,Expenses,Bills,Debts,Payoff Plan,Strategies,Timeline,Velocity Banking,Retirement,Financial Goals,Financial Documents,Reports"
  );
  assert.equal(getModuleChildren("learning").length, 12);
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
    "Family & household",
    "Family",
    "Emergency Contacts",
    "Notification Preferences",
    "Privacy",
    "Connected Modules",
    "AI Preferences",
    "Communication Preferences",
    "Memory Settings",
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
  assert.match(settingsPage, /aren’t available yet/);
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
  assert.match(readFileSync("src/app/api/calendar/route.ts", "utf8"), /eq\("owner_id", user.id\)/);
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
  assert.match(calendarPage, /buildMonthGrid/);
  assert.match(calendarPage, /agenda.map/);
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
  assert.match(readFileSync("src/lib/calendar/memberSchedule.ts", "utf8"), /buildMonthlyPaymentChecklist/);
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
  assert.doesNotMatch(calendarPage, /sharedCalendarEvents|detectCalendarConflicts/);
  assert.match(calendarPage, /settings\/notifications/);
  assert.match(calendarPage, /resolvedOptions\(\).timeZone/);
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
  assert.match(notificationsPage, /PrivateAdminMessageNotifications/);
  assert.match(notificationsPage, /BillDueNotifications/);
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
  assert.match(notificationsPage, /Manage device notifications/);
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
  assert.match(settingsPage, /Features coming later/);
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
      boundary.includes("not official school counseling")
    ),
    true
  );
  assert.equal(
    roadmap.planningBoundaries.some((boundary) =>
      boundary.includes("Student and minor safety requirements remain in force")
    ),
    true
  );
  assert.equal(
    roadmap.learningReadinessSignals.includes("Learning Readiness"),
    true
  );
  assert.equal(roadmap.learningReadinessSignals.includes("mastery"), true);
  assert.equal(roadmap.curriculumFramework.model, "subject-agnostic");
  assert.equal(
    roadmap.curriculumFramework.hierarchy.includes("Objective"),
    true
  );
  assert.equal(roadmap.curriculumFramework.newSubjectRequiresCodeChange, false);
  assert.equal(
    roadmap.curriculumFramework.exampleSubjects.includes("Security+"),
    true
  );
  assert.equal(
    JSON.stringify(roadmap).includes("Financial Health"),
    false
  );
});

test("BL-201 student profile foundation supports Guidance Counselor and Guidance Counselor context", () => {
  const firstUse = buildStudentProfile({
    learnerId: "new-student",
    displayName: "New Student",
  });

  assert.equal(firstUse.stage, "first_use");
  assert.equal(firstUse.supportNeeds.includes("goal_clarity"), true);
  assert.equal(firstUse.supportNeeds.includes("placement"), true);
  assert.match(firstUse.mentorSummary, /Ask one goal question/);
  assert.match(firstUse.guidanceCounselorSummary, /desired outcome/);
  assert.equal(firstUse.activeGoalTitles.value.length, 0);

  const activeStudent = buildStudentProfile({
    learnerId: "current",
    displayName: "Sean Learner",
    academicLevel: "Adult learner",
    interests: ["cybersecurity", "career growth", "cybersecurity"],
    activeGoals: mockLearningGoals,
    learningPreferences: ["short practice", "plain language"],
    availableTime: "20 minutes most weekdays",
    guidanceGoalType: "Certification",
    progressSignals: {
      activeGoalsCount: 2,
      currentStreakDays: 4,
      sessionsCompleted: 8,
      estimatedWeeklyStudyMinutes: 120,
      progressPercentage: 38,
      readinessScore: 72,
      weakArea: "Networking fundamentals",
      recommendedNextAction: "review subnetting",
      snapshotTiles: [],
    },
    recentSessions: mockLearningSessions,
    profileReferences: ["BeastOS education history", "BeastOS learning preferences"],
  });

  assert.equal(activeStudent.stage, "planning");
  assert.deepEqual(activeStudent.interests.value, ["cybersecurity", "career growth"]);
  assert.equal(activeStudent.activeGoalTitles.value[0], "Security+");
  assert.equal(activeStudent.supportNeeds.includes("certification_planning"), true);
  assert.equal(activeStudent.supportNeeds.includes("study_rhythm"), true);
  assert.match(activeStudent.mentorSummary, /Security\+/);
  assert.match(activeStudent.guidanceCounselorSummary, /confirm requirements/);
  assert.match(activeStudent.readinessSummary, /Steady readiness/);
  assert.deepEqual(
    studentProfileOwnershipRules.slice(0, 2),
    [
      "BeastOS owns identity, shared profile intelligence, permissions, and durable profile facts.",
      "BeastEducation owns learning-session evidence, Guidance Counselor observations, guidance planning context, and student-learning intelligence.",
    ]
  );
  assert.equal(
    activeStudent.privacyBoundaries.some((rule) =>
      rule.includes("not a duplicate Beast Profile")
    ),
    true
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
  assert.equal(mockLearningCertificates[0].certificateTitle, "Beast Academy Certificate");
  assert.equal(mockLearningCertificates[0].skillsDemonstrated.includes("Authentication factors"), true);
  assert.equal(portfolio.portfolioEntries[0].certificateId, mockLearningCertificates[0].certificateId);
  assert.equal(portfolio.skillsPlaceholder.includes("Role-based access control"), true);
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
      "General Academic Tutor",
      "Study Coach",
      "Homework Coach",
      "Guidance Counselor",
      "Career Path Specialist",
      "Parent Assistant",
      "Certification Coach",
      "Certification Tutor",
      "Reading Coach",
      "Writing Coach",
      "Language Coach",
      "Math Tutor",
      "Science Tutor",
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

test("Beast Academy completion awards certificates only after milestone or course assessment", () => {
  const lessonDecision = decideTutorLessonReadiness({
    masteryEstimate: 86,
    masteryThreshold: 80,
  });
  const passed = evaluateBeastAcademyCompletion({
    learnerName: "Alex",
    pathName: "Security+ Foundations",
    completedAt: "2026-07-12",
    scope: "course_completion",
    masteryPercent: 91,
    requiredMasteryPercent: 85,
    skillsDemonstrated: [
      "Identity verification",
      "Authentication factors",
      "Role-based access control",
    ],
    evidence: [
      "milestone assessment",
      "Tutor mastery check",
      "course completion review",
    ],
  });

  assert.equal(beastAcademyAssessmentPolicy.knowledgeChecks, "natural_lesson_checks");
  assert.deepEqual(beastAcademyAssessmentPolicy.formalAssessmentScopes, [
    "major_milestone",
    "course_completion",
  ]);
  assert.equal(beastAcademyAssessmentPolicy.artificialWaitingPeriods, false);
  assert.equal(lessonDecision.checkType, "natural_lesson_check");
  assert.equal(lessonDecision.formalAssessmentRequired, false);
  assert.equal(lessonDecision.readyToContinue, true);
  assert.equal(passed.status, "passed");
  assert.equal(passed.certificate?.certificateTitle, "Beast Academy Certificate");
  assert.deepEqual(passed.certificate?.skillsDemonstrated, [
    "Identity verification",
    "Authentication factors",
    "Role-based access control",
  ]);
  assert.equal(passed.completionRecord.status, "passed");
  assert.equal(passed.portfolioEntry?.certificateId, passed.certificate?.certificateId);
  assert.equal(passed.retestPolicy.artificialWaitingPeriod, false);
});

test("Beast Academy failed completion routes to Guidance Counselor explanation Tutor remediation and immediate retest readiness", () => {
  const lessonDecision = decideTutorLessonReadiness({
    masteryEstimate: 58,
    masteryThreshold: 80,
  });
  const failed = evaluateBeastAcademyCompletion({
    learnerName: "Sam",
    pathName: "Pre-Algebra Foundations",
    completedAt: "2026-07-12",
    scope: "major_milestone",
    masteryPercent: 62,
    requiredMasteryPercent: 80,
    skillsDemonstrated: ["Identify like terms"],
    evidence: ["milestone assessment", "missed combining coefficients"],
  });

  assert.equal(lessonDecision.nextAction, "remediate");
  assert.equal(lessonDecision.artificialWaitingPeriod, false);
  assert.equal(failed.status, "needs_remediation");
  assert.equal(failed.certificate, undefined);
  assert.equal(failed.portfolioEntry, undefined);
  assert.equal(failed.completionRecord.status, "needs_remediation");
  assert.match(failed.mentorMessage, /Guidance Counselor will explain the gap/);
  assert.match(failed.tutorAction, /Remediate/);
  assert.equal(failed.retestPolicy.retestWhenReady, true);
  assert.equal(failed.retestPolicy.artificialWaitingPeriod, false);
});

test("learning knowledge model includes a prerequisite graph", () => {
  const curriculumGraph = buildCurriculumKnowledgeGraph();
  const prerequisiteRecommendation = recommendFromKnowledgeGraph({
    currentConceptId: "linear-equations",
    masteredConceptIds: ["fraction-basics"],
  });
  const downstreamRecommendation = recommendFromKnowledgeGraph({
    currentConceptId: "proportions",
    masteredConceptIds: ["fraction-basics", "ratios", "proportions"],
  });

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
  assert.equal(
    mockLearningKnowledgeModel.graphLinks?.some(
      (link) => link.from === "ratios" && link.to === "proportions" && link.relationship === "requires"
    ),
    true
  );
  assert.deepEqual(prerequisiteRecommendation.dependencyPath, [
    "ratios",
    "proportions",
    "linear-equations",
  ]);
  assert.equal(prerequisiteRecommendation.action, "review-prerequisite");
  assert.match(prerequisiteRecommendation.reason, /Ratios first/);
  assert.equal(downstreamRecommendation.recommendedConceptId, "linear-equations");
  assert.equal(downstreamRecommendation.action, "continue-downstream");
  assert.equal(
    curriculumGraph.nodes.some((node) => node.kind === "learning-goal" && node.id === "goal-mathematics"),
    true
  );
  assert.equal(
    curriculumGraph.links.some(
      (link) => link.from === "pre-algebra-combining-like-terms" && link.relationship === "belongs-to"
    ),
    true
  );
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

test("learner skill model records confidence and evidence state", () => {
  const mastery = calculateMasteryProfile([
    {
      conceptId: "evidence-backed-skill",
      completedSessions: 4,
      completedGoals: 1,
      completedMilestones: 2,
      quizzesPlaceholder: 2,
      practicePlaceholder: 3,
      studyStreakDays: 5,
      lastStudiedDaysAgo: 0,
    },
  ]);
  const concept = mastery.concepts[0];
  const state = buildLearnerSkillState({
    learnerId: "learner-1",
    skillId: "skill-evidence-backed",
    concept,
    evidence: [
      {
        id: "practice-evidence",
        kind: "guided-practice",
        sourceId: "practice-step",
        scorePercent: 85,
        observedAt: "2026-07-11",
        summary: "Completed guided practice with a correct explanation.",
      },
      {
        id: "quiz-evidence",
        kind: "quiz",
        sourceId: "quiz-check",
        scorePercent: 90,
        observedAt: "2026-07-12",
        summary: "Answered the quiz check with supporting evidence.",
      },
    ],
  });
  const noEvidenceState = buildLearnerSkillState({
    learnerId: "learner-1",
    skillId: "skill-new",
    concept: {
      conceptId: "new-skill",
      masteryPercent: 0,
      confidence: "low",
    },
    evidence: [],
  });

  assert.equal(state.confidence, concept.confidence);
  assert.equal(state.state, "ready");
  assert.equal(state.evidence.length, 2);
  assert.deepEqual(
    state.evidence.map((item) => item.kind),
    ["guided-practice", "quiz"]
  );
  assert.equal(state.lastEvidenceAt, "2026-07-12");
  assert.equal(skillStateHasEvidence(state), true);
  assert.equal(noEvidenceState.state, "new");
  assert.equal(skillStateHasEvidence(noEvidenceState), false);
});

test("mastery scoring combines checks practice and recency", () => {
  const current = calculateEvidenceMasteryScore({
    conceptId: "evidence-backed-skill",
    currentDate: "2026-07-12",
    evidence: [
      {
        id: "lesson-check",
        kind: "lesson-check",
        sourceId: "check-1",
        scorePercent: 90,
        observedAt: "2026-07-12",
        summary: "Passed a lesson check.",
      },
      {
        id: "practice",
        kind: "guided-practice",
        sourceId: "practice-1",
        scorePercent: 80,
        observedAt: "2026-07-12",
        summary: "Completed practice with support.",
      },
    ],
  });
  const stale = calculateEvidenceMasteryScore({
    conceptId: "evidence-backed-skill",
    currentDate: "2026-07-12",
    evidence: [
      {
        id: "old-quiz",
        kind: "quiz",
        sourceId: "quiz-1",
        scorePercent: 90,
        observedAt: "2026-06-22",
        summary: "Old quiz evidence.",
      },
      {
        id: "old-practice",
        kind: "guided-practice",
        sourceId: "practice-1",
        scorePercent: 80,
        observedAt: "2026-06-22",
        summary: "Old practice evidence.",
      },
    ],
  });
  const missingPractice = calculateEvidenceMasteryScore({
    conceptId: "evidence-backed-skill",
    currentDate: "2026-07-12",
    evidence: [
      {
        id: "quiz-only",
        kind: "quiz",
        sourceId: "quiz-1",
        scorePercent: 90,
        observedAt: "2026-07-12",
        summary: "Quiz-only check.",
      },
    ],
  });

  assert.equal(current.checkScore, 90);
  assert.equal(current.practiceScore, 80);
  assert.equal(current.recencyScore, 100);
  assert.equal(current.masteryPercent, 89);
  assert.equal(current.confidence, "high");
  assert.equal(stale.recencyScore < current.recencyScore, true);
  assert.equal(stale.masteryPercent < current.masteryPercent, true);
  assert.equal(missingPractice.practiceScore, 0);
  assert.equal(missingPractice.masteryPercent < current.masteryPercent, true);
});

test("adaptive difficulty changes from success and struggle without subject branching", () => {
  const strongSuccess = adjustLearningDifficulty({
    conceptId: "fraction-fluency",
    subject: "Pre-Algebra",
    currentDifficulty: "developing",
    checkScore: 94,
    practiceScore: 90,
    recencyScore: 100,
    attempts: 4,
    hintsUsed: 1,
  });
  const struggle = adjustLearningDifficulty({
    conceptId: "incident-response-basics",
    subject: "Cybersecurity certification preparation",
    currentDifficulty: "developing",
    checkScore: 52,
    practiceScore: 58,
    recencyScore: 80,
    attempts: 4,
    hintsUsed: 4,
  });
  const unrelatedSubject = adjustLearningDifficulty({
    conceptId: "basic-joinery",
    subject: "Woodworking",
    currentDifficulty: "introductory",
    checkScore: 88,
    practiceScore: 86,
    recencyScore: 95,
    attempts: 3,
    hintsUsed: 0,
  });

  assert.equal(strongSuccess.direction, "harder");
  assert.equal(strongSuccess.recommendedDifficulty, "challenge");
  assert.equal(struggle.direction, "easier");
  assert.equal(struggle.recommendedDifficulty, "introductory");
  assert.equal(unrelatedSubject.direction, "harder");
  assert.equal(unrelatedSubject.recommendedDifficulty, "developing");
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
  assert.equal(Boolean(customPlan.progressionDecision), true);
  assert.equal(
    ["continue", "review", "remediate", "accelerate", "skip_mastered_content"].includes(
      customPlan.progressionDecision!.action
    ),
    true
  );
});

test("adaptive progression explains continue review remediation acceleration and skips", () => {
  const snapshot = buildLearningIntelligenceSnapshot({
    goals: mockLearningGoals,
    weeklyStudyMinutes: 80,
  });
  const reviewDecision = decideAdaptiveProgression({
    goals: mockLearningGoals,
    mastery: snapshot.mastery,
    weakness: snapshot.weakness,
    memory: mockLearningMemory,
    confidence: {
      dimensions: [
        {
          id: "retention",
          label: "Retention",
          level: "review-due",
          evidence: "Last completed activity was 8 days ago.",
          learnerLanguage: "This skill is due for a retention review.",
        },
      ],
      mentorSummary: "Review is due.",
      recommendation: "Schedule a short retention review.",
      missingData: false,
    },
    timeline: [
      {
        id: "review-1",
        type: "review_scheduled",
        title: "Retention review",
        detail: "Check the skill before moving on.",
        priority: "high",
      },
    ],
  });

  assert.equal(reviewDecision.action, "review");
  assert.match(reviewDecision.explanation, /follow-up/);
  assert.equal(reviewDecision.shouldSkipMasteredContent, false);

  const remediateDecision = decideAdaptiveProgression({
    goals: mockLearningGoals,
    mastery: snapshot.mastery,
    weakness: {
      ...snapshot.weakness,
      lowMasteryConcepts: ["subnetting"],
      slowProgressConcepts: ["subnetting"],
    },
    memory: mockLearningMemory,
    activities: [
      {
        id: "activity-1",
        activity_type: "Lesson",
        title: "Subnetting practice",
        difficulty: "Beginner",
        estimated_minutes: 20,
        xp: 20,
        status: "Completed",
        sort_order: 1,
        session_weak_concepts: ["CIDR notation"],
        reflection_option: "I guessed",
        reflection_confidence_adjustment: "lower-confidence",
      },
    ],
  });

  assert.equal(remediateDecision.action, "remediate");
  assert.equal(remediateDecision.learnerPace, "slow");
  assert.match(remediateDecision.mentorLanguage, /reinforce/);

  const advancedDecision = decideAdaptiveProgression({
    goals: mockLearningGoals,
    mastery: {
      overallMasteryPercent: 88,
      confidence: "high",
      concepts: [
        { conceptId: "known-topic", masteryPercent: 92, confidence: "high" },
        { conceptId: "stretch-topic", masteryPercent: 64, confidence: "medium" },
      ],
      weakConcepts: ["stretch-topic"],
      strongestConcepts: ["known-topic"],
      suggestedReviewTopics: [],
    },
    weakness: {
      neglectedTopics: [],
      repeatedReviewNeeds: [],
      lowMasteryConcepts: [],
      slowProgressConcepts: [],
      inconsistentStudyHabits: false,
      improvementSuggestions: [],
    },
    memory: mockLearningMemory,
    activities: [
      {
        id: "activity-2",
        activity_type: "Lesson",
        title: "Known topic check",
        difficulty: "Intermediate",
        estimated_minutes: 20,
        xp: 30,
        status: "Completed",
        sort_order: 1,
        session_strengths: ["Known topic"],
      },
      {
        id: "activity-3",
        activity_type: "Lesson",
        title: "Known topic application",
        difficulty: "Intermediate",
        estimated_minutes: 20,
        xp: 30,
        status: "Completed",
        sort_order: 2,
        session_strengths: ["Application"],
      },
    ],
  });

  assert.equal(advancedDecision.action, "skip_mastered_content");
  assert.equal(advancedDecision.learnerPace, "advanced");
  assert.equal(advancedDecision.shouldSkipMasteredContent, true);
  assert.match(advancedDecision.explanation, /skip repeated basics/);

  const continueDecision = decideAdaptiveProgression({
    goals: mockLearningGoals,
    mastery: snapshot.mastery,
    weakness: {
      neglectedTopics: [],
      repeatedReviewNeeds: [],
      lowMasteryConcepts: [],
      slowProgressConcepts: [],
      inconsistentStudyHabits: false,
      improvementSuggestions: [],
    },
    memory: mockLearningMemory,
  });

  assert.equal(continueDecision.action, "continue");
  assert.match(continueDecision.explanation, /continuing/);
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

test("learning content governance labels implemented planned and review states", () => {
  const courseStatus = getCourseContentStatus(builtLearningCourses[0]);
  const completedLesson = learningLessons.find(
    (lesson) => lesson.completionStatus === "Completed"
  );
  const openLesson = learningLessons.find(
    (lesson) => lesson.completionStatus !== "Completed"
  );
  const guideStatus = getStudyGuideContentStatus(learningStudyGuides[0]);
  const recommendations = buildLearningRecommendations({
    progress: buildLearningProgressSignals({
      goals: mockLearningGoals,
      courses: mockLearningCourses,
      plan: mockLearningPlan,
      sessions: mockLearningSessions,
      achievements: mockLearningAchievements,
      studySession: mockStudySessionCommand,
    }),
    currentPlanTitle: mockLearningPlan.title,
    activeGoalsCount: mockLearningGoals.length,
    currentFocus: mockStudySessionCommand.currentFocus,
  });
  const recommendationStatus = getRecommendationContentStatus(recommendations[0]);

  assert.equal(courseStatus.status, "requires-review");
  assert.equal(getLessonContentStatus(completedLesson!).status, "implemented");
  assert.equal(getLessonContentStatus(openLesson!).status, "requires-review");
  assert.equal(guideStatus.status, "implemented");
  assert.equal(recommendationStatus.status, "implemented");
  assert.deepEqual(
    learningContentReviewRequirements.map((requirement) => requirement.area),
    ["accuracy", "age-appropriateness", "accessibility", "safety"]
  );
  assert.equal(
    learningStarterPathStandards.some((standard) =>
      standard.standard.includes("implemented data")
    ),
    true
  );
  assert.equal(thirdPartyLearningSiteDirection.planningOnly, true);
  assert.equal(thirdPartyLearningSiteDirection.status, "planned");
});

test("content quality review workflow requires accuracy age accessibility and safety approval", () => {
  const review = buildRequiredContentQualityReview({
    contentId: "generated-biology-starter",
    contentType: "lesson",
  });
  const blocked = evaluateContentQualityReview(review);
  const approved = evaluateContentQualityReview({
    ...review,
    items: review.items.map((item) => ({
      ...item,
      status: "approved",
      notes: `${item.area} reviewed and approved.`,
    })),
  });
  const incomplete = evaluateContentQualityReview({
    ...review,
    items: review.items.filter((item) => item.area !== "safety"),
  });

  assert.deepEqual(
    review.items.map((item) => item.area),
    ["accuracy", "age-appropriateness", "accessibility", "safety"]
  );
  assert.equal(review.items.every((item) => item.status === "requires-changes"), true);
  assert.equal(blocked.complete, true);
  assert.equal(blocked.approved, false);
  assert.deepEqual(blocked.blockedAreas, [
    "accuracy",
    "age-appropriateness",
    "accessibility",
    "safety",
  ]);
  assert.equal(approved.complete, true);
  assert.equal(approved.approved, true);
  assert.deepEqual(approved.blockedAreas, []);
  assert.equal(incomplete.complete, false);
  assert.deepEqual(incomplete.missingAreas, ["safety"]);
});

test("learning core loop teaches practices checks mastery and resumes a lesson", () => {
  const learner = buildCoreLearnerProfile({
    preferredName: "Alex",
    age: 14,
    gradeLevel: "8th grade",
    subject: "Pre-Algebra",
    goals: ["Understand algebra foundations"],
    interests: ["Robotics"],
    learningPreferences: ["Guided examples", "Hints before answers"],
  });
  const placement = scorePlacementAssessment({
    subject: learner.subject,
    responses: [
      { questionId: "placement-coefficient", answer: "6" },
      { questionId: "placement-like-terms", answer: "2x" },
      { questionId: "placement-combine", answer: "8x" },
    ],
  });
  const path = generateCoreLearningPath({ learner, placement });
  const session = startCoreLessonSession({ learner, path });
  const correctTurn = buildTutorResponseTurn({
    session,
    learnerAnswer: "8x",
  });
  const hintTurn = buildHintTurn(session);
  const alternateTurn = buildAlternativeExplanationTurn(session);
  const mastery = completeCoreLessonMasteryCheck({
    session,
    practiceAnswers: {
      "practice-combine-x": "8x",
      "practice-combine-groups": "6x + 10",
    },
    quizAnswers: {
      "quiz-like-terms-1": "2x",
      "quiz-like-terms-2": "5x + 7",
    },
  });

  assert.equal(learner.ageBand, "teen");
  assert.equal(learner.safetyLevel, "student");
  assert.equal(placement.readinessLevel, "ready-for-lesson");
  assert.deepEqual(placement.gapConceptIds, []);
  assert.equal(
    path.steps.find((step) => step.id === `${session.lesson.id}-lesson`)?.status,
    "ready"
  );
  assert.equal(
    path.progressReport.distinction.includes("Completion tracks finished steps"),
    true
  );
  assert.equal(session.lesson.title, "Combining Like Terms");
  assert.equal(session.resumeState.resumable, true);
  assert.equal(session.resumeState.resumeAtPhase, "practice");
  assert.equal(session.tutorTurns[0].waitsForLearner, true);
  assert.equal(session.tutorTurns[0].revealsAnswer, false);
  assert.equal(correctTurn.feedback, "correct");
  assert.equal(correctTurn.waitsForLearner, true);
  assert.match(correctTurn.prompt, /Nice/);
  assert.match(correctTurn.prompt, /Walk me through/);
  assert.equal(hintTurn.revealsAnswer, false);
  assert.match(hintTurn.prompt, /Don't worry about the formula yet/);
  assert.equal(alternateTurn.intent, "alternate-explanation");
  assert.equal(mastery.progress.mastered, true);
  assert.equal(mastery.progress.tutorReadinessDecision.readyToContinue, true);
  assert.equal(mastery.progress.tutorReadinessDecision.formalAssessmentRequired, false);
  assert.equal(mastery.tutorTurn.intent, "mastery-check");
  assert.equal(mastery.tutorTurn.nextAction, "Solving one-step equations");
});

test("learning core loop routes weak placement and low mastery to remediation", () => {
  const learner = buildCoreLearnerProfile({
    preferredName: "Sam",
    age: 11,
    gradeLevel: "6th grade",
    subject: "Pre-Algebra",
    goals: ["Get ready for algebra"],
    interests: ["Games"],
    learningPreferences: ["Short sessions"],
  });
  const placement = scorePlacementAssessment({
    subject: learner.subject,
    responses: [
      { questionId: "placement-coefficient", answer: "x" },
      { questionId: "placement-like-terms", answer: "2" },
      { questionId: "placement-combine", answer: "3x" },
    ],
  });
  const path = generateCoreLearningPath({ learner, placement });
  const session = startCoreLessonSession({ learner, path });
  const incorrectTurn = buildTutorResponseTurn({
    session,
    learnerAnswer: "6",
  });
  const mastery = completeCoreLessonMasteryCheck({
    session,
    practiceAnswers: {
      "practice-combine-x": "6",
      "practice-combine-groups": "9x",
    },
    quizAnswers: {
      "quiz-like-terms-1": "3",
      "quiz-like-terms-2": "13x + 7",
    },
    confidenceLabel: "Still building",
  });

  assert.equal(learner.ageBand, "child");
  assert.equal(learner.recommendedSessionMinutes, 15);
  assert.equal(placement.readinessLevel, "start-here");
  assert.equal(placement.gapConceptIds.includes("coefficients"), true);
  assert.equal(path.steps.find((step) => step.id === "remediate-placement-gaps")?.status, "ready");
  assert.equal(
    path.steps.find((step) => step.id === `${session.lesson.id}-lesson`)?.status,
    "blocked"
  );
  assert.equal(incorrectTurn.feedback, "incorrect");
  assert.equal(incorrectTurn.revealsAnswer, false);
  assert.match(incorrectTurn.prompt, /Close/);
  assert.match(incorrectTurn.prompt, /try another way/i);
  assert.match(incorrectTurn.prompt, /Walk me through what you're thinking/);
  assert.doesNotMatch(incorrectTurn.prompt, /^Wrong\./);
  assert.equal(mastery.progress.mastered, false);
  assert.equal(mastery.progress.tutorReadinessDecision.nextAction, "remediate");
  assert.equal(mastery.progress.tutorReadinessDecision.artificialWaitingPeriod, false);
  assert.equal(mastery.tutorTurn.intent, "remediation");
  assert.equal(
    mastery.tutorTurn.nextAction,
    "Review coefficients and variable parts before moving on."
  );
});

test("diagnostic intelligence adapts placement from confidence prerequisites and dependencies", () => {
  const shakyPlacement = scorePlacementAssessment({
    subject: "Pre-Algebra",
    responses: [
      { questionId: "placement-coefficient", answer: "6", confidence: "Not sure" },
      { questionId: "placement-like-terms", answer: "2x", confidence: "Not sure" },
      { questionId: "placement-combine", answer: "8x", confidence: "Not sure" },
    ],
  });

  assert.equal(shakyPlacement.scorePercent, 100);
  assert.equal(shakyPlacement.readinessLevel, "guided-review");
  assert.equal(shakyPlacement.diagnostic.partialMasteryConceptIds.includes("coefficients"), true);
  assert.equal(shakyPlacement.gapConceptIds.includes("like-terms"), true);
  assert.match(
    shakyPlacement.diagnostic.mentorExplanation,
    /correct, but confidence was not solid/
  );
  assert.equal(shakyPlacement.diagnostic.recommendedAction, "confirm-confidence");

  const misconceptionPlacement = scorePlacementAssessment({
    subject: "Pre-Algebra",
    responses: [
      { questionId: "placement-coefficient", answer: "x", confidence: "Very confident" },
      { questionId: "placement-like-terms", answer: "2x", confidence: "Confident" },
      { questionId: "placement-combine", answer: "8x", confidence: "Confident" },
    ],
  });
  const learner = buildCoreLearnerProfile({
    preferredName: "Riley",
    age: 13,
    gradeLevel: "7th grade",
    subject: "Pre-Algebra",
    goals: ["Find the real blocker"],
    interests: ["Music"],
    learningPreferences: ["Explain why"],
  });
  const path = generateCoreLearningPath({ learner, placement: misconceptionPlacement });

  assert.equal(misconceptionPlacement.readinessLevel, "start-here");
  assert.equal(misconceptionPlacement.diagnostic.misconceptionConceptIds[0], "coefficients");
  assert.equal(
    misconceptionPlacement.diagnostic.dependencyBlockedConceptIds.includes("combine-like-terms"),
    true
  );
  assert.match(
    misconceptionPlacement.diagnostic.rootCauses[0],
    /likely misconception/
  );
  assert.equal(
    path.steps.find((step) => step.id === "remediate-placement-gaps")?.conceptId,
    "coefficients"
  );
  assert.match(
    path.steps.find((step) => step.id === "remediate-placement-gaps")?.reason || "",
    /misconception/
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
          topic.activities.some((activity) => activity.type === "assessment")
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

test("spaced review scheduler generates review dates from mastery decay", () => {
  const schedule = generateMasteryDecayReviewSchedule({
    today: "2026-07-12",
    concepts: [
      {
        conceptId: "fresh-strong-skill",
        masteryPercent: 92,
        lastStudiedAt: "2026-07-11",
      },
      {
        conceptId: "decayed-skill",
        masteryPercent: 76,
        lastStudiedAt: "2026-06-28",
      },
      {
        conceptId: "fragile-skill",
        masteryPercent: 38,
        lastStudiedAt: "2026-07-12",
      },
    ],
  });

  assert.deepEqual(
    schedule.items.map((item) => item.nextReview),
    ["2026-07-19", "2026-07-13", "2026-07-12"]
  );
  assert.deepEqual(
    schedule.items.map((item) => item.priority),
    ["Low", "High", "High"]
  );
  assert.deepEqual(
    schedule.dueTodayItems.map((item) => item.itemId),
    ["fragile-skill"]
  );
});

test("spaced review detects forgotten mastered skills", () => {
  const reviews = detectForgottenSkillReviews({
    today: "2026-07-10",
    concepts: [
      {
        conceptId: "fractions",
        masteryPercent: 94,
        lastStudiedAt: "2026-06-20",
        previouslyMastered: true,
      },
      {
        conceptId: "new-vocabulary",
        masteryPercent: 30,
        lastStudiedAt: "2026-07-09",
        previouslyMastered: false,
      },
      {
        conceptId: "wood-joints",
        masteryPercent: 97,
        lastStudiedAt: "2026-07-01",
        previouslyMastered: true,
      },
    ],
  });

  assert.deepEqual(
    reviews.map((review) => review.itemId),
    ["fractions", "wood-joints"]
  );
  assert.equal(reviews[0].reason, "mastery-decay");
  assert.equal(reviews[0].priority, "Medium");
  assert.equal(reviews.every((review) => review.id.startsWith("forgotten-")), true);
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
      "long-term-goal",
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
  const learningSource = readFileSync("src/app/dashboard/learning/LegacyLearningDashboard.tsx", "utf8");

  assert.match(todaySource, /name: ""/);
  assert.match(todaySource, /state\.name \? `\$\{getBeastGreeting\(now\)\}, \$\{state\.name\}` : "Today"/);
  assert.doesNotMatch(todaySource, /Loading Today/);
  assert.doesNotMatch(todaySource, /name: "Learner"/);
  assert.match(
    learningSource,
    /name: fallbackName,\s+role: String\(primaryLearnerRow\.learner_role/
  );
  assert.doesNotMatch(
    learningSource,
    /name: String\(primaryLearnerRow\.display_name \|\| fallbackName\)/
  );
  assert.match(learningSource, /href="\/dashboard\/today"[\s\S]*Back to Today/);
  assert.doesNotMatch(learningSource, /href="\/dashboard"[\s\S]*Back to Today/);
});

test("home avoids fallback-name flash while profile resolves", () => {
  const homeSource = readFileSync("src/app/dashboard/page.tsx", "utf8");

  assert.match(homeSource, /name: ""/);
  assert.match(homeSource, /user\.name \? `\$\{getBeastGreeting\(now\)\}, \$\{user\.name\}` : "BeastOS Home"/);
  assert.doesNotMatch(homeSource, /Loading Home/);
  assert.doesNotMatch(homeSource, /Getting your Beast-wide plan ready\./);
  assert.doesNotMatch(homeSource, /name: "Commander"/);
  assert.doesNotMatch(
    homeSource,
    /setUser\(\{ name: getProfileDisplayName\(null, authUser \|\| null\) \}\)/
  );
});

test("home and today navigation render stable route shells during data loading", () => {
  const homeSource = readFileSync("src/app/dashboard/page.tsx", "utf8");
  const todaySource = readFileSync("src/app/dashboard/today/page.tsx", "utf8");
  const calendarSource = readFileSync("src/app/dashboard/calendar/page.tsx", "utf8");

  assert.match(homeSource, /const \[loading, setLoading\] = useState\(true\)/);
  assert.match(todaySource, /const \[loading, setLoading\] = useState\(true\)/);
  assert.match(homeSource, /\{loading \? \(/);
  assert.match(todaySource, /\{loading \? \(/);
  assert.match(todaySource, /title="Keep your education and career direction current"/);
  assert.match(todaySource, /buildEducationPlanningContributions/);
  assert.doesNotMatch(homeSource, /\{loading \|\| !user\.name\s+\?/);
  assert.doesNotMatch(todaySource, /\{loading \|\| !state\.name\s+\?/);
  assert.doesNotMatch(todaySource, /\{loading \? \([\s\S]*?\) : \(\s*<>\s*<section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"/);
  assert.doesNotMatch(homeSource, /Opening your dashboard/);
  assert.doesNotMatch(todaySource, /Opening your dashboard/);
  assert.match(calendarSource, /Loading your calendar/);
  assert.doesNotMatch(calendarSource, /if \(loading\) return/);
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
      "Grade / level is required before BeastEducation can finish setup."
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
  assert.doesNotMatch(dashboardLayout, /Opening BeastEducation\.\.\./);
});

test("dashboard route changes do not force the full-page guard fallback after initial resolve", () => {
  const dashboardLayout = readFileSync(
    "src/app/dashboard/layout.tsx",
    "utf8"
  );

  assert.match(
    dashboardLayout,
    /const \[dashboardGuardResolved, setDashboardGuardResolved\]/
  );
  assert.match(dashboardLayout, /setDashboardGuardResolved\(true\)/);
  assert.match(dashboardLayout, /const shouldShowDashboardGuardFallback =/);
  assert.match(dashboardLayout, /!dashboardGuardResolved/);
  assert.match(
    dashboardLayout,
    /learningOnlyNavigation && isRestrictedForLearningOnlyNavigation\(pathname\)/
  );
});

test("dashboard module navigation uses an exclusive accordion across responsive layouts", () => {
  const dashboardLayout = readFileSync(
    "src/app/dashboard/layout.tsx",
    "utf8"
  );

  assert.match(dashboardLayout, /const \[expandedModule, setExpandedModule\]/);
  assert.match(dashboardLayout, /expandedModule === item\.module/);
  assert.match(dashboardLayout, /setExpandedModule\(activeExpandableModule\)/);
  assert.match(dashboardLayout, /toggleExpandedModule\(current, module\)/);
  assert.doesNotMatch(dashboardLayout, /EXPANDED_MODULES_STORAGE_KEY/);
  assert.doesNotMatch(dashboardLayout, /\[\.\.\.current, activeExpandableModule\]/);
  assert.match(dashboardLayout, /aria-label=\{`\$\{expanded \? "Collapse" : "Expand"\} \$\{item\.label\}`\}/);
  assert.match(dashboardLayout, /aria-controls=\{navGroupId\}/);
  assert.match(dashboardLayout, /controlIdPrefix:\s*"mobile"/);
  assert.match(dashboardLayout, /href=\{item\.href \|\| "#"\}/);
  assert.match(dashboardLayout, /item=\{beastOSNavigation\}/);
  assert.match(dashboardLayout, /aria-label="Life modules"/);
  assert.match(dashboardLayout, /aria-label="Shared platform"/);
  assert.match(dashboardLayout, /aria-label="Owner"/);
  assert.match(dashboardLayout, /grid-rows-\[1fr\]/);
  assert.match(dashboardLayout, /grid-rows-\[0fr\]/);
  assert.match(dashboardLayout, /transition-\[grid-template-rows,opacity\]/);
  assert.match(dashboardLayout, /navigationOnly/);
  assert.doesNotMatch(dashboardLayout, /aria-label="BeastOS modules"/);
});

test("learning activities have a dedicated runner and next-activity unlock logic", () => {
  const activityRunner = readFileSync(
    "src/app/dashboard/learning/activities/[activityId]/page.tsx",
    "utf8"
  );
  const lessonEngine = readFileSync(
    "src/app/dashboard/learning/activities/LessonEngine.tsx",
    "utf8"
  );

  assert.equal(
    getLearningActivityRoute("activity-123"),
    "/dashboard/education/activities/activity-123"
  );
  assert.equal(getLearningActivityPrimaryActionLabel("Quiz"), "Let's see what you remember");
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
  assert.equal(
    getNewestReadyLearningActivity([
      {
        id: "older-ready",
        activity_type: "Lesson",
        title: "Older Ready",
        difficulty: "Beginner",
        estimated_minutes: 15,
        xp: 10,
        status: "Ready",
        sort_order: 1,
        created_at: "2026-07-05T12:00:00.000Z",
      },
      {
        id: "new-generated",
        activity_type: "Lesson",
        title: "Pre-Algebra: Combining Like Terms",
        difficulty: "Beginner",
        estimated_minutes: 35,
        xp: 20,
        status: "Ready",
        sort_order: 9,
        created_at: "2026-07-06T12:00:00.000Z",
      },
    ])?.id,
    "new-generated"
  );
  assert.match(activityRunner, /Guidance Counselor recap/);
  assert.match(activityRunner, /Return to Today/);
  assert.match(activityRunner, /Back to Guidance Counselor/);
  assert.match(activityRunner, /<LessonEngine/);
  assert.match(activityRunner, /getProfileDisplayName/);
  assert.match(activityRunner, /learnerName=\{learnerName\}/);
  assert.match(activityRunner, /receives the outcome back for recap/);
  assert.match(lessonEngine, /Conversation-first learning session/);
  assert.match(lessonEngine, /Active learning conversation/);
  assert.match(lessonEngine, /Guidance Counselor Snapshot/);
  assert.match(lessonEngine, /messageBubbleClasses/);
  assert.match(lessonEngine, /speakerLabel/);
  assert.match(lessonEngine, /buildMentorCheckpoint/);
  assert.match(lessonEngine, /progressLanguage/);
  assert.match(lessonEngine, /saveStatusLabel/);
  assert.match(lessonEngine, /handleReplyKeyDown/);
  assert.match(lessonEngine, /currentConcept/);
  assert.match(lessonEngine, /sticky bottom-0/);
  assert.match(lessonEngine, /conversationScrollRef/);
  assert.match(lessonEngine, /replyInputRef/);
  assert.match(lessonEngine, /responsePendingRef/);
  assert.match(lessonEngine, /isResponding/);
  assert.match(lessonEngine, /container\.scrollTo\(\{/);
  assert.match(lessonEngine, /distanceFromLatest <= 56/);
  assert.match(lessonEngine, /Jump to latest/);
  assert.match(lessonEngine, /focus\(\{ preventScroll: true \}\)/);
  assert.doesNotMatch(lessonEngine, /scrollIntoView/);
  assert.match(lessonEngine, /requestAnimationFrame/);
  assert.match(lessonEngine, /nativeEvent\.isComposing/);
  assert.match(lessonEngine, /event\.shiftKey/);
  assert.match(lessonEngine, /event\.preventDefault/);
  assert.match(lessonEngine, /enterKeyHint="send"/);
  assert.match(lessonEngine, /Hint/);
  assert.match(lessonEngine, /Explain this another way/);
  assert.match(lessonEngine, /Check my understanding/);
  assert.match(lessonEngine, /Finish lesson/);
  assert.match(lessonEngine, /Don't worry about the formula yet/);
  assert.match(lessonEngine, /Walk me through what you're thinking/);
  assert.match(lessonEngine, /Convince me/);
  assert.match(lessonEngine, /getLessonTeacherResponse/);
  assert.match(lessonEngine, /captureEvidence/);
  assert.match(lessonEngine, /sendLearnerMessage/);
  assert.match(lessonEngine, /Ready to finish/);
  assert.match(lessonEngine, /window\.localStorage\.setItem/);
  assert.match(lessonEngine, /window\.localStorage\.removeItem/);
  assert.match(lessonEngine, /progress\.coachingMessage/);
  assert.doesNotMatch(lessonEngine, /Tutor context/);
  assert.doesNotMatch(lessonEngine, /Saved on this device/);
  assert.doesNotMatch(lessonEngine, /Save for Guidance Counselor/);
  assert.doesNotMatch(lessonEngine, /Save this for my Guidance Counselor/);
  assert.doesNotMatch(lessonEngine, /mastery signal/);
  assert.match(lessonEngine, /onPracticeAnswer/);
  assert.doesNotMatch(lessonEngine, /type="checkbox"/);
  assert.doesNotMatch(lessonEngine, /Adaptive Lesson/);
  assert.doesNotMatch(lessonEngine, /Guided Practice/);
  assert.doesNotMatch(lessonEngine, /AI Coach/);
  assert.doesNotMatch(lessonEngine, /Check understanding/);
  assert.doesNotMatch(lessonEngine, /Wrong\./);
  assert.doesNotMatch(lessonEngine, /type TutorStep/);
  assert.doesNotMatch(lessonEngine, /tutorStepTitle/);
  assert.doesNotMatch(lessonEngine, /tutorStepMessage/);
  assert.match(activityRunner, /quizAnswers/);
  assert.match(activityRunner, /practiceAnswers/);
});

test("BeastEducation member home starts with Guidance Counselor before dashboard support", () => {
  const learningPage = readFileSync("src/app/dashboard/learning/LegacyLearningDashboard.tsx", "utf8");
  const recommendation = readFileSync(
    "src/app/dashboard/learning/GuidanceCounselorRecommendation.tsx",
    "utf8"
  );
  const lessonEngine = readFileSync(
    "src/app/dashboard/learning/activities/LessonEngine.tsx",
    "utf8"
  );

  assert.match(learningPage, /function GuidanceCounselorHome/);
  assert.match(learningPage, /buildMentorHomeMission/);
  assert.match(learningPage, /Guidance Counselor/);
  assert.match(learningPage, /LearningGoalDiscovery/);
  assert.match(learningPage, /Add Learning Goal/);
  assert.match(learningPage, /Learning Goals/);
  assert.match(learningPage, /Manage Goals/);
  assert.match(learningPage, /planRows\.find\(\(plan\) => plan\.goal_id === activeGoal\?\.id\)/);
  assert.match(learningPage, /decideAdaptiveProgression/);
  assert.match(learningPage, /adaptiveProgression/);
  assert.match(recommendation, /Current recommendation/);
  assert.match(recommendation, /mission\.missionTitle/);
  assert.match(recommendation, /mission\.recommendationReason/);
  assert.match(recommendation, /mission\.journeyProgressLabel/);
  assert.match(learningPage, /Why this mission/);
  assert.match(learningPage, /Data boundary/);
  assert.match(learningPage, /Other useful recommendations/);
  assert.match(learningPage, /Related actions/);
  assert.doesNotMatch(learningPage, /Progress I am watching/);
  assert.doesNotMatch(learningPage, /learningIntelligence\.memory\.recentlyStudied/);
  assert.doesNotMatch(learningPage, /learningIntelligence\.adaptivePlan\.nextRecommendedLesson/);
  assert.equal(
    learningPage.indexOf("<GuidanceCounselorHome") <
      learningPage.indexOf('id="wins"'),
    true
  );
  assert.doesNotMatch(learningPage, /progressSignals\.snapshotTiles/);
  assert.doesNotMatch(learningPage, /function AITutorCenter/);
  const mentorHome = readFileSync("src/lib/learning/mentorHome.ts", "utf8");
  assert.match(mentorHome, /progressionLabel/);
  assert.match(mentorHome, /withAdaptiveReason/);
  assert.match(mentorHome, /buildLearningJourneys/);
  assert.match(mentorHome, /getActiveJourneySummary/);
  assert.match(mentorHome, /continue, review, remediate, or advance/);
  assert.match(mentorHome, /Skip familiar basics/);
  assert.match(lessonEngine, /Conversation-first learning session/);
});

test("BP-400 keeps teaching implementation preserved but outside Generation 1 navigation", () => {
  const learningPage = readFileSync(
    "src/app/dashboard/learning/LegacyLearningDashboard.tsx",
    "utf8"
  );
  const educationExperience = readFileSync(
    "src/app/dashboard/learning/BeastEducationExperience.tsx",
    "utf8"
  );
  const moduleNavigation = readFileSync("src/lib/moduleNavigation.ts", "utf8");

  assert.match(learningPage, /Everything else stays available/);
  assert.match(educationExperience, /mode === "guidance-counselor"/);
  assert.match(
    moduleNavigation,
    /label: "Guidance Counselor",\s+href: "\/dashboard\/education\/guidance-counselor"/
  );
  assert.doesNotMatch(
    moduleNavigation,
    /label: "Tutor", href: "\/dashboard\/education\/tutor"/
  );
  assert.doesNotMatch(moduleNavigation, /label: "Continue", href: "\/dashboard\/learning\/activities"/);
});

test("authentication presents one permission-aware Beast platform entry point", () => {
  const loginPage = readFileSync("src/app/login/page.tsx", "utf8");
  const dashboardLayout = readFileSync("src/app/dashboard/layout.tsx", "utf8");

  assert.match(loginPage, />\s*BeastOS\s*</);
  assert.match(loginPage, /beastOSPlatformIdentity\.description/);
  assert.match(loginPage, /beastOSApplications\.map/);
  assert.match(loginPage, /beastOSSharedCapabilities\.join/);
  assert.match(loginPage, />\s*Sign In\s*</);
  assert.match(loginPage, />\s*Create Account\s*</);
  assert.match(loginPage, /signInWithOtp/);
  assert.match(loginPage, /shouldCreateUser: intent === "create-account"/);
  assert.match(loginPage, /emailRedirectTo: buildAuthCallbackUrl/);
  assert.match(loginPage, /getSafeAuthDestination/);
  assert.doesNotMatch(loginPage, /BeastEducation|Guidance Counselor/);
  assert.match(dashboardLayout, /select\("role,birthday"\)/);
  assert.match(dashboardLayout, /beast_admin_member_module_access/);
  assert.doesNotMatch(dashboardLayout, /onboarding_complete|onboarding repair/);
  assert.match(
    dashboardLayout,
    /getBeastModuleNavigationForPersona\(\s*isAdminPersona,\s*memberModuleAccess\s*\)/
  );
});

test("BeastEducation member experience hides workflow mechanics behind Guidance Counselor and Tutor language", () => {
  const learningPage = readFileSync("src/app/dashboard/learning/LegacyLearningDashboard.tsx", "utf8");
  const activitiesPage = readFileSync(
    "src/app/dashboard/learning/activities/page.tsx",
    "utf8"
  );
  const activityRunner = readFileSync(
    "src/app/dashboard/learning/activities/[activityId]/page.tsx",
    "utf8"
  );
  const todayPage = readFileSync("src/app/dashboard/today/page.tsx", "utf8");
  const studySessionCard = readFileSync(
    "src/app/dashboard/learning/StudySessionCommandCard.tsx",
    "utf8"
  );
  const memberExperienceSource = [
    learningPage,
    readFileSync(
      "src/app/dashboard/learning/GuidanceCounselorRecommendation.tsx",
      "utf8"
    ),
    activitiesPage,
    activityRunner,
    todayPage,
    studySessionCard,
  ].join("\n");

  assert.match(memberExperienceSource, /Talk with Guidance Counselor/);
  assert.match(memberExperienceSource, /mission\.primaryAction\.label/);
  assert.match(activitiesPage, /redirect\("\/dashboard\/education\/lessons"\)/);
  assert.match(memberExperienceSource, /Your Guidance Counselor/);
  assert.match(memberExperienceSource, /Let&apos;s see what I&apos;ve learned/);
  assert.doesNotMatch(memberExperienceSource, /Your Guidance Counselor's Next Step/);
  assert.doesNotMatch(memberExperienceSource, /Activity Runner/);
  assert.doesNotMatch(memberExperienceSource, /Start Activity/);
  assert.doesNotMatch(memberExperienceSource, /Generate Activity/);
  assert.doesNotMatch(memberExperienceSource, /Mark Started/);
  assert.doesNotMatch(memberExperienceSource, /Mark Complete/);
  assert.doesNotMatch(memberExperienceSource, /activity queue|work queue|Empty Queue/);
  assert.doesNotMatch(memberExperienceSource, /Complete lesson/);
});

test("guided learning sessions keep Guidance Counselor lifecycle Tutor handoff and reflection storage", () => {
  const activityRunner = readFileSync(
    "src/app/dashboard/learning/activities/[activityId]/page.tsx",
    "utf8"
  );
  const lessonEngine = readFileSync(
    "src/app/dashboard/learning/activities/LessonEngine.tsx",
    "utf8"
  );
  const guidedSession = readFileSync("src/lib/learning/guidedSession.ts", "utf8");
  const tutorOrchestration = readFileSync("src/lib/learning/tutorOrchestration.ts", "utf8");
  const reflectionEngine = readFileSync("src/lib/learning/reflectionEngine.ts", "utf8");
  const migration = readFileSync(
    "migrations/20260713_add_learning_session_outcomes.sql",
    "utf8"
  );

  assert.match(activityRunner, /buildGuidedLearningSession/);
  assert.match(activityRunner, /selectMentorTutor/);
  assert.match(activityRunner, /Start guided session/);
  assert.match(activityRunner, /Guidance Counselor recap/);
  assert.match(activityRunner, /Learner reflection/);
  assert.match(activityRunner, /buildLearnerReflectionStorage/);
  assert.match(lessonEngine, /tutorSelection\.handoff/);
  assert.match(lessonEngine, /tutorSelection\.role/);
  assert.match(guidedSession, /not_started/);
  assert.match(guidedSession, /remediation_required/);
  assert.match(guidedSession, /mastery_check_required/);
  assert.match(tutorOrchestration, /General Academic Tutor/);
  assert.match(tutorOrchestration, /Certification Tutor/);
  assert.match(reflectionEngine, /I guessed/);
  assert.match(reflectionEngine, /I'm frustrated/);
  assert.match(migration, /reflection_option/);
  assert.match(migration, /session_next_recommendation/);
});

test("Guidance Counselor-first integration includes confidence timeline memory and weekly review", () => {
  const learningPage = readFileSync("src/app/dashboard/learning/LegacyLearningDashboard.tsx", "utf8");
  const confidence = readFileSync("src/lib/learning/confidenceIntelligence.ts", "utf8");
  const timeline = readFileSync("src/lib/learning/learningTimeline.ts", "utf8");
  const weeklyReview = readFileSync("src/lib/learning/weeklyMentorReview.ts", "utf8");
  const missionControl = readFileSync(
    "src/app/dashboard/learning/LearningMissionControl.tsx",
    "utf8"
  );

  assert.match(learningPage, /buildConfidenceIntelligenceSnapshot/);
  assert.match(learningPage, /buildLearningTimeline/);
  assert.match(learningPage, /buildMentorLearningMemory/);
  assert.match(learningPage, /WeeklyGuidanceReviewPanel/);
  assert.match(learningPage, /Confidence intelligence/);
  assert.match(learningPage, /Counselor context/);
  assert.match(missionControl, /Recent Activity/);
  assert.match(confidence, /Knowledge/);
  assert.match(confidence, /Confidence/);
  assert.match(confidence, /Consistency/);
  assert.match(confidence, /Speed/);
  assert.match(confidence, /Retention/);
  assert.match(confidence, /Speed is not being judged yet/);
  assert.match(timeline, /lesson_completed/);
  assert.match(timeline, /reflection_recorded/);
  assert.match(timeline, /review_scheduled/);
  assert.match(learningPage, /No meaningful achievement is being awarded/);
  assert.match(weeklyReview, /Complete one guided session/);
  assert.doesNotMatch(learningPage, /Leaderboard|leaderboard/);
});

test("generated learning activities persist with required visibility fields", () => {
  const draft = {
    learningObjective: "Pre-Algebra",
    motivation: "Build confidence",
    targetOutcome: "Combine like terms",
    timeline: "2 weeks",
    currentLevel: "Beginner",
    studyPace: "Steady: 3-4 sessions per week",
  };
  const generatedPlan = generateLearningPlan(draft);
  const payload = buildGeneratedLearningActivityPayload({
    userId: "user-1",
    learnerProfileId: "learner-1",
    courseId: "course-1",
    planId: "plan-1",
    sessionId: "session-1",
    draft,
    generatedPlan,
    sortOrder: 7,
  });
  const goalBuilder = readFileSync(
    "src/app/dashboard/learning/LearningGoalBuilder.tsx",
    "utf8"
  );
  const goalDiscovery = readFileSync(
    "src/app/dashboard/learning/LearningGoalDiscovery.tsx",
    "utf8"
  );
  const goalsPage = readFileSync(
    "src/app/dashboard/learning/goals/page.tsx",
    "utf8"
  );
  const goalsManager = readFileSync(
    "src/app/dashboard/learning/goals/LearningGoalsManager.tsx",
    "utf8"
  );
  const learningPage = readFileSync("src/app/dashboard/learning/LegacyLearningDashboard.tsx", "utf8");
  const recommendation = readFileSync(
    "src/app/dashboard/learning/GuidanceCounselorRecommendation.tsx",
    "utf8"
  );
  const todayPage = readFileSync("src/app/dashboard/today/page.tsx", "utf8");
  const activitiesPage = readFileSync(
    "src/app/dashboard/learning/activities/page.tsx",
    "utf8"
  );

  assert.equal(getGeneratedLearningSubject(draft), "Pre-Algebra");
  assert.equal(getGeneratedActivityTitle(draft), "Pre-Algebra: Combining Like Terms");
  assert.deepEqual(
    Object.keys(payload).sort(),
    [
      "activity_type",
      "course_id",
      "difficulty",
      "estimated_minutes",
      "learner_profile_id",
      "plan_id",
      "session_id",
      "sort_order",
      "status",
      "title",
      "user_id",
      "xp",
    ].sort()
  );
  assert.equal(payload.user_id, "user-1");
  assert.equal(payload.learner_profile_id, "learner-1");
  assert.equal(payload.course_id, "course-1");
  assert.equal(payload.status, "Ready");
  assert.equal(payload.activity_type, "Lesson");
  assert.equal(goalBuilder.includes(".from(\"learning_activities\")"), true);
  assert.equal(goalBuilder.includes("buildGeneratedLearningActivityPayload"), true);
  assert.equal(goalBuilder.includes("Start Saved Activity"), true);
  assert.equal(goalDiscovery.includes("What would you like to learn?"), true);
  assert.equal(goalDiscovery.includes("suggestedCategories"), true);
  assert.equal(goalDiscovery.includes("K-12"), true);
  assert.equal(goalDiscovery.includes("Certifications"), true);
  assert.equal(goalDiscovery.includes("Technology"), true);
  assert.equal(goalDiscovery.includes("Business"), true);
  assert.equal(goalDiscovery.includes("Languages"), true);
  assert.equal(goalDiscovery.includes("Science"), true);
  assert.equal(goalDiscovery.includes("History"), true);
  assert.equal(goalDiscovery.includes("Arts"), true);
  assert.equal(goalDiscovery.includes("Personal Development"), true);
  assert.equal(goalDiscovery.includes("buildGoalDraft"), true);
  assert.equal(goalDiscovery.includes("generateLearningPlan"), true);
  assert.equal(goalDiscovery.includes("buildGeneratedLearningActivityPayload"), true);
  assert.equal(goalDiscovery.includes(".from(\"learning_goals\")"), true);
  assert.equal(goalDiscovery.includes(".from(\"learning_courses\")"), true);
  assert.equal(goalDiscovery.includes(".from(\"learning_plans\")"), true);
  assert.equal(goalDiscovery.includes(".from(\"learning_sessions\")"), true);
  assert.equal(goalDiscovery.includes(".from(\"learning_activities\")"), true);
  assert.equal(goalDiscovery.includes("Great choice. I will build your learning plan"), true);
  assert.equal(goalDiscovery.includes("Start Placement"), true);
  assert.equal(goalsPage.includes('title="Goals"'), true);
  assert.equal(goalsPage.includes("LearningGoalDiscovery"), true);
  assert.equal(goalsPage.includes("LearningGoalsManager"), true);
  assert.equal(goalsManager.includes("Archive Goal"), true);
  assert.equal(goalsManager.includes("Restore Goal"), true);
  assert.equal(goalsManager.includes("Resume Goal"), true);
  assert.equal(goalsManager.includes("Switch Active Goal"), true);
  assert.equal(goalsManager.includes("Progress stays saved"), true);
  assert.equal(goalsManager.includes('status: "Paused"'), true);
  assert.equal(todayPage.includes("getNewestReadyLearningActivity"), false);
  assert.equal(activitiesPage.includes("redirect(\"/dashboard/education/lessons\")"), true);
  assert.equal(recommendation.includes("mission.primaryAction.label"), true);
  assert.equal(learningPage.includes("learning_activities"), true);
});

test("Today excludes the legacy learning mission engine", () => {
  const todayPage = readFileSync("src/app/dashboard/today/page.tsx", "utf8");
  const completedOnly = [
    {
      id: "old-completed",
      activity_type: "Lesson",
      title: "Old completed activity",
      difficulty: "Beginner",
      estimated_minutes: 15,
      xp: 10,
      status: "Completed",
      sort_order: 1,
      completed_at: "2026-07-06T12:00:00.000Z",
    },
  ];
  const newestReady = getNewestReadyLearningActivity([
    {
      id: "old-completed",
      activity_type: "Lesson",
      title: "Old completed activity",
      difficulty: "Beginner",
      estimated_minutes: 15,
      xp: 10,
      status: "Completed",
      sort_order: 1,
      completed_at: "2026-07-06T12:00:00.000Z",
    },
    {
      id: "older-ready",
      activity_type: "Lesson",
      title: "Older ready",
      difficulty: "Beginner",
      estimated_minutes: 15,
      xp: 10,
      status: "Ready",
      sort_order: 2,
      created_at: "2026-07-06T12:00:00.000Z",
    },
    {
      id: "new-ready",
      activity_type: "Lesson",
      title: "Pre-Algebra: Combining Like Terms",
      difficulty: "Beginner",
      estimated_minutes: 35,
      xp: 20,
      status: "Ready",
      sort_order: 3,
      created_at: "2026-07-07T12:00:00.000Z",
    },
  ]);
  const continuity = buildLearningActivityContinuityState({
    completedActivityId: "old-ready",
    now: new Date("2026-07-07T13:00:00.000Z"),
    activities: [
      {
        id: "old-ready",
        activity_type: "Lesson",
        title: "Old ready",
        difficulty: "Beginner",
        estimated_minutes: 15,
        xp: 10,
        status: "Ready",
        sort_order: 1,
        created_at: "2026-07-06T12:00:00.000Z",
      },
      {
        id: "next-queued",
        activity_type: "Practice",
        title: "Next queued",
        difficulty: "Beginner",
        estimated_minutes: 15,
        xp: 10,
        status: "Queued",
        sort_order: 2,
        created_at: "2026-07-07T12:00:00.000Z",
      },
    ],
  });

  assert.equal(getNewestReadyLearningActivity(completedOnly), null);
  assert.equal(newestReady?.id, "new-ready");
  assert.equal(continuity.completedActivityId, "old-ready");
  assert.equal(continuity.nextQueuedActivityId, "next-queued");
  assert.equal(continuity.queueExhausted, false);
  assert.equal(continuity.continuityBasis.includes("preserves queue order"), true);
  assert.equal(todayPage.includes("async function generateNextActivity"), false);
  assert.equal(todayPage.includes(".from(\"learning_activities\")"), false);
  assert.equal(todayPage.includes(".insert("), false);
  assert.equal(todayPage.includes("onClick={generateNextActivity}"), false);
  assert.equal(todayPage.includes("onClick={loadToday} className=\"beast-button\""), false);
  assert.equal(todayPage.includes("getLearningActivityTitleForCourse"), false);
  assert.equal(todayPage.includes("first teaching moment"), false);
  assert.equal(todayPage.includes("activityList.map"), false);
  assert.equal(todayPage.includes("Education planning"), true);
});

test("lesson engine supports the adaptive BeastEducation teaching cycle", () => {
  const quizEngine = buildLessonEngineDefinition({
    activity_type: "Quiz",
    title: "Pre-Algebra: Combining Like Terms",
    difficulty: "Beginner",
  });
  const coachEngine = buildLessonEngineDefinition({
    activity_type: "AI Tutor Challenge",
    title: "Explain a subnetting step",
    difficulty: "Adaptive",
  });
  const quizAnswers = Object.fromEntries(
    quizEngine.lesson.quizQuestions.map((question) => [question.id, question.answer])
  );
  const practiceAnswers = Object.fromEntries(
    quizEngine.lesson.guidedPractice.map((practice) => [
      practice.id,
      practice.expectedAnswer,
    ])
  );
  const progress = getLessonEngineProgress({
    checkedPhases: {
      assessment: true,
      lesson: true,
      practice: true,
      quiz: true,
      coach: true,
      reflection: true,
      mastery: true,
      recommendation: true,
    },
    phaseCount: quizEngine.phases.length,
    reflection: "Like terms have the same variable part.",
    confidence: "Ready for more",
    quizAnswers,
    practiceAnswers,
    lesson: quizEngine.lesson,
  });
  const quizScore = getQuizScore({
    questions: quizEngine.lesson.quizQuestions,
    quizAnswers,
  });
  const practiceScore = getGuidedPracticeScore({
    practice: quizEngine.lesson.guidedPractice,
    practiceAnswers,
  });
  const correctVisual = getTeachingVisualSelectionFeedback({
    lesson: quizEngine.lesson,
    selectedTermIds: ["term-4x", "term-2x"],
  });
  const incorrectVisual = getTeachingVisualSelectionFeedback({
    lesson: quizEngine.lesson,
    selectedTermIds: ["term-4x", "term-7"],
  });
  const teacherResponse = getLessonTeacherResponse({
    lesson: quizEngine.lesson,
    question: "Why can't I combine 4x and 7?",
    quizPercent: 50,
    masteryEstimate: 60,
  });
  const scopedResponse = getLessonTeacherResponse({
    lesson: quizEngine.lesson,
    question: "Can we discuss my budget?",
    quizPercent: 100,
    masteryEstimate: 100,
  });

  assert.deepEqual(
    quizEngine.phases.map((phase) => phase.label),
    [
      "Assessment",
      "Lesson",
      "Practice with support",
      "Check-in",
      "Tutor help",
      "Reflection",
      "Understanding",
      "Next step",
    ]
  );
  assert.equal(quizEngine.lesson.id, combiningLikeTermsLesson.id);
  assert.equal(quizEngine.lesson.interactiveVisual.expression, "4x + 7 + 2x + 3");
  assert.equal(quizEngine.lesson.learningObjective.includes("same variable part"), true);
  assert.equal(quizEngine.lesson.masteryThreshold, 80);
  assert.equal(quizEngine.completionLabel, "Show what you remember");
  assert.deepEqual(
    quizEngine.completionCriteria.map((criterion) => criterion.id),
    [
      "phases-reviewed",
      "guided-practice-attempted",
      "quiz-answered",
      "reflection-captured",
      "mastery-reviewed",
    ]
  );
  assert.equal(quizScore.percent, 100);
  assert.equal(practiceScore.percent, 100);
  assert.equal(isPracticeAnswerCorrect(quizEngine.lesson.guidedPractice[0], "8x"), true);
  assert.equal(correctVisual.correct, true);
  assert.equal(incorrectVisual.correct, false);
  assert.equal(teacherResponse.includes("correct grouping"), true);
  assert.match(teacherResponse, /Close/);
  assert.match(teacherResponse, /trips up almost everyone/);
  assert.match(teacherResponse, /phone/);
  assert.equal(scopedResponse, quizEngine.lesson.explanation);
  assert.equal(
    coachEngine.lesson.aiCoachingPrompts.some((prompt) => prompt.kind === "mistake"),
    true
  );
  assert.equal(coachEngine.summary.includes("assessment, practice, quiz results"), true);
  assert.equal(progress.readyToComplete, true);
  assert.deepEqual(progress.completionReviewReasons, []);
  assert.deepEqual(
    progress.assessmentSignals.map((signal) => signal.id),
    ["quiz", "guided-practice", "confidence", "phase-progress"]
  );
  assert.equal(progress.assessmentSignals[0].weight, 0.45);
  assert.equal(progress.masteryAssumptions.some((assumption) => assumption.includes("not an accredited assessment")), true);
  assert.equal(progress.continuity.currentActivityStatus, "ready_to_complete");
  assert.equal(progress.continuity.nextActivityBasis, "recommend_next_lesson");
  assert.equal(progress.continuity.handoffSummary.includes("quiz 100%"), true);
  assert.equal(progress.mastered, true);
  assert.equal(progress.recommendedReview, false);
  assert.equal(progress.percent, 100);
  assert.equal(progress.practiceCorrect, quizEngine.lesson.guidedPractice.length);
  assert.equal(progress.nextRecommendation, "Solving one-step equations");

  const incompleteProgress = getLessonEngineProgress({
    checkedPhases: { assessment: true, lesson: true },
    phaseCount: quizEngine.phases.length,
    reflection: "",
    confidence: "Still building",
    quizAnswers: {},
    practiceAnswers: {},
    lesson: quizEngine.lesson,
  });

  assert.equal(incompleteProgress.readyToComplete, false);
  assert.equal(incompleteProgress.recommendedReview, true);
  assert.equal(incompleteProgress.continuity.currentActivityStatus, "in_progress");
  assert.equal(incompleteProgress.continuity.nextActivityBasis, "recommend_review");
  assert.equal(
    incompleteProgress.completionReviewReasons.includes("Try each practice step."),
    true
  );
  assert.equal(
    incompleteProgress.completionReviewReasons.includes("Write one reflection."),
    true
  );
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
