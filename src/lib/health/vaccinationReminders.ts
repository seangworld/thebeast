import type { HealthRecord } from './foundation';
import { isVaccination, vaccinationDraft, validDate } from './vaccinations';
export function localHealthDate(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
}
export function vaccinationReminders(records: readonly HealthRecord[], today: string) {
  if (!validDate(today)) return [];
  const horizon = new Date(`${today}T00:00:00Z`); horizon.setUTCDate(horizon.getUTCDate()+30);
  const end = horizon.toISOString().slice(0,10);
  return records.filter(r=>r.status!=='archived' && isVaccination(r)).flatMap(record=>{
    const item = vaccinationDraft(record);
    if(!validDate(item.dueOn) || item.dueOn>end) return [];
    return [{id:record.id,name:item.name,date:item.dueOn,source:item.dueSource || 'unknown',state:item.dueOn<today?'past' as const:item.dueOn===today?'today' as const:'upcoming' as const}];
  }).sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id));
}
/** Minimal private all-day reminder; contains no vaccine names or record notes. */
export function vaccinationCalendar(record: HealthRecord, now = new Date()) {
  const item=vaccinationDraft(record);
  if(record.status==='archived' || !isVaccination(record) || !validDate(item.dueOn)) throw new Error('A saved valid next-dose date is required.');
  const end=new Date(`${item.dueOn}T00:00:00Z`); end.setUTCDate(end.getUTCDate()+1);
  const id=record.id.replace(/[^a-zA-Z0-9-]/g,'');
  if(!id) throw new Error('A saved record is required.');
  const stamp=now.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//BeastHealth//Reminders//EN','CALSCALE:GREGORIAN','BEGIN:VEVENT',`UID:bh-${id}@seangworld.com`,`DTSTAMP:${stamp}`,`DTSTART;VALUE=DATE:${item.dueOn.replace(/-/g,'')}`,`DTEND;VALUE=DATE:${end.toISOString().slice(0,10).replace(/-/g,'')}`,'SUMMARY:BeastHealth vaccination reminder','CLASS:PRIVATE','TRANSP:TRANSPARENT','DESCRIPTION:Review your recorded next-dose date with your provider.','URL:https://thebeast.seangworld.com/dashboard/health/vaccinations'];
  for(const trigger of ['-P7D','PT0S']) lines.push('BEGIN:VALARM',`TRIGGER:${trigger}`,'ACTION:DISPLAY','DESCRIPTION:Review your BeastHealth vaccination record.','END:VALARM');
  lines.push('END:VEVENT','END:VCALENDAR');
  return lines.map(line=>line.match(/.{1,74}/g)?.join('\r\n ')||'').join('\r\n')+'\r\n';
}
