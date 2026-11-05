'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import {UsernameField} from './UsernameField';
import { createClient } from '@/lib/supabase/client';

export function UsernameClaim() {
  const submitting = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [verified, setVerified] = useState(false);
  useEffect(() => { let active = true; const client = createClient();
    void (async () => { try {
      const before = await client.auth.getUser();
      if (before.error || !before.data.user) throw Error();
      const result = await client.rpc('beast_auth_current_username');
      const after = await client.auth.getUser();
      if (!active || before.data.user.id !== after.data.user?.id) return;
      if (result.error) throw result.error;
      setSelected(typeof result.data === 'string' ? result.data : null);setVerified(Boolean(before.data.user.email_confirmed_at));setLoaded(true);
      if(before.data.user.email_confirmed_at&&result.data&&process.env.NEXT_PUBLIC_BEAST_USERNAME_MAIL_ENABLED==='true')void fetch('/api/auth/username-mail',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'deliver'})}).catch(()=>{});
    } catch {if(active)setMessage('Your current login username could not be loaded. Reload before choosing one.')} })();
    return () => {active=false};
  }, []);
  async function claim(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const form = event.currentTarget;
    const username = new FormData(form).get('username');
    submitting.current = true; setBusy(true); setMessage('');
    try {
      const auth = createClient().auth;
      const current = await auth.getUser();
      if (current.error || !current.data.user?.email_confirmed_at) {
        setMessage('Sign in with a verified email before claiming a username.'); return;
      }
      const subject = current.data.user.id;
      const response = await fetch('/api/auth/universal', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'claim', username, expectedSubject: subject }) });
      const result = await response.json();
      const latest = await auth.getUser();
      if (latest.error || latest.data.user?.id !== subject) { setMessage('Your account changed. Sign in again before continuing.'); return; }
      setMessage(typeof result.message === 'string' ? result.message : 'Unable to claim this username.');
      if (response.ok && typeof result.username === 'string') {setSelected(result.username);setVerified(true);form.reset();if(process.env.NEXT_PUBLIC_BEAST_USERNAME_MAIL_ENABLED==='true')void fetch('/api/auth/username-mail',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'deliver'})}).catch(()=>{})}
    } catch { setMessage('Unable to claim this username. Please try again.'); }
    finally { submitting.current = false; setBusy(false); }
  }
  return <section id="account-username" className="beast-card p-5" aria-label="Beast login username">
    <h2 className="text-lg font-black">{selected ? 'Your Beast username' : 'Choose your Beast username'}</h2>
    {selected && <p className="mt-3">Login username: <strong>{selected}</strong> · {verified ? 'Email verified' : 'Email verification required'}</p>}
    <p className="mt-2 text-sm leading-6 text-[#9da9b9]">Sign in with your existing email first, then claim one permanent login username. Your account and saved information stay with the same identity. Your editable profile name is separate.</p>
    {loaded && !selected && <form method="post" onSubmit={claim} className="mt-4" aria-busy={busy}>
      <UsernameField checkAvailability label="Login username" />
      <button type="submit" disabled={busy} className="beast-button mt-4 min-h-[48px] disabled:opacity-60">{busy ? 'Claiming…' : 'Claim username'}</button>
    </form>}
    <p role="status" aria-live="polite" className="mt-3 text-sm">{message}</p>
  </section>;
}
