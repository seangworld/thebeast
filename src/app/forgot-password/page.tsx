import { redirect } from "next/navigation";
import {
  buildAuthLoginPath,
  getSafeAuthDestination,
  isPasswordSignInEnabled,
} from "@/lib/auth/experience";
import ForgotPasswordForm from "./ForgotPasswordForm";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string }>;
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

  return <ForgotPasswordForm destination={destination} />;
}
