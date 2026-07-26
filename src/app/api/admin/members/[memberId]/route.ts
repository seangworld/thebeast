import { NextResponse } from "next/server";
import {
  isProtectedBeastAdminAccount,
  normalizeBeastAdminMemberEditRequest,
  wouldRemoveFinalBeastOwner,
  type BeastAdminEditableAccountStatus,
  type BeastAdminMemberEditResult,
} from "@/lib/beastAdminMemberEditing";
import {
  buildEmailVerificationCallbackUrl,
  getEmailWorkflowErrorMessage,
} from "@/lib/auth/emailWorkflows";
import { createAdminClient } from "@/lib/supabase/admin";
import { createRouteClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: {
    memberId: string;
  };
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function getAccountStatus(user: {
  deleted_at?: string;
  banned_until?: string;
  invited_at?: string;
  last_sign_in_at?: string;
}): "active" | "invited" | "suspended" | "deleted" {
  if (user.deleted_at) return "deleted";
  if (
    user.banned_until &&
    new Date(user.banned_until).getTime() > Date.now()
  ) {
    return "suspended";
  }
  if (user.invited_at && !user.last_sign_in_at) return "invited";
  return "active";
}

function isDuplicateEmailError(error: unknown) {
  const value =
    error && typeof error === "object"
      ? (error as { code?: unknown; message?: unknown })
      : {};
  return (
    value.code === "email_exists" ||
    /email.*(?:exists|registered|duplicate|unique)/i.test(
      String(value.message || "")
    )
  );
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const routeClient = createRouteClient();
  const {
    data: { user: actor },
    error: authenticationError,
  } = await routeClient.auth.getUser();

  if (authenticationError || !actor) {
    return jsonError("Authentication required.", 401);
  }

  const { data: actorProfile, error: actorProfileError } = await routeClient
    .from("profiles")
    .select("role")
    .eq("id", actor.id)
    .maybeSingle();

  if (actorProfileError) {
    return jsonError("BeastAdmin could not verify owner access.", 503);
  }
  if (actorProfile?.role !== "admin") {
    return jsonError("BeastAdmin owner access required.", 403);
  }

  let requestBody: unknown;
  try {
    requestBody = await request.json();
  } catch {
    return jsonError("The account update request is not valid JSON.", 400);
  }

  const edit = normalizeBeastAdminMemberEditRequest(requestBody);
  if (!edit) {
    return jsonError("Review the account fields and try again.", 400);
  }

  const adminClient = createAdminClient();
  if (!adminClient) {
    return jsonError(
      "Server-side Auth administration is not configured.",
      503
    );
  }

  const { data: targetAuthData, error: targetAuthError } =
    await adminClient.auth.admin.getUserById(params.memberId);
  const targetAuthUser = targetAuthData?.user;

  if (targetAuthError || !targetAuthUser) {
    return jsonError("The selected Auth account is not available.", 404);
  }

  const { data: targetProfile, error: targetProfileError } = await adminClient
    .from("profiles")
    .select("id,role,display_name,account_kind")
    .eq("id", params.memberId)
    .maybeSingle();

  if (targetProfileError) {
    return jsonError("The member profile could not be verified.", 503);
  }
  if (!targetProfile) {
    return jsonError(
      "This Auth account has no public profile and cannot be edited safely.",
      409
    );
  }

  if (
    isProtectedBeastAdminAccount({
      accountKind: targetProfile.account_kind,
      appMetadata: targetAuthUser.app_metadata,
    })
  ) {
    return jsonError("System and demo accounts are protected from editing.", 403);
  }

  const currentStatus = getAccountStatus(targetAuthUser);
  const isPendingInvitation = Boolean(
    targetAuthUser.invited_at && !targetAuthUser.last_sign_in_at
  );
  if (currentStatus === "deleted") {
    return jsonError("Deleted Auth accounts cannot be edited.", 409);
  }
  if (edit.accountStatus === "invited" && !isPendingInvitation) {
    return jsonError(
      "Invited status can only be completed by the member accepting the invitation.",
      400
    );
  }
  if (isPendingInvitation && edit.accountStatus !== currentStatus) {
    return jsonError(
      "A pending invitation keeps its current Auth status until the member signs in.",
      400
    );
  }

  const currentEmail = targetAuthUser.email?.trim().toLowerCase() || "";
  if (!currentEmail) {
    return jsonError(
      "This account has no existing Auth email. Add-email recovery is not supported by this editor.",
      409
    );
  }
  const emailChanged = edit.email !== currentEmail;
  if (emailChanged && !edit.confirmEmailChange) {
    return jsonError(
      "Confirm that the member's sign-in email will change before saving.",
      409
    );
  }

  const { count: adminCount, error: adminCountError } = await adminClient
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");

  if (adminCountError || adminCount === null) {
    return jsonError("The final-owner safety check could not be completed.", 503);
  }
  if (
    wouldRemoveFinalBeastOwner({
      currentRole: targetProfile.role,
      nextRole: edit.role,
      nextStatus: edit.accountStatus,
      adminCount,
    })
  ) {
    return jsonError(
      "The final Beast owner cannot be demoted or suspended.",
      409
    );
  }

  if (edit.betaFlagIds.length) {
    const { data: ownedFlags, error: ownedFlagsError } = await adminClient
      .from("beast_admin_feature_flags")
      .select("id")
      .eq("owner_id", actor.id)
      .in("id", edit.betaFlagIds);

    if (
      ownedFlagsError ||
      (ownedFlags || []).length !== edit.betaFlagIds.length
    ) {
      return jsonError("One or more beta assignments are not available.", 400);
    }
  }

  const [moduleAccessResult, betaAssignmentResult] = await Promise.all([
    adminClient
      .from("beast_admin_member_module_access")
      .select("module_id,enabled")
      .eq("member_id", params.memberId),
    adminClient
      .from("beast_admin_feature_flag_assignments")
      .select("flag_id")
      .eq("owner_id", actor.id)
      .eq("scope_type", "member")
      .eq("member_id", params.memberId)
      .eq("stage", "beta"),
  ]);
  if (moduleAccessResult.error || betaAssignmentResult.error) {
    return jsonError(
      "BeastAdmin could not capture the current access state for the immutable audit log.",
      503
    );
  }
  const currentModuleAccess = (moduleAccessResult.data || [])
    .filter((entry) => entry.enabled)
    .map((entry) => entry.module_id)
    .sort();
  const currentBetaFlagIds = (betaAssignmentResult.data || [])
    .map((entry) => entry.flag_id)
    .sort();

  const nextStatus = edit.accountStatus as BeastAdminEditableAccountStatus;
  const statusChanged = nextStatus !== currentStatus;
  const authUpdates: {
    email?: string;
    email_confirm?: boolean;
    ban_duration?: string;
  } = {};

  if (emailChanged) {
    authUpdates.email = edit.email;
    authUpdates.email_confirm = false;
  }
  if (nextStatus === "suspended" && currentStatus !== "suspended") {
    authUpdates.ban_duration = "876000h";
  } else if (nextStatus === "active" && currentStatus === "suspended") {
    authUpdates.ban_duration = "none";
  }

  let authWasUpdated = false;
  let updatedAuthUser = targetAuthUser;

  if (Object.keys(authUpdates).length) {
    const { data, error } = await adminClient.auth.admin.updateUserById(
      params.memberId,
      authUpdates
    );
    if (error) {
      return isDuplicateEmailError(error)
        ? jsonError(
            "That email is already used by another Auth account. No changes were saved.",
            409
          )
        : jsonError(
            "Supabase Auth could not update this account. No profile changes were saved.",
            502
          );
    }

    authWasUpdated = true;
    updatedAuthUser = data.user;
  }

  if (emailChanged) {
    const verificationRedirect = buildEmailVerificationCallbackUrl(
      new URL(request.url).origin,
      process.env.NEXT_PUBLIC_BEAST_SITE_URL
    );
    const { error: verificationError } = await adminClient.auth.resend({
      type: "signup",
      email: edit.email,
      options: { emailRedirectTo: verificationRedirect },
    });

    if (verificationError) {
      const { error: rollbackError } =
        await adminClient.auth.admin.updateUserById(params.memberId, {
          email: currentEmail,
          email_confirm: Boolean(targetAuthUser.email_confirmed_at),
        });
      if (rollbackError) {
        return jsonError(
          "The verification email failed and the Auth email rollback also failed. Inspect this account before retrying.",
          500
        );
      }

      return jsonError(
        `${getEmailWorkflowErrorMessage(
          verificationError
        )} The original Auth email was restored.`,
        502
      );
    }
  }

  const emailReverificationRequired =
    emailChanged && !updatedAuthUser.email_confirmed_at;
  const authChangeSummary = {
    email: {
      changed: emailChanged,
      before: currentEmail,
      after: edit.email,
      reverificationRequired: emailReverificationRequired,
    },
    accountStatus: {
      changed: statusChanged,
      before: currentStatus,
      after: nextStatus,
    },
    moduleAccess: {
      before: currentModuleAccess,
      after: [...edit.moduleAccess].sort(),
    },
    betaAssignments: {
      before: currentBetaFlagIds,
      after: [...edit.betaFlagIds].sort(),
    },
  };

  const { data: databaseUpdate, error: databaseError } =
    await adminClient.rpc("update_beast_admin_member_account", {
      selected_member_id: params.memberId,
      selected_display_name: edit.displayName,
      selected_role: edit.role,
      selected_account_status: nextStatus,
      selected_module_ids: edit.moduleAccess,
      selected_beta_flag_ids: edit.betaFlagIds,
      auth_change_summary: authChangeSummary,
      selected_actor_id: actor.id,
    });

  if (databaseError) {
    if (authWasUpdated) {
      const rollback: {
        email?: string;
        email_confirm?: boolean;
        ban_duration?: string;
      } = {};
      if (emailChanged) {
        rollback.email = currentEmail;
        rollback.email_confirm = Boolean(targetAuthUser.email_confirmed_at);
      }
      if (statusChanged) {
        rollback.ban_duration =
          currentStatus === "suspended" ? "876000h" : "none";
      }
      const { error: rollbackError } =
        await adminClient.auth.admin.updateUserById(params.memberId, rollback);
      if (rollbackError) {
        return jsonError(
          "The profile update failed and Auth rollback also failed. Inspect this account before retrying.",
          500
        );
      }
    }

    if (/final Beast owner/i.test(databaseError.message)) {
      return jsonError(
        "The final Beast owner cannot be demoted or suspended.",
        409
      );
    }
    if (/Protected accounts/i.test(databaseError.message)) {
      return jsonError("System and demo accounts are protected from editing.", 403);
    }

    return jsonError(
      "The account update could not be completed. Auth changes were rolled back.",
      500
    );
  }

  const auditEventId =
    databaseUpdate &&
    typeof databaseUpdate === "object" &&
    !Array.isArray(databaseUpdate) &&
    "auditEventId" in databaseUpdate
      ? String(databaseUpdate.auditEventId)
      : "";

  if (!auditEventId) {
    return jsonError(
      "The account changed, but BeastAdmin could not verify its audit event.",
      500
    );
  }

  const result: BeastAdminMemberEditResult = {
    memberId: params.memberId,
    emailChanged,
    emailReverificationRequired,
    auditEventId,
    message: emailReverificationRequired
      ? "Account saved. The member must verify the new email before using it to sign in."
      : "Account saved and audit event recorded.",
  };

  return NextResponse.json(result, {
    headers: { "Cache-Control": "no-store" },
  });
}
