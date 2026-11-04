import { redirect } from 'next/navigation';
import { createAsyncRouteClient } from '@/lib/supabase/server';
import { buildAuthLoginPath, getSafeAuthDestination, isDisabledBeastUser } from '@/lib/auth/experience';
import ProfilePage from '@/app/dashboard/settings/profile/page';

export const dynamic = 'force-dynamic';
export default async function AccountSetupPage({searchParams}: {searchParams?: Promise<{next?: string}>}) {
  const destination = getSafeAuthDestination((await searchParams)?.next);
  const client = await createAsyncRouteClient();
  const {data: {user}, error} = await client.auth.getUser();
  if (error || !user || isDisabledBeastUser(user)) redirect(buildAuthLoginPath(destination));
  const control = await client.rpc('is_current_beast_session_allowed');
  if(control.error || control.data !== true) redirect(buildAuthLoginPath(destination, 'session_expired'));
  return <div><section className="beast-container space-y-4 py-8">
    <h1 className="text-3xl font-black">Finish your Beast account</h1>
    <p>Verify your email, select your permanent login username, then review your name and birthday in your existing profile. Your birthday keeps the existing age restrictions accurate.</p>
    <p>Email status: <strong>{user.email_confirmed_at ? 'Verified' : 'Verification required'}</strong></p>
    <a href="#account-username" className="beast-button-secondary inline-flex">Choose or confirm username</a>
    <p>Existing usernames and saved records remain unchanged.</p>
    <a href={destination} className="beast-button inline-flex">Continue to your requested application</a>
    <p className="text-sm">If anything is incomplete, Continue brings you back here to finish it.</p>
  </section><ProfilePage /></div>;
}
