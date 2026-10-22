import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import {staffDossiers,getStaffDossier,filterStaffDossiers} from '../src/lib/staffDossiers';
import {digitalProfessionals} from '../src/lib/digitalStaff';
import {developmentAgentProfiles} from '../src/lib/developmentAgentProfiles';

test('one canonical dossier per real profile; VA is Taylor specialization, scouts and contract roles remain distinct',()=>{
 assert.equal(new Set(staffDossiers.map(x=>x.id)).size,staffDossiers.length);
 for(const p of digitalProfessionals)assert.equal(getStaffDossier(p.canonicalId)?.name,p.name);
 for(const p of developmentAgentProfiles)assert.ok(getStaffDossier('beastfusion.'+p.id));
 assert.equal(getStaffDossier('VA Claims Aide')?.id,'beasthealth.health-advisor');
 assert.equal(staffDossiers.filter(d=>d.name==='Source Scout').length,1);
 assert.equal(getStaffDossier('news.source-scout')?.lifecycle,'paused');
 assert.equal(getStaffDossier('news.geo-scout')?.lifecycle,'paused');
 assert.equal(getStaffDossier('atlas')?.lifecycle,'paused');
 assert.ok(staffDossiers.some(d=>d.id.startsWith('news.workflow.')&&d.lifecycle==='planned'));
});
test('levels require scoped rationale and role requirements; release and accounting cannot imply competency',()=>{
 for(const d of staffDossiers){assert.equal(d.released,null);if(d.demonstrated){assert.ok(d.levelMapping?.rationale);assert.ok(d.levelMapping?.evidenceUrls.length);}if(d.target)assert.notEqual(d.targetRequirement,'Role requirement not yet established.');assert.ok(d.duties.length);assert.ok(d.assessments.length);assert.ok(d.history.length);assert.match(d.availability,/Unknown/);for(const e of d.evidence){assert.ok(e.date);assert.ok(e.reviewer);assert.ok(e.version);assert.match(e.url,/^https:\/\/github.com\/seangworld\//);}}
 const jordan=getStaffDossier('guidance-counselor')!;assert.equal(jordan.releases[0].version,'498bfa974658f6a1ad4e68a5cd0a5e509201ac27');assert.equal(jordan.costs.confirmedChargesUsd,null);assert.equal(jordan.costs.unresolvedReservationsUsd,4.7);assert.equal(jordan.assessments[0].criteria.length,24);
 assert.ok(jordan.assessments[0].criteria.some(c=>c.result==='not tested'));
 assert.ok(getStaffDossier('beastfusion.developer-agent')?.autonomy);
 assert.match(getStaffDossier('tutor')!.limitations.join(' '),/cancellation/i);
});
test('roster filters work with canonical names, alias, department, paused state and each competency dimension',()=>{
 assert.equal(filterStaffDossiers(staffDossiers,{query:'VA Claims Aide'})[0].id,'beasthealth.health-advisor');
 const news=filterStaffDossiers(staffDossiers,{department:'SEANGWORLD News',lifecycle:'paused'});assert.equal(news.length,2);
 assert.equal(filterStaffDossiers(staffDossiers,{competency:'L5'}).length,0);
 for(const dimension of ['target','demonstrated','released'] as const)assert.equal(filterStaffDossiers(staffDossiers,{dimension,competency:'unassessed'}).length,staffDossiers.filter(d=>!d[dimension]).length);
 assert.equal(filterStaffDossiers(staffDossiers,{query:'nonexistentstaff'}).length,0);
});
test('dossier server authorization denies anonymous, member, editable metadata, missing role and profile errors before payload',async()=>{
 for(const mode of ['owner','anonymous','member','metadata-admin','missing','error']){
  const exports:{requireStaffDossierOwner?:()=>Promise<void>}={};
  const client={auth:{getUser:async()=>({data:{user:mode==='anonymous'?null:{id:'synthetic-owner',user_metadata:{role:'admin'}}},error:null})},from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:mode==='missing'?null:{role:mode==='owner'?'admin':'member'},error:mode==='error'?{message:'unavailable'}:null})})})})};
  const compiled=ts.transpileModule(readFileSync('src/lib/server/staffDossierOwner.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
  runInNewContext(compiled,{exports,require:(name:string)=>name==='next/navigation'?{redirect:(path:string)=>{throw Error('redirect:'+path);}}:name==='../supabase/server'?{createRouteClient:()=>client}:{isBeastAdminOwnerRole:(role:string)=>role==='admin'}});
  if(mode==='owner')await exports.requireStaffDossierOwner!();else await assert.rejects(exports.requireStaffDossierOwner!(),/redirect:/);
 }
 for(const path of ['src/app/dashboard/operations/staff/page.tsx','src/app/dashboard/operations/staff/[staffId]/page.tsx']){const s=readFileSync(path,'utf8');assert.ok(s.indexOf('await requireStaffDossierOwner()')<s.indexOf('return <'));assert.match(s,/force-dynamic/);}
 const client=readFileSync('src/app/dashboard/operations/staff/StaffRoster.tsx','utf8');assert.doesNotMatch(client,/import \{[^}]*\bstaffDossiers\b[^}]*\}/);assert.doesNotMatch(client,/fetch\(|useEffect/);
});


