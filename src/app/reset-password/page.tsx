import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  BEAST_PASSWORD_RECOVERY_COOKIE,
  buildAuthLoginPath,
  getSafeAuthDestination,
  isPasswordSignInEnabled,
} from "@/lib/auth/experience";
import ResetPasswordForm from "./ResetPasswordForm";

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams?: { next?: string; state?: string };
}) {
  const destination = getSafeAuthDestination(searchParams?.next);

  if (
    !isPasswordSignInEnabled(
      process.env.NEXT_PUBLIC_BEAST_PASSWORD_SIGN_IN_ENABLED
    )
  ) {
    redirect(buildAuthLoginPath(destination));
  }

  const recoveryAuthorized =
    cookies().get(BEAST_PASSWORD_RECOVERY_COOKIE)?.value === "authorized";
  const failureState =
    searchParams?.state === "authentication_error"
      ? "authentication_error"
      : searchParams?.state === "invalid_or_expired_link"
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
