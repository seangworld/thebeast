import { redirect } from "next/navigation";
import {
  buildAuthLoginPath,
  getSafeAuthDestination,
  isPasswordSignInEnabled,
} from "@/lib/auth/experience";
import ForgotPasswordForm from "./ForgotPasswordForm";

export default function ForgotPasswordPage({
  searchParams,
}: {
  searchParams?: { next?: string };
}) {
  const destination = getSafeAuthDestination(searchParams?.next);

  if (
    !isPasswordSignInEnabled(
      process.env.NEXT_PUBLIC_BEAST_PASSWORD_SIGN_IN_ENABLED
    )
  ) {
    redirect(buildAuthLoginPath(destination));
  }

  return <ForgotPasswordForm destination={destination} />;
}