test('prior result/evaluation dates remain distinct from dossier updates and score-to-level shortcuts',()=>{
 const a=getStaffDossier('fusion-director')!;assert.equal(a.latestAssessment?.title,'23/24 PARTIAL-PASS');assert.equal(a.lastEvaluatedAt,'2026-10-18');assert.equal(a.reviewedAt,'2026-10-21');assert.match(a.latestAssessment!.note,/locally/);assert.equal(a.demonstrated,'L3');assert.equal(a.target,'L4');assert.match(a.levelMapping!.rationale,/Cancellation/);
 const tutor=getStaffDossier('tutor')!;assert.equal(tutor.lastEvaluatedAt,'2026-08-30');assert.equal(tutor.latestAssessment?.title,'7/7 source turns accepted');assert.equal(tutor.demonstrated,null);assert.match(tutor.levelMapping!.rationale,/Knight/);assert.ok(tutor.assessments.some(a=>a.evidence.some(e=>e.date==='2026-08-30')));
});

test('Product Specialist remains a planned policy record with duties mapped to existing staff and no inferred authority',()=>{
 const specialist=getStaffDossier('product_specialist')!;
 assert.equal(specialist.id,'beastfusion.policy.product_specialist');
 assert.equal(specialist.recordKind,'planned');assert.equal(specialist.lifecycle,'planned');
 assert.match(specialist.role,/Duties covered by existing staff/);
 for(const dimension of ['target','demonstrated','released'] as const)assert.equal(specialist[dimension],null);
 assert.equal(specialist.lastEvaluatedAt,null);
 assert.match(specialist.assignment,/Sean retains authorization/);
 for(const id of ['orchestrator-3','developer-agent','proposal-agent','reviewer-agent']){
  const dossier=getStaffDossier('beastfusion.'+id)!;
  const profile=developmentAgentProfiles.find(p=>p.id===id)!;
  assert.equal(dossier.recordKind,'staff');
  for(const duty of profile.responsibilities)assert.ok(dossier.duties.includes(duty));
  assert.ok(dossier.duties.some(d=>d.includes('Product Specialist')||d.includes('product-scoped Developer')));
  assert.ok(dossier.permissions.includes(profile.authorityBoundary));
  assert.ok(dossier.history.some(h=>h.version.includes('PR #282 responsibility mapping')));
  assert.ok(specialist.duties.some(d=>d.includes(dossier.id)));
 }
 assert.match(specialist.deferred[0].requiredWork,/No new agent work is scheduled/);
});
