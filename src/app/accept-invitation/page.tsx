import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  BEAST_INVITATION_COOKIE,
  buildAuthLoginPath,
  getSafeAuthDestination,
  isPasswordSignInEnabled,
} from "@/lib/auth/experience";
import AcceptInvitationForm from "./AcceptInvitationForm";

export default function AcceptInvitationPage({
  searchParams,
}: {
  searchParams?: { next?: string };
}) {
  const destination = getSafeAuthDestination(searchParams?.next);
  const invitationAuthorized =
    cookies().get(BEAST_INVITATION_COOKIE)?.value === "authorized";

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
