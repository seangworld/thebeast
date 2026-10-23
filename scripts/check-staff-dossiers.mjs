// Offline completion gate. No model, telemetry, credential or network calls.
import {readFileSync,readdirSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
export const dossierWatchRoots=['src/app/dashboard/operations/staff/[staffId]/page.tsx','src/app/dashboard/admin/marketing/GrowthCyclePanel.tsx','src/app/api/cron/marketing-growth','src/lib/server/marketingGrowthCycleRunner.ts','src/lib/visiblePolling.ts','src/lib/adminMessageUnreadPolling.ts','src/lib/marketingSocialPolling.ts','src/app/dashboard/operations/atlas','src/app/dashboard/admin/marketing/SocialWorkspace.tsx','src/app/api/cron/marketing-social','src/app/api/admin/beast-marketing/social','src/lib/server/social','src/lib/staffDossiers/index.ts','src/lib/staffDossiers/reviews.json','src/lib/staffDossiers/external-inventory.json','src/lib/staffDossiers/historical-tutor-assessment.json','src/lib/member-agent-capability-projection.json','src/lib/digitalStaffRuntime','src/lib/learning','src/lib/atlas','src/lib/digitalStaff.ts','src/lib/developmentAgentProfiles.ts','src/lib/developmentAgentCapabilityFramework.ts','src/lib/development-agent-capability-projection.json','src/lib/memberAgentSemanticVerifier.ts','src/lib/memberAgentResponseSafety.ts','src/lib/beastMarketingPersona.ts','src/lib/health/veteranClaims.ts','src/lib/health/veteranClaimsPersistence.ts','src/lib/health/veteransContext.ts','src/lib/health/veteransSave.ts','src/lib/health/advisorDocuments.ts','src/app/dashboard/health/veterans','src/app/api/learning','src/app/dashboard/education/tutor','src/app/api/digital-staff','src/app/api/atlas','src/app/api/cron/atlas','src/lib/platform/agents','src/app/dashboard/health/HealthAdvisorWorkspace.tsx',...readdirSync('src/lib').filter(n=>/^(?:memberAgent|beastHunter|beastMarketing)/.test(n)).map(n=>'src/lib/'+n)];
function files(path){return statSync(path).isDirectory()?readdirSync(path).sort().flatMap(n=>files(path+'/'+n)):[path];}
export function staffSourceDigest(){const hash=createHash('sha256');for(const p of dossierWatchRoots.flatMap(files).sort())hash.update(p+'\0').update(readFileSync(p)).update('\0');return hash.digest('hex');}
export function validateStaffReceipt(receipt,digest){
 const latest=receipt.changes.at(-1);if(!latest || latest.sourceDigest!==digest)throw Error('Agent sources changed: update canonical SW HQ dossier evidence/history and its completion receipt before build. No paid evaluation required.');
 for(const c of receipt.changes){if(!c.date||!c.executor||!c.reason||!c.version||!c.evidence||!Array.isArray(c.affectedStaffIds)||!c.affectedStaffIds.length)throw Error('Dossier change receipt requires date, executor, reason, version, evidence and affected staff IDs.');}
 return true;
}
if(process.argv[1]?.endsWith('check-staff-dossiers.mjs')){
 try{
 const digest=staffSourceDigest();if(process.argv.includes('--digest')){console.log(digest);process.exit(0);}
 const file='src/lib/staffDossiers/maintenance.json',r=JSON.parse(readFileSync(file));validateStaffReceipt(r,digest);
 const base=process.argv.indexOf('--base');if(base>=0){const ref=process.argv[base+1];let prior;try{prior=JSON.parse(execFileSync('git',['show',ref+':'+file],{encoding:'utf8',stdio:['ignore','pipe','ignore']}));}catch{/* Initial introduction. */}
 if(prior){if(JSON.stringify(r.changes.slice(0,prior.changes.length))!==JSON.stringify(prior.changes))throw Error('Preserve existing dossier history. Append corrections/reverts, never overwrite.');if(prior.changes.at(-1)?.sourceDigest!==digest&&r.changes.length<=prior.changes.length)throw Error('Append a dossier change receipt for changed agent source.');}}
 console.log('Staff dossier source/history completion check passed (offline).');
 }catch(e){console.error(e.message);process.exitCode=1;}
}
