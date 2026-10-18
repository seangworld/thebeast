// Owner-approved final assessment launcher. Exactly one funded run; no retries/resume or other cycles.
import {readFileSync,openSync,closeSync,fstatSync,lstatSync,mkdirSync,constants,writeFileSync} from 'node:fs';
import {userInfo} from 'node:os';import {createHash} from 'node:crypto';
import {runFinalAssessment,withFinalAssessmentLedger} from './director-final-assessment.mjs';
import {createFinalLocalAdapter} from './director-final-local-adapter.mjs';
import {prepareFinal,sha} from './prepare-director-final.mjs';
import {requestOpenAIResponse,createOpenAIRequestHeaders} from '../.test-dist/src/lib/digitalStaffRuntime/provider.js';
const authorizationId=6250327717;
if(process.argv[2]!==`--approved-${authorizationId}`)throw Error('Exact final owner authorization required');
const frozen=JSON.parse(readFileSync('docs/avery-director-final-evaluation.json','utf8'));
if(sha(frozen)!=='adf219bb11e013acc75c947a3254da5a683c1f4b323a9fd9cfc26a4a0eeb4116'||sha(prepareFinal())!==sha(frozen))throw Error('Frozen assessment or implementation changed');
const local=JSON.parse(readFileSync('/private/tmp/avery-local-supabase-status.json','utf8'));if(local.API_URL!=='http://127.0.0.1:54321')throw Error('Local synthetic database required');
const root=`/private/tmp/avery-final-approved-${authorizationId}`;mkdirSync(root,{mode:0o700});
const dir=lstatSync(root);if(dir.isSymbolicLink()||dir.uid!==userInfo().uid||(dir.mode&0o077))throw Error('Unsafe private evidence directory');
const authorization={approved:true,issueCommentId:authorizationId,issueUrl:`https://github.com/seangworld/thebeast/issues/264#issuecomment-${authorizationId}`,manifestSha256:sha(frozen),maxCalls:16,maxUsd:5.50,source:'Explicit owner approval in current Codex chat, recorded verbatim in issue'};
const adapters=[];
await withFinalAssessmentLedger(root+'/ledger.json',authorization,async(ledger,save)=>{
 const credential='/Users/seangworld/.config/seangworld/avery-dev.env';let fd,prior,original;
 const hash=text=>createHash('sha256').update(text).digest('hex');
 try{
  fd=openSync(credential,constants.O_RDONLY|constants.O_NOFOLLOW);prior=fstatSync(fd);
  if(!prior.isFile()||prior.uid!==userInfo().uid||(prior.mode&0o077))throw Error('Existing credential is not safely protected');
  original=readFileSync(fd);closeSync(fd);fd=undefined;
  const lines=original.toString('utf8').split(/\r?\n/).filter(l=>/^\s*(?:export\s+)?OPENAI_API_KEY\s*=/.test(l));if(lines.length!==1)throw Error('Exactly one existing development credential required');
  const key=lines[0].slice(lines[0].indexOf('=')+1).trim().replace(/^(['"])(.*)\1$/,'$2');createOpenAIRequestHeaders('preflight',key);
  // The production provider's availability check sees only this in-process key. It is never written or passed to Next.
  process.env.OPENAI_API_KEY=key;process.env.BEAST_DIRECTOR_REASONING_ENABLED='true';process.env.BEAST_DIRECTOR_MODEL_CONFIG='sol-high-v1';
  ledger.preflight={syntheticOnly:true,productionAccounts:false,sourceCommit:'41e585d3bb15a7ddaa4da33e56397d03ed6e3cbd',pricingVerified:'2026-10-18',credentialReadOnly:true};save();
  let attempted=0;
  await runFinalAssessment({authorization,ledger,save,createAdapter:async id=>{const adapter=await createFinalLocalAdapter(id);adapters.push(adapter);return adapter;},transport:async(body,options)=>{
   const a=ledger.attempts.at(-1);
   if(!a||a.state!=='reserved_before_request'||a.networkAttemptedAt||ledger.attempts.length>16||ledger.reservedUsd>5.50||++attempted>16||sha(body)!==a.requestSha256)throw Error('Paid transport call/spend/frozen request guard');
   a.networkAttemptedAt=new Date().toISOString();save();
   console.log(JSON.stringify({event:'dispatch',scenario:a.scenarioId,turn:a.turn,attempted,reservedUsd:ledger.reservedUsd}));
   return requestOpenAIResponse(body,{...options,apiKey:key,fetchImpl:async(url,init)=>{
    if(String(url)!=='https://api.openai.com/v1/responses'||init.method!=='POST')throw Error('Unapproved provider endpoint');
    return fetch(url,{...init,redirect:'error'});
   }});
  }});
 }finally{
  if(fd!==undefined)closeSync(fd);
  delete process.env.OPENAI_API_KEY;delete process.env.BEAST_DIRECTOR_REASONING_ENABLED;delete process.env.BEAST_DIRECTOR_MODEL_CONFIG;
  for(const adapter of adapters)await adapter.close();
  if(original){const check=openSync(credential,constants.O_RDONLY|constants.O_NOFOLLOW);try{const after=fstatSync(check),bytes=readFileSync(check);ledger.credentialPreserved=after.ino===prior.ino&&after.mode===prior.mode&&after.uid===prior.uid&&hash(bytes)===hash(original);}finally{closeSync(check);}if(!ledger.credentialPreserved)throw Error('Credential integrity changed unexpectedly');}
  save();
  console.log(JSON.stringify({event:'stopped',calls:ledger.attempts.length,reservedUsd:ledger.reservedUsd,finished:ledger.finished||false,halted:ledger.halted||null,credentialPreserved:ledger.credentialPreserved||false}));
 }
});
