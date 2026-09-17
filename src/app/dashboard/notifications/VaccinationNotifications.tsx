"use client";
import { useEffect,useState } from 'react';
import type { HealthRecord } from '@/lib/health/foundation';
import { VaccinationReminders } from '../health/VaccinationReminders';
export function VaccinationNotifications() {
  const [records,setRecords]=useState<HealthRecord[]>([]);
  const [unavailable,setUnavailable]=useState(false);
  useEffect(()=>{
    const controller=new AbortController();
    void (async()=>{
      try {
        const response=await fetch('/api/health/reminders',{credentials:'same-origin',cache:'no-store',signal:controller.signal});
        if([401,403,428].includes(response.status)) return;
        if(!response.ok) throw new Error('Unavailable');
        const payload=await response.json();
        if(!Array.isArray(payload.records)) throw new Error('Invalid reminder data');
        setRecords(payload.records);
      } catch {if(!controller.signal.aborted) setUnavailable(true);}
    })();
    return ()=>controller.abort();
  },[]);
  return unavailable?<p role="status" className="text-sm text-slate-300">Vaccination reminders are temporarily unavailable. Check your saved dates in BeastHealth.</p>:<VaccinationReminders records={records}/>;
}
