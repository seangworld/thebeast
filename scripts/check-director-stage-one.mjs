// Free authenticated model metadata only. No model generation or credential mutation.
import { openSync, closeSync, readFileSync, fstatSync, lstatSync, constants, writeFileSync } from 'node:fs';
import { userInfo } from 'node:os';
import { createOpenAIRequestHeaders } from '../.test-dist/src/lib/digitalStaffRuntime/provider.js';
if (process.argv[2] !== '--check-approved-stage-one') throw Error('Explicit Stage 1 check argument required');
const report={authorization:'Issue #264 owner approval 6236922578: Stage 1 only, max 24 inference calls/$3',checkedAt:new Date().toISOString(),paidModelCalls:0,metadataRequests:0,credentialPreserved:null,models:[],scope:'Only exact prepared model IDs; no substitution or generation'};
let fd, original, prior;
try {
 const path='/Users/seangworld/.config/seangworld/avery-dev.env';
 fd=openSync(path,constants.O_RDONLY|constants.O_NOFOLLOW); prior=fstatSync(fd);
 if(!prior.isFile() || prior.uid!==userInfo().uid || (prior.mode&0o077)) throw Error('Credential permissions invalid');
 original=readFileSync(fd,'utf8');
 const entries=original.split(/\r?\n/).filter(l=>/^\s*(?:export\s+)?OPENAI_API_KEY\s*=/.test(l));
 if(entries.length!==1) throw Error('Exactly one existing development credential required');
 const key=entries[0].slice(entries[0].indexOf('=')+1).trim().replace(/^(['"])(.*)\1$/,'$2');
 for(const model of ['gpt-6-luna','gpt-6.1-sol']) {
  report.metadataRequests++;
  const response=await fetch(`https://api.openai.com/v1/models/${model}`,{method:'GET',headers:createOpenAIRequestHeaders(crypto.randomUUID(),key),redirect:'error',signal:AbortSignal.timeout(30000)});
  const payload=await response.json();
  report.models.push({requested:model,httpStatus:response.status,available:response.ok && payload.id===model,returnedId:typeof payload.id==='string'&&/^[a-zA-Z0-9_.-]+$/.test(payload.id)?payload.id:null,errorCode:typeof payload.error?.code==='string'&&/^[a-zA-Z0-9_.-]+$/.test(payload.error.code)?payload.error.code:null});
 }
 report.allAvailable=report.models.length===2&&report.models.every(m=>m.available);
} catch(error) { report.failure='Preflight could not establish permitted model access; no inference attempted';report.errorType=error.name; }
finally {
 if(fd!==undefined){closeSync(fd);const path='/Users/seangworld/.config/seangworld/avery-dev.env';const fresh=lstatSync(path);report.credentialPreserved=original!==undefined && readFileSync(path,'utf8')===original && fresh.ino===prior.ino && fresh.mode===prior.mode && fresh.uid===prior.uid;}
 const destination='docs/avery-director-stage-one-preflight.json';
 const out=openSync(destination,'wx',0o600);try{writeFileSync(out,JSON.stringify(report,null,2)+'\n')}finally{closeSync(out)}
 console.log(JSON.stringify(report));
}
