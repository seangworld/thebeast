'use client';
import { useId, useRef, useState, type FormEvent } from 'react';

/** Shared username flow; credentials go only to the same-origin server gateway. */
export function UniversalAuth({ action = 'login', getCaptchaToken, onSignedIn, recoveryHref = '/forgot-password' }: {
  action?: 'login' | 'register';
  getCaptchaToken?: () => Promise<string>;
  onSignedIn: () => void;
  recoveryHref?: string;
}) {
  const id = useId();
  const submitting = useRef(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [registered, setRegistered] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const form = event.currentTarget;
    const fields = new FormData(form);
    submitting.current = true;
    setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/auth/universal', {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, username: fields.get('username'), email: fields.get('email'), password: fields.get('password'), captchaToken: await getCaptchaToken?.() }),
      });
      const result = await response.json();
      setMessage(typeof result.message === 'string' ? result.message : 'Authentication is temporarily unavailable.');
      if (response.ok) {
        form.reset();
        if (action === 'login') onSignedIn();
        else setRegistered(true);
      }
    } catch { setMessage('Authentication is temporarily unavailable.'); }
    finally { submitting.current = false; setBusy(false); }
  }
  return <section aria-label={action === 'register' ? 'Register a Beast username' : 'Sign in with a Beast username'} className="mt-5 text-left">
    {!registered && <form onSubmit={submit} className="space-y-4" aria-busy={busy}>
      <div><label htmlFor={`${id}-username`} className="text-sm font-bold">Username</label>
        <input id={`${id}-username`} className="beast-input mt-2 min-h-[48px]" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required minLength={3} maxLength={32} pattern="[A-Za-z][A-Za-z0-9_]{2,31}" aria-describedby={`${id}-hint`} /></div>
      <p id={`${id}-hint`} className="text-xs leading-5 text-[#9da9b9]">3–32 letters, numbers or underscores; start with a letter. Usernames are case-insensitive.</p>
      {action === 'register' && <div><label htmlFor={`${id}-email`} className="text-sm font-bold">Email address</label>
        <input id={`${id}-email`} className="beast-input mt-2 min-h-[48px]" name="email" type="email" autoComplete="email" required maxLength={254} /></div>}
      <div><label htmlFor={`${id}-password`} className="text-sm font-bold">Password</label>
        <input id={`${id}-password`} className="beast-input mt-2 min-h-[48px]" name="password" type="password" autoComplete={action === 'login' ? 'current-password' : 'new-password'} required minLength={action === 'register' ? 12 : 1} maxLength={action === 'register' ? 72 : 128} /></div>
      {action === 'register' && <p className="text-xs leading-5 text-[#9da9b9]">Use 12–72 characters with a letter and a number. Verify your email once, then sign in with your username and password.</p>}
      <button disabled={busy} className="beast-button min-h-[48px] w-full disabled:opacity-60" type="submit">{busy ? 'Please wait…' : action === 'login' ? 'Sign in with username' : 'Create Beast account'}</button>
    </form>}
    <p role="status" aria-live="polite" className="mt-3 text-sm leading-6 text-[#c7cfdb]">{message}</p>
    {action === 'login' && <a className="mt-3 inline-flex min-h-11 items-center text-sm font-bold text-[#7dd3fc]" href={recoveryHref}>Forgot password?</a>}
  </section>;
}
