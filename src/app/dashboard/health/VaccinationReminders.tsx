"use client";
import Link from 'next/link';
import type { HealthRecord } from '@/lib/health/foundation';
import { localHealthDate, vaccinationReminders } from '@/lib/health/vaccinationReminders';
export function VaccinationReminders({records,today=localHealthDate()}:{records:readonly HealthRecord[];today?:string}) {
  const reminders=vaccinationReminders(records,today);
  if(!reminders.length) return null;
  return <section className="rounded-xl border border-amber-300/25 bg-amber-950/10 p-4" aria-label="Vaccination reminders"><h2 className="font-bold">Recorded vaccination dates to review</h2><p className="mt-1 text-sm text-slate-300">Past recorded dates and the next 30 days. These dates are not a clinical recommendation.</p><ul className="mt-3 space-y-2">{reminders.map(item=><li key={item.id} className="text-sm"><strong>{item.name}</strong> · {item.date} · {item.state==='past'?'Past recorded date':item.state==='today'?'Recorded date is today':'Upcoming'} · Source: {item.source}</li>)}</ul><Link className="beast-button-secondary mt-3 inline-flex" href="/dashboard/health/vaccinations">Review dates and calendar reminders</Link></section>;
}
