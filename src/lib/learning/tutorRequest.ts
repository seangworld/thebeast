import type { LearningImageAttachment } from "./types";

export const tutorProfessionalId = "beasteducation.tutor" as const;
export const maximumTutorImageBytes = 3 * 1024 * 1024;
export const tutorResponseHeaders = { "Cache-Control": "private, no-store" } as const;
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

type TutorProfileEvidence = {
  accountBirthday?: string | null;
  learningBirthday?: string | null;
  focus?: string | null;
  learningStyle?: string | null;
  preferredPace?: string | null;
};

function boundedText(value: string | null | undefined, fallback: string) {
  const clean = value?.replace(/\s+/g, " ").trim().slice(0, 100);
  return clean || fallback;
}

function ageBand(birthday: string | null | undefined, today = new Date()) {
  if (!birthday || !/^\d{4}-\d{2}-\d{2}$/.test(birthday)) return "age not provided";
  const born = new Date(`${birthday}T00:00:00Z`);
  if (Number.isNaN(born.getTime()) || born > today) return "age not provided";
  let age = today.getUTCFullYear() - born.getUTCFullYear();
  const beforeBirthday = today.getUTCMonth() < born.getUTCMonth()
    || (today.getUTCMonth() === born.getUTCMonth() && today.getUTCDate() < born.getUTCDate());
  if (beforeBirthday) age -= 1;
  if (age < 13) return "child learner";
  if (age < 18) return "teen learner";
  return "adult learner";
}

export function buildTutorLearnerContext(evidence: TutorProfileEvidence, today = new Date()) {
  const birthday = evidence.learningBirthday || evidence.accountBirthday;
  return {
    profile: `Learner (${ageBand(birthday, today)}; learning focus: ${boundedText(evidence.focus, "not provided")})`,
    learningStyle: boundedText(evidence.learningStyle, "adapt through short explanations and checks for understanding"),
    preferredPace: boundedText(evidence.preferredPace, "not provided"),
  };
}

export function requireAuthenticatedTutorMember(userId: string | null | undefined) {
  if (!userId) throw new Error("Authentication required.");
  return userId;
}

export function validateTutorImageAttachment(value: unknown): LearningImageAttachment | undefined {
  if (value == null) return undefined;
  if (!value || typeof value !== "object") throw new Error("The homework image is invalid.");
  const attachment = value as Record<string, unknown>;
  const dataUrl = typeof attachment.dataUrl === "string" ? attachment.dataUrl : "";
  const fileName = typeof attachment.fileName === "string" ? attachment.fileName.trim().slice(0, 120) : "homework image";
  const mediaType = typeof attachment.mediaType === "string" ? attachment.mediaType : "";
  if (!allowedImageTypes.has(mediaType) || !dataUrl.startsWith(`data:${mediaType};base64,`)) {
    throw new Error("Use a JPEG, PNG, or WebP homework image.");
  }
  const encoded = dataUrl.slice(dataUrl.indexOf(",") + 1);
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) throw new Error("The homework image is not valid base64 data.");
  const padding = encoded.endsWith("==") ? 2 : encoded.endsWith("=") ? 1 : 0;
  const decodedBytes = Math.floor((encoded.length * 3) / 4) - padding;
  if (!encoded || decodedBytes > maximumTutorImageBytes) throw new Error("Homework images must be 3 MB or smaller.");
  return { dataUrl, fileName: fileName || "homework image", mediaType: mediaType as LearningImageAttachment["mediaType"] };
}

export function buildPersistedTutorAnswer(text: string, attachmentName?: string) {
  return { kind: "tutor_answer" as const, text, attachmentName: attachmentName || null };
}
