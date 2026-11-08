'use client';
import {useEffect, useId, useState} from 'react';
import {USERNAME_REQUIREMENTS} from '../../../lib/auth/accountSetup';
import {normalizeUsername} from '../../../lib/auth/universal/policy';

export function UsernameField({checkAvailability=false,label="Username"}: {checkAvailability?:boolean;label?:string}) {
  const id=useId();
  const [value,setValue]=useState(''),[notice,setNotice]=useState('');
  const valid=Boolean(normalizeUsername(value)) && !/\s/.test(value);
  useEffect(()=>{
    setNotice('');
    if(!checkAvailability || !valid)return;
    const controller=new AbortController();
    const timer=setTimeout(()=>{
      setNotice('Checking availability…');
      void fetch('/api/auth/universal',{method:'POST',credentials:'same-origin',signal:controller.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'availability',username:value})})
        .then(async response=>{const result=await response.json();if(!controller.signal.aborted)setNotice(typeof result.message==='string'?result.message:'Availability could not be checked.');})
        .catch(()=>{if(!controller.signal.aborted)setNotice('Availability could not be checked. Try again when you submit.');});
    },600);
    return ()=>{clearTimeout(timer);controller.abort();};
  },[value,valid,checkAvailability]);
  return <div><label htmlFor={id} className="text-sm font-bold">{label} <span aria-hidden="true" className="text-red-400">*</span></label>
    <input aria-label={label} id={id} name="username" className="beast-input mt-2 min-h-[48px]" autoComplete="username" autoCapitalize="none" spellCheck={false} required minLength={3} maxLength={32} pattern="[A-Za-z][A-Za-z0-9_]{2,31}" aria-describedby={`${id}-rules ${id}-status`} aria-invalid={value.length>0&&!valid} onInput={event=>setValue(event.currentTarget.value)} />
    <p id={`${id}-rules`} className="mt-2 text-sm text-[#9da9b9]">{USERNAME_REQUIREMENTS}</p>
    <p id={`${id}-status`} aria-live="polite" className="mt-2 text-sm">{value&&!valid?(value.includes('@')?'Email addresses cannot be used as usernames. Choose a username using the rules above.':'Enter a valid username using the rules above.'):notice}</p>
  </div>;
}
