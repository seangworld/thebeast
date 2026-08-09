import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  BEAST_PASSWORD_RECOVERY_COOKIE,
  buildAuthLoginPath,
  getSafeAuthDestination,
  isPasswordSignInEnabled,
} from "@/lib/auth/experience";
import ResetPasswordForm from "./ResetPasswordForm";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string; state?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const destination = getSafeAuthDestination(resolvedSearchParams?.next);

  if (
    !isPasswordSignInEnabled(
      process.env.NEXT_PUBLIC_BEAST_PASSWORD_SIGN_IN_ENABLED
    )
  ) {
    redirect(buildAuthLoginPath(destination));
  }

  const recoveryAuthorized =
    (await cookies()).get(BEAST_PASSWORD_RECOVERY_COOKIE)?.value === "authorized";
  const failureState =
    resolvedSearchParams?.state === "authentication_error"
      ? "authentication_error"
      : resolvedSearchParams?.state === "invalid_or_expired_link"
        ? "invalid_or_expired_link"
        : null;

  return (
    <ResetPasswordForm
      destination={destination}
      recoveryAuthorized={recoveryAuthorized}
      failureState={failureState}
    />
  );
}
