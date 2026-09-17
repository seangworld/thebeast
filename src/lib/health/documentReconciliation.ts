import type { HealthRecord } from './foundation';
const kinds: Record<string,string> = {diagnosis:'condition',condition:'condition',medication:'medication',procedure:'procedure',vaccination:'procedure',provider:'provider',facility:'provider',appointment:'appointment',lab_value:'vital',allergy:'profile',instruction:'profile',date:'profile'};
export function healthDocumentMatches(category:string, title:string, records:readonly HealthRecord[]) {
  const name=title.toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
  return records.filter(r=>r.status!=='archived' && r.recordType===kinds[category]).sort((a,b)=>Number(b.title.toLowerCase()===name)-Number(a.title.toLowerCase()===name));
}
