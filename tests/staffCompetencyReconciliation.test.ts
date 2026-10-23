import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {staffDossiers,getStaffDossier} from '../src/lib/staffDossiers';
import {currentLevelLabel,targetLevelLabel,competencyEvidenceLabel} from '../src/lib/staffDossiers/presentation';

test('all actual staff have explicit evidence decisions, separate targets/dates and role-specific gaps',()=>{
 const actual=staffDossiers.filter(d=>d.recordKind==='staff');assert.equal(actual.length,11);
 assert.equal(actual.filter(d=>d.demonstrated).length,5);assert.equal(actual.filter(d=>d.competency?.status==='insufficient').length,6);
 assert.equal(new Set(actual.map(d=>d.competency!.auditPriority)).size,11);
 for(const d of actual){
  assert.ok(d.competency);assert.ok(d.target);assert.ok(d.targetRequirement);assert.ok(d.levelMapping?.rationale);assert.ok(d.competency!.evidenceDate);
  assert.ok(d.competency!.scope.length>30);assert.ok(d.competency!.missingEvidence[0].length>50);assert.match(d.competency!.currentVerification,/unverified|not reverified/);
  assert.doesNotMatch(currentLevelLabel(d),/pending|Unassessed/);assert.ok(d.deferred[0].cost.includes('Cost unknown'));assert.equal(d.released,null);
  if(d.competency!.status==='mapped'){assert.ok(d.demonstrated);assert.equal(d.lastEvaluatedAt,d.competency!.evidenceDate);assert.match(competencyEvidenceLabel(d),/Historical evidence/);}
  else {assert.equal(d.demonstrated,null);assert.equal(d.lastEvaluatedAt,null);assert.equal(d.latestAssessment?.date,'2026-08-30');assert.equal(currentLevelLabel(d),'Evidence insufficient for level');}
 }
});
test('historical teaching credit and VA sample do not certify current behavior or transfer a Health grade',()=>{
 const tutor=getStaffDossier('tutor')!;assert.equal(tutor.demonstrated,'L2');assert.equal(tutor.lastEvaluatedAt,'2026-08-30');assert.match(tutor.levelMapping!.rationale,/independently of its Knight classification and 7\/7 count/);assert.match(tutor.competency!.missingEvidence.join(' '),/per-turn/);
 const health=getStaffDossier('health-advisor')!;assert.equal(health.demonstrated,'L3');const va=health.competency!.specializations![0];assert.equal(va.demonstrated,'L2');assert.equal(va.target,'L3');assert.match(va.scope,/One historical H-C/);assert.match(va.currentVerification,/unverified/);
 assert.equal(getStaffDossier('VA Claims Aide')!.id,health.id);
});
test('nonstaff are excluded, and genuinely unevaluated staff display an explicit status',()=>{
 for(const d of staffDossiers.filter(d=>d.recordKind!=='staff')){assert.equal(d.competency,undefined);assert.equal(currentLevelLabel(d),'Not graded');assert.equal(targetLevelLabel(d),'Not applicable');}
 const unevaluated={...getStaffDossier('tutor')!,demonstrated:null,lastEvaluatedAt:null,competency:undefined};assert.equal(currentLevelLabel(unevaluated),'Not yet evaluated');
 assert.equal(getStaffDossier('product_specialist'),undefined);assert.equal(staffDossiers.length,29);
});
test('primary views separate historical/current claims and keep evidence disclosure and audit priority accessible',()=>{
 for(const f of ['StaffRoster.tsx','StaffDossierDetail.tsx']){const s=readFileSync('src/app/dashboard/operations/staff/'+f,'utf8');assert.match(s,/competencyEvidenceLabel/);assert.doesNotMatch(s,/Level mapping pending/);}
 const detail=readFileSync('src/app/dashboard/operations/staff/StaffDossierDetail.tsx','utf8');assert.match(detail,/Last evaluated:/);assert.match(detail,/Dossier updated:/);assert.match(detail,/Latest retained assessment/);assert.match(detail,/specializations/);
 const roster=readFileSync('src/app/dashboard/operations/staff/StaffRoster.tsx','utf8');assert.match(roster,/Next audits, in priority order/);
 assert.equal(getStaffDossier('reviewer-agent')!.competency!.auditPriority,1);
});
