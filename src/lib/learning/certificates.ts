import type { LearningCertificate } from "./types";

export function generateLearningCertificateId({
  learnerName,
  pathName,
  completionDate,
}: {
  learnerName: string;
  pathName: string;
  completionDate: string;
}) {
  const slug = `${learnerName}-${pathName}-${completionDate}`
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 42);

  return `BLC-${slug}`;
}

export const mockLearningCertificates: LearningCertificate[] = [
  {
    id: "security-foundations-certificate",
    learnerName: "Current learner",
    pathName: "Security+ Foundations",
    completionDate: "2026-07-03",
    certificateId: generateLearningCertificateId({
      learnerName: "Current learner",
      pathName: "Security+ Foundations",
      completionDate: "2026-07-03",
    }),
    certificateTitle: "Beast Academy Certificate",
    skillsDemonstrated: [
      "Identity verification",
      "Authentication factors",
      "Role-based access control",
    ],
    completionRecordId: "completion-security-foundations-2026-07-03",
    portfolioEntryId: "portfolio-security-foundations-2026-07-03",
    language:
      "Beast Academy Certificate of completion for an internal BeastLearning path. This is non-accredited and does not represent institutional credit.",
    verificationPlaceholder:
      "Verification confirms certificate ownership, demonstrated skills, and completion details.",
  },
];
