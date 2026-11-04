'use client';
import {useEffect,useState} from 'react';
import {createClient} from '@/lib/supabase/client';
export function RegistrationConfirmation(){
 const [complete,setComplete]=useState(false);
 useEffect(()=>{let active=true;const location=new URL(window.location.href);if(location.searchParams.get('registration')!=='complete')return;
  void createClient().auth.getUser().then(({data,error})=>{if(!active||error||!data.user?.email_confirmed_at||window.location.href!==location.href)return;setComplete(true);location.searchParams.delete('registration');window.history.replaceState({},'',location.pathname+location.search+location.hash)}).catch(()=>{});
  return ()=>{active=false};
 },[]);
 return complete?<p role="status" className="beast-card m-4 p-4">Registration succeeded. Your Beast account is verified.</p>:null;
}
