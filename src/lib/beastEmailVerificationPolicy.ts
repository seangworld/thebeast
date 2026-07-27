export const BEAST_VERIFICATION_REMINDER_SUBJECT =
  "Verify your Beast account email";

export const BEAST_VERIFICATION_REMINDER_BODY =
  "Your Beast account email has not been verified yet. Please use the verification link sent to your login email. Verification helps protect your account and may be required before certain account features become available.";

export const BEAST_VERIFICATION_REMINDER_MESSAGE =
  `${BEAST_VERIFICATION_REMINDER_SUBJECT}\n\n${BEAST_VERIFICATION_REMINDER_BODY}`;

export type BeastEmailVerificationFeatureClass =
  | "essential"
  | "allowed_before_verification"
  | "verification_required";

export type BeastEmailVerificationPolicyItem = {
  key: string;
  label: string;
  featureClass: BeastEmailVerificationFeatureClass;
  reason: string;
};

export const beastEmailVerificationPolicy: {
  restrictionEnforced: boolean;
  exceptionPolicyApproved: boolean;
  essential: BeastEmailVerificationPolicyItem[];
  allowedBeforeVerification: BeastEmailVerificationPolicyItem[];
  verificationRequired: BeastEmailVerificationPolicyItem[];
} = {
  restrictionEnforced: false,
  exceptionPolicyApproved: false,
  essential: [
    {
      key: "authentication",
      label: "Sign in and sign out",
      featureClass: "essential",
      reason: "Members must be able to enter and leave their account safely.",
    },
    {
      key: "account_settings",
      label: "Account settings",
      featureClass: "essential",
      reason: "Members need access to verification status and account recovery.",
    },
    {
      key: "verification_help",
      label: "Verification help",
      featureClass: "essential",
      reason: "Verification cannot be completed if help is restricted.",
    },
    {
      key: "private_admin_messaging",
      label: "Private Admin messaging",
      featureClass: "essential",
      reason: "Members must retain a private support path.",
    },
    {
      key: "privacy_and_support",
      label: "Privacy and support",
      featureClass: "essential",
      reason: "Privacy controls and support remain available to every account.",
    },
  ],
  allowedBeforeVerification: [
    {
      key: "current_beast_experience",
      label: "Current Beast experience",
      featureClass: "allowed_before_verification",
      reason:
        "No feature-specific verification restriction has been approved by the product owner.",
    },
  ],
  verificationRequired: [],
};

export type BeastEmailVerificationAccessDecision = {
  allowed: boolean;
  featureClass: BeastEmailVerificationFeatureClass;
  title: string;
  explanation: string;
  verificationPath: string;
  adminSupportPath: string;
};

export function getBeastEmailVerificationAccessImpact(verified: boolean) {
  if (verified) return "No verification-related access impact.";
  return beastEmailVerificationPolicy.restrictionEnforced
    ? "Approved verification rules apply by feature. Essential access remains available."
    : "No current restriction. Essential access and the current Beast experience remain available.";
}

export function buildBeastEmailVerificationAccessDecision(options: {
  featureKey: string;
  featureLabel: string;
  verified: boolean;
}): BeastEmailVerificationAccessDecision {
  const required = beastEmailVerificationPolicy.verificationRequired.find(
    (item) => item.key === options.featureKey
  );
  const essential = beastEmailVerificationPolicy.essential.find(
    (item) => item.key === options.featureKey
  );
  const featureClass: BeastEmailVerificationFeatureClass = essential
    ? "essential"
    : required
      ? "verification_required"
      : "allowed_before_verification";
  const restricted =
    !options.verified &&
    beastEmailVerificationPolicy.restrictionEnforced &&
    Boolean(required);

  return {
    allowed: !restricted,
    featureClass,
    title: restricted
      ? `${options.featureLabel} requires a verified login email`
      : `${options.featureLabel} is available`,
    explanation: restricted
      ? `${required?.reason || "Verified identity is required for this feature."} Use the official verification email to continue. A private Admin message does not verify an email.`
      : options.verified
        ? "The account login email is verified."
        : "This feature is not restricted by the current owner-approved verification policy.",
    verificationPath: "/dashboard/settings/profile",
    adminSupportPath: "/dashboard/messages",
  };
}

export function canCreateBeastEmailVerificationException(
  policyKey: string
) {
  return (
    beastEmailVerificationPolicy.exceptionPolicyApproved &&
    beastEmailVerificationPolicy.verificationRequired.some(
      (item) => item.key === policyKey
    )
  );
}
