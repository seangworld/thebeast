'use client';
import { useId, useRef, useState, type FormEvent } from 'react';
import { createClient } from '@/lib/supabase/client';

export function UsernameClaim() {
  const id = useId();
  const submitting = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
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
      if (response.ok) form.reset();
    } catch { setMessage('Unable to claim this username. Please try again.'); }
    finally { submitting.current = false; setBusy(false); }
  }
  return <section id="account-username" className="beast-card p-5" aria-label="Beast login username">
    <h2 className="text-lg font-black">Claim your Beast username</h2>
    <p className="mt-2 text-sm leading-6 text-[#9da9b9]">Sign in with your existing email first, then claim one permanent login username. Your account and saved information stay with the same identity. Your editable profile name is separate.</p>
    <form onSubmit={claim} className="mt-4" aria-busy={busy}>
      <label htmlFor={id} className="text-sm font-bold">Login username</label>
      <input id={id} name="username" className="beast-input mt-2 min-h-[48px]" required minLength={3} maxLength={32} pattern="[A-Za-z][A-Za-z0-9_]{2,31}" autoComplete="username" autoCapitalize="none" spellCheck={false} />
      <button type="submit" disabled={busy} className="beast-button mt-4 min-h-[48px] disabled:opacity-60">{busy ? 'Claiming…' : 'Claim username'}</button>
    </form>
    <p role="status" aria-live="polite" className="mt-3 text-sm">{message}</p>
  </section>;
}
