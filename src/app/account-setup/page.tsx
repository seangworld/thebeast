import LogoutButton from '@/app/components/LogoutButton';
import { redirect } from 'next/navigation';
import { createAsyncRouteClient } from '@/lib/supabase/server';
import { buildAuthLoginPath, isDisabledBeastUser } from '@/lib/auth/experience';
import {accountSetupReturn} from '@/lib/auth/accountSetup';
import ProfilePage from '@/app/dashboard/settings/profile/page';

export const dynamic = 'force-dynamic';
export default async function AccountSetupPage({searchParams}: {searchParams?: Promise<{next?: string;app?: string;registration?: string}>}) {
  const params = await searchParams;
  const target=accountSetupReturn(params?.app,params?.next);
  const destination=target.loginDestination;
  const client = await createAsyncRouteClient();
  const {data: {user}, error} = await client.auth.getUser();
  if (error || !user || isDisabledBeastUser(user)) redirect(buildAuthLoginPath(destination));
  const control = await client.rpc('is_current_beast_session_allowed');
  if(control.error || control.data !== true) redirect(buildAuthLoginPath(destination, 'session_expired'));
  return <div><section className="beast-container space-y-4 py-8">
    <h1 className="text-3xl font-black">Finish your Beast account</h1>
    {(params?.registration === 'complete' || params?.next?.includes('registration=complete')) && user.email_confirmed_at && <p role="status">Registration succeeded. Your email is verified.</p>}
    <p>You will return to <strong>{target.name}</strong> after setup.</p>
    <p>Verify your email, select your permanent login username, then review your name and birthday in your existing profile. Your birthday keeps the existing age restrictions accurate.</p>
    <p>Email status: <strong>{user.email_confirmed_at ? 'Verified' : 'Verification required'}</strong></p>
    <a href="#account-username" className="beast-button-secondary inline-flex">Choose or confirm username</a>
    <p>The same Beast account works across supported Beast applications. Existing usernames and saved records remain unchanged.</p>
    <nav aria-label="Account help" className="flex flex-wrap gap-4"><a href="/forgot-username">Forgot username?</a><a href="/forgot-password">Forgot password?</a><a href="/login-help">Need help signing in?</a><a href="mailto:seang@seangworld.com">Contact support</a></nav>
    <a href={target.href} className="beast-button inline-flex">Continue to {target.name}</a>
    <p className="text-sm">If anything is incomplete, the application will ask you to finish setup.</p>
  </section><div className="beast-container py-4"><LogoutButton /></div><ProfilePage /></div>;
}
