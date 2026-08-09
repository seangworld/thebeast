import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  BEAST_INVITATION_COOKIE,
  buildAuthLoginPath,
  getSafeAuthDestination,
  isPasswordSignInEnabled,
} from "@/lib/auth/experience";
import AcceptInvitationForm from "./AcceptInvitationForm";

export default async function AcceptInvitationPage({
  searchParams,
}: {
  searchParams?: Promise<{ next?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const destination = getSafeAuthDestination(resolvedSearchParams?.next);
  const invitationAuthorized =
    (await cookies()).get(BEAST_INVITATION_COOKIE)?.value === "authorized";

  if (!invitationAuthorized) {
    redirect(buildAuthLoginPath(destination, "invalid_or_expired_link"));
  }

  return (
    <AcceptInvitationForm
      destination={destination}
      passwordEnabled={isPasswordSignInEnabled(
        process.env.NEXT_PUBLIC_BEAST_PASSWORD_SIGN_IN_ENABLED
      )}
    />
  );
}
