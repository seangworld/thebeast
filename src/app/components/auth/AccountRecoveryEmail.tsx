'use client';
import {useEffect, useRef, useState, type FormEvent} from 'react';
import {createClient} from '@/lib/supabase/client';
import {buildAuthCallbackUrl,buildRegistrationCallbackUrl} from '@/lib/auth/experience';

export function AccountRecoveryEmail({kind,destination='/dashboard/today'}: {kind:'username'|'verification';destination?:string}) {
  const [message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  const [ready,setReady]=useState(false);useEffect(()=>setReady(true),[]);
  const lock=useRef(false),lastRequest=useRef(0);
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(lock.current)return;
    if(Date.now()-lastRequest.current<60000){setMessage('Wait one minute before requesting another email.');return}
    const email=String(new FormData(event.currentTarget).get('email')||'').trim();
    lock.current=true;setBusy(true);
    try{
      const client=createClient();
      const callback=kind==='username'?buildAuthCallbackUrl(window.location.origin,'/dashboard/settings/profile#account-username'):buildRegistrationCallbackUrl(window.location.origin,destination);
      if(kind==='username')await client.auth.signInWithOtp({email,options:{shouldCreateUser:false,emailRedirectTo:callback}});
      else await client.auth.resend({type:'signup',email,options:{emailRedirectTo:callback}});
      // Deliberately identical for existing, unknown, unverified and rate-limited accounts.
      lastRequest.current=Date.now();
      setMessage('If this address can receive an account email, check your inbox and spam folder. No new account has been created.');
    }catch{setMessage('The request could not be sent. Check your connection and try again.')}
    finally{lock.current=false;setBusy(false)}
  }
  return <form method="post" onSubmit={submit} className="space-y-4" aria-busy={busy}>
    <label className="block">Registered email address<input name="email" type="email" autoComplete="email" maxLength={254} required className="beast-input mt-2 min-h-12" /></label>
    <button disabled={busy||!ready} className="beast-button min-h-12" type="submit">{busy?'Requesting…':kind==='username'?'Send username recovery link':'Resend verification email'}</button>
    <p role="status" aria-live="polite">{message}</p>
  </form>;
}
