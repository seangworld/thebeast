import type { Dossier, StaffRecordKind } from './types';
export const staffGroups: readonly {kind:StaffRecordKind;label:string;description:string}[] = [
 {kind:'staff',label:'Actual staff',description:'Named specialists and governed development agents. Status is lifecycle, not verified availability.'},
 {kind:'planned',label:'Planned positions & prototypes',description:'Planned positions, historical policy records and backburner prototypes.'},
 {kind:'system',label:'Supporting systems & workflow roles',description:'Automation, governance and contract roles; not additional operational staff.'},
 {kind:'external',label:'External assistants',description:'Owner operating roles; not deployed BeastOS agents.'},
];
export function formatStaffDate(date:string|null|undefined) {
 if(!date)return 'Not yet evaluated';
 const match=/^(\d{4})-(\d{2})-(\d{2})(?:$|T)/.exec(date);
 return match?`${match[2]}/${match[3]}/${match[1]}`:'Date not recorded';
}
export function currentLevelLabel(d:Pick<Dossier,'demonstrated'|'lastEvaluatedAt'|'recordKind'|'competency'>) {
 if(d.recordKind!=='staff')return 'Not graded';
 if(d.demonstrated)return d.demonstrated;
 return d.competency?.status==='insufficient'||d.lastEvaluatedAt ? 'Evidence insufficient for level' : 'Not yet evaluated';
}
export function targetLevelLabel(d:Pick<Dossier,'target'|'recordKind'>) {return d.recordKind!=='staff'?'Not applicable':d.target||'Requirement not established';}
export function competencyEvidenceLabel(d:Pick<Dossier,'recordKind'|'competency'>) {
 if(d.recordKind!=='staff')return 'Outside staff competency grading';
 if(!d.competency)return 'No retained evaluation';
 return `${d.competency.status==='mapped'?'Historical evidence':'Framework evidence'} ${formatStaffDate(d.competency.evidenceDate)} · current competence unverified`;
}
export function releasedLevelLabel(d:Pick<Dossier,'released'|'recordKind'>) {
 return d.recordKind!=='staff'?'Not graded':d.released||'No competency certification';
}
