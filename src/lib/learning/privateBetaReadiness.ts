import type { LearningPrivateBetaReadiness } from "./types";

export function buildBeastEducationPrivateBetaReadiness(): LearningPrivateBetaReadiness {
  return {
    version: "v1.1 Private Beta",
    milestone: "Private beta stabilization and Personal Hub alignment",
    capabilitiesVerified: [
      "Learner entry surfaces and dashboard status remain available.",
      "Today mission generation connects learners to ready activities.",
      "Lesson runner supports assessment, teaching, guided practice, quiz, coaching, reflection, mastery review, and next recommendation.",
      "AI tutor behavior follows guided-reasoning, uncertainty, safety, and age-appropriate boundaries.",
      "Feedback, timeline, certificate, and beta evidence surfaces remain documented for private beta review.",
    ],
    personalHubReferences: [
      {
        id: "education-goals",
        label: "Education goals",
        personalHubSource: "Personal Hub goals",
        moduleAccess: "permissioned_reference",
        duplicateStorageAllowed: false,
        deletionBehavior: "Remove Learning references when the Personal Hub goal is deleted.",
        aiAccessRule: "Use only when the learner grants Learning AI context access.",
      },
      {
        id: "career-goals",
        label: "Career goals",
        personalHubSource: "Personal Hub goals",
        moduleAccess: "permissioned_reference",
        duplicateStorageAllowed: false,
        deletionBehavior: "Detach career path recommendations from deleted Personal Hub goals.",
        aiAccessRule: "Use as career context, not as a standalone Learning-owned goal.",
      },
      {
        id: "certification-goals",
        label: "Certification goals",
        personalHubSource: "Personal Hub goals",
        moduleAccess: "permissioned_reference",
        duplicateStorageAllowed: false,
        deletionBehavior: "Keep completed Learning activity history, but remove the deleted goal reference.",
        aiAccessRule: "Use certification context only for permissioned recommendations.",
      },
      {
        id: "learning-preferences",
        label: "Learning preferences",
        personalHubSource: "Personal Hub preferences",
        moduleAccess: "permissioned_reference",
        duplicateStorageAllowed: false,
        deletionBehavior: "Revert to Learning defaults when Personal Hub preferences are removed.",
        aiAccessRule: "Use for tone, pacing, and explanation style only.",
      },
      {
        id: "accessibility-preferences",
        label: "Accessibility preferences",
        personalHubSource: "Personal Hub preferences",
        moduleAccess: "permissioned_reference",
        duplicateStorageAllowed: false,
        deletionBehavior: "Stop applying removed accommodations immediately.",
        aiAccessRule: "Use to adapt presentation, not to infer sensitive traits.",
      },
      {
        id: "records-and-certificates",
        label: "Records and certificates",
        personalHubSource: "Personal Hub documents",
        moduleAccess: "permissioned_reference",
        duplicateStorageAllowed: false,
        deletionBehavior: "Warn before deleting records referenced by Learning milestones.",
        aiAccessRule: "AI may summarize only documents explicitly enabled for Learning.",
      },
    ],
    guardianBoundaries: [
      {
        id: "invitation-required",
        rule: "Guardian visibility requires an explicit household or learner invitation.",
        required: true,
      },
      {
        id: "consent-required",
        rule: "Guardian access requires owner-approved consent and may not be inferred from a learner profile.",
        required: true,
      },
      {
        id: "private-notes-hidden",
        rule: "Learner private notes remain hidden unless the learner explicitly shares them.",
        required: true,
      },
      {
        id: "revocation-stops-access",
        rule: "Revoked guardian access stops future visibility.",
        required: true,
      },
    ],
    accessPolicy: {
      essentialLearnerAccess: "free",
      proBoundaryStatus: "requires_decision",
      notes: [
        "Core learner access remains mostly free for private beta.",
        "Pro packaging, classroom access, and paid AI expansion require later owner approval.",
      ],
    },
    safetyPrivacyAccessibilityReview: [
      "Safety language avoids guaranteed outcomes and directs uncertain cases to review.",
      "Privacy language treats Personal Hub data as permissioned references only.",
      "Accessibility preferences are referenced without storing duplicate sensitive data.",
      "Mobile readiness remains a private beta smoke-check item, not a public guarantee.",
    ],
    seangworldPublishingGuardrails: [
      "Do not claim full curriculum coverage.",
      "Do not claim school compliance.",
      "Do not claim teacher portal availability.",
      "Do not market paid Pro boundaries until owner-approved.",
    ],
    excludedClaims: [
      "Full K-12 curriculum",
      "Teacher portal",
      "School compliance",
      "Guaranteed grades",
      "Production classroom deployment",
    ],
  };
}
