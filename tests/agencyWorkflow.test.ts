import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FIRST_COLE_CAPTION,creativeInput,digest,profileFingerprint,rejectPrivateIdentity,approvalFingerprint,assertApproved,ownerState,metricState,publishAgencyRevision,type AgencyPost,type AccountSnapshot,type PublishDependencies} from '../src/lib/agencyWorkflow';
import {evaluateAgencyWritePolicy} from '../src/lib/server/agency/auth';
import {operationsLinks} from '../src/lib/operationsNavigation';
import {getStaffDossier} from '../src/lib/staffDossiers';
const account:AccountSnapshot={connectionId:'connection-a',accountId:'123',username:'cole_fixture',connectedAt:'2026-10-23T00:00:00Z'};
function post():AgencyPost{const p:AgencyPost={id:'post',presenter_profile_id:'cole',content:{caption:FIRST_COLE_CAPTION,mediaUrl:'https://seangworld.com/images/cole.jpg'},content_hash:'content',media_hash:'bytes',revision:1,status:'approved',profile_hash:'brand',account_snapshot:account,approval_hash:null,approved_at:'2026-10-23T00:00:00Z',container_id:null,provider_post_id:null,published_at:null,last_error:null,updated_at:'2026-10-23T00:00:00Z',metrics:null,metrics_checked_at:null,metrics_error:null};p.approval_hash=approvalFingerprint(p,account);return p;}
function fixture(options:{denyClaim?:boolean;prepareFail?:boolean;publishFail?:boolean;receiptFail?:boolean;status?:string;revoke?:boolean}={}){
 const p=post();let claims=0,writes=0,checks=0,checkpoints=0;let dbState='approved';const saved:string[]=[];
 const d:PublishDependencies={verify:async()=>{checks++;assertApproved(p,'brand',account);if(options.revoke&&checks>=2)throw Error('revoked');},claim:async()=>{claims++;if(options.denyClaim||dbState==='publishing')return false;dbState='publishing';return true;},prepare:async()=>{writes++;if(options.prepareFail)throw Error('network unknown');return '234';},beforePublish:async()=>{assert.equal(dbState,'publishing');},checkpoint:async()=>{checkpoints++;assert.equal(dbState,'publishing','checkpoint must not expose a resumable processing claim');},containerStatus:async()=>options.status||'FINISHED',publish:async()=>{writes++;if(options.publishFail)throw Error('write timeout');return '345';},save:async r=>{if(options.receiptFail&&r.status==='published')throw Error('receipt unavailable');saved.push(r.status);dbState=r.status;}};
 return {p,d,saved,counts:()=>({claims,writes,checks,checkpoints}),state:()=>dbState};
}
test('Cole captions allow plain English; invalid/private/arbitrary assets are rejected',()=>{
 assert.doesNotMatch(FIRST_COLE_CAPTION,/AI-generated character/);
 assert.doesNotThrow(()=>creativeInput({caption:FIRST_COLE_CAPTION,mediaUrl:''}));
 for(const mediaUrl of ['http://localhost/a.jpg','https://evil.test/a.jpg','https://seangworld.com/api/a.jpg','https://seangworld.com/images/a.jpg?token=x','https://seangworld.com/images/a.png'])assert.throws(()=>creativeInput({caption:FIRST_COLE_CAPTION,mediaUrl}));
 assert.doesNotThrow(()=>creativeInput({caption:'A quiet evening outside.',mediaUrl:''}));assert.throws(()=>rejectPrivateIdentity('Contact owner@example.test',[]));assert.throws(()=>rejectPrivateIdentity('A private Owner Name appears',['Owner Name']));
});
test('approval changes with revision, caption/media digest, brand, account or authorization epoch',()=>{
 const p=post();assert.doesNotThrow(()=>assertApproved(p,'brand',account));
 for(const change of [{revision:2},{content_hash:'new-caption'},{media_hash:'new-bytes'},{profile_hash:'new-brand'}])assert.throws(()=>assertApproved({...p,...change},'brand',account));
 for(const change of [{accountId:'999'},{username:'other'},{connectedAt:'2026-10-24T00:00:00Z'},{connectionId:'new'}])assert.throws(()=>assertApproved(p,'brand',{...account,...change}));
 const profile={id:'cole',provenance:{manualAgencyApproved:true}};assert.notEqual(profileFingerprint(profile),profileFingerprint({...profile,provenance:{manualAgencyApproved:false}}));assert.notEqual(digest(['caption','one']),digest(['caption','two']));
});
test('one manual publish retains confirmed receipt without releasing its in-flight claim early',async()=>{const f=fixture();const result=await publishAgencyRevision(f.p,f.d);assert.equal(result.status,'published');assert.equal(result.postId,'345');assert.equal(f.counts().writes,2);assert.equal(f.counts().checkpoints,1);});
test('concurrent click losing the CAS claim causes no external writes',async()=>{const f=fixture({denyClaim:true});await assert.rejects(()=>publishAgencyRevision(f.p,f.d),/already claimed/);assert.equal(f.counts().writes,0);});
test('owner revocation after claim stops before the provider write',async()=>{const f=fixture({revoke:true});assert.equal((await publishAgencyRevision(f.p,f.d)).status,'failed');assert.equal(f.counts().writes,0);});
test('ambiguous media creation or publishing cannot become a retryable failure',async()=>{for(const option of [{prepareFail:true},{publishFail:true},{receiptFail:true}]){const f=fixture(option);assert.equal((await publishAgencyRevision(f.p,f.d)).status,'unknown');assert.equal(f.state(),'unknown');}});
test('processing is persisted honestly and resumes the same container without preparing a duplicate',async()=>{const f=fixture({status:'IN_PROGRESS'});assert.equal((await publishAgencyRevision(f.p,f.d)).status,'processing');assert.equal(f.counts().writes,1);const resumed=fixture();resumed.p.status='processing';resumed.p.container_id='234';assert.equal((await publishAgencyRevision(resumed.p,resumed.d)).status,'published');assert.equal(resumed.counts().writes,1);});
test('already published container without a saved media receipt remains unknown',async()=>{const f=fixture({status:'PUBLISHED'});assert.equal((await publishAgencyRevision(f.p,f.d)).status,'unknown');assert.equal(f.counts().writes,1);});
test('expired media reports a failure without publishing; stale claims display unknown without retry',async()=>{const f=fixture({status:'EXPIRED'});assert.equal((await publishAgencyRevision(f.p,f.d)).status,'failed');assert.equal(f.counts().writes,1);assert.equal(ownerState({status:'publishing',updated_at:'2020-01-01'}),'unknown');});
test('metrics never turn missing/stale/failed reporting into measured zeros',()=>{assert.equal(metricState(null,null),'Unavailable');assert.equal(metricState('2020-01-01',null),'Stale');assert.equal(metricState(new Date().toISOString(),'denied'),'Partial / refresh unavailable');});
test('owner navigation points to the existing Agency workspace, and talent is outside operational staff grading',()=>{
 assert.equal(operationsLinks.find(x=>x.label==='Agency')?.href,'/dashboard/admin/agency/metrics');
 for(const id of ['agency.cole-mercer','agency.leila-bautista']){const d=getStaffDossier(id)!;assert.equal(d.recordKind,'virtual_talent');assert.equal(d.demonstrated,null);}
 assert.match(getStaffDossier('agency.leila-bautista')!.assignment,/deferred/i);
});
test('ordinary previews cannot write to production; production still requires exact owner origin',()=>{
 const input={method:'POST',origin:'https://thebeast.seangworld.com',requestUrl:'https://thebeast.seangworld.com/api/admin/agency'};
 assert.equal(evaluateAgencyWritePolicy(input,{VERCEL_ENV:'preview'}).allowed,false);assert.equal(evaluateAgencyWritePolicy(input,{VERCEL_ENV:'production'}).allowed,true);assert.equal(evaluateAgencyWritePolicy({...input,origin:'https://evil.test'},{VERCEL_ENV:'production'}).allowed,false);
});
test('Agency entry and API preserve owner guards; no timer dispatch or Leila workflow',()=>{
 const page=readFileSync('src/app/dashboard/admin/agency/metrics/page.tsx','utf8');assert.match(page,/await requireStaffDossierOwner/);
 const api=readFileSync('src/app/api/admin/agency/route.ts','utf8');assert.match(api,/agencyWriteOwner/);assert.match(api,/eq\('name',COLE_NAME\)/);assert.doesNotMatch(api,/beast_marketing_social_posts/);
 const ui=readFileSync('src/app/dashboard/admin/agency/metrics/AgencyMetricsContent.tsx','utf8');assert.doesNotMatch(ui,/setInterval|setTimeout/);assert.match(ui,/window.confirm/);assert.match(ui,/Cole’s SW HQ dossier/);
});

test('repeated dispatch after an unknown write cannot obtain another claim',async()=>{const f=fixture({publishFail:true});await publishAgencyRevision(f.p,f.d);const writes=f.counts().writes;f.d.claim=async()=>false;await assert.rejects(()=>publishAgencyRevision(f.p,f.d),/already claimed/);assert.equal(f.counts().writes,writes);});
test('a known provider rejection is failed, while an absent publication receipt is unknown',async()=>{const f=fixture();f.d.prepare=async()=>{const e=new Error('Provider refused') as Error&{uncertain:boolean};e.uncertain=false;throw e;};assert.equal((await publishAgencyRevision(f.p,f.d)).status,'failed');});

test('uncertainty records whether public publishing could have started',async()=>{const prepared=fixture({prepareFail:true});assert.equal((await publishAgencyRevision(prepared.p,prepared.d)).unknownStage,'prepare');const published=fixture({publishFail:true});assert.equal((await publishAgencyRevision(published.p,published.d)).unknownStage,'publish');const receipt=fixture({receiptFail:true});assert.equal((await publishAgencyRevision(receipt.p,receipt.d)).unknownStage,'receipt');});
