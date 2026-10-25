import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {transpileModule,ModuleKind,ScriptTarget} from 'typescript';
import {allowedSocialMedia} from '../src/lib/marketingSocial';
import {talentAppearance} from '../src/lib/agencyAppearance';
const fixture=Buffer.from('synthetic private PNG fixture; no approved image bytes in tests');
function route(owner:boolean,mode='ok'){
 let fileReads=0;const downloads:{bucket:string;path:string;options:unknown}[]=[];const m={exports:{} as {GET:(r:Request)=>Promise<Response>}};
 const references={...talentAppearance,cole:{...talentAppearance.cole,bytes:fixture.length,sha256:createHash('sha256').update(fixture).digest('hex')}};
 const client={storage:{from(bucket:string){return {download:async(path:string,_transform:unknown,options:unknown)=>{downloads.push({bucket,path,options});const bytes=mode==='changed'?Buffer.alloc(fixture.length):mode==='size'?Buffer.from('short'):fixture;return mode==='refused'?{error:{message:'private-provider-detail'},data:null}:{error:null,data:new Blob([bytes],{type:'image/png'})};}};}}};
 const modules:Record<string,unknown>={'node:fs/promises':{readFile:async(path:string)=>{fileReads++;return readFileSync(path);}},'node:path':require('node:path'),'node:crypto':require('node:crypto'),'@/lib/agencyAppearance':{talentAppearance:references},'@/lib/server/social/auth':{socialOwner:async()=>owner?{id:'owned-user',client}:null,socialJson:(body:unknown,status:number)=>Response.json(body,{status})}};
 new Function('require','module','exports',transpileModule(readFileSync('src/app/api/admin/agency/appearance/route.ts','utf8'),{compilerOptions:{module:ModuleKind.CommonJS,target:ScriptTarget.ES2020}}).outputText)((id:string)=>{assert.ok(id in modules);return modules[id];},m,m.exports);
 return {get:m.exports.GET,downloads,fileReads:()=>fileReads};
}
test('appearance authorization and talent allowlist precede any private download or file access',async()=>{for(const owner of [false,true])for(const key of ['cole','../../secret','constructor']){const r=route(owner);const out=await r.get(new Request('https://beast.test/api/admin/agency/appearance?talent='+encodeURIComponent(key)));assert.equal(out.status,!owner?403:key==='cole'?200:404);assert.equal(r.downloads.length,owner&&key==='cole'?1:0);assert.equal(r.fileReads(),0);}});
test('Cole uses only authorized owner private-storage path, original PNG response and no-store; access/size/digest failure has no fallback or provider leakage',async()=>{
 const r=route(true);const out=await r.get(new Request('https://beast.test/?talent=cole&path=foreign-user/image'));assert.equal(out.status,200);assert.deepEqual(r.downloads,[{bucket:'beast-marketing-media',path:'owned-user/agency-appearance/cole-ink-free-coastal.png',options:{cache:'no-store'}}]);assert.equal(out.headers.get('Content-Type'),'image/png');assert.equal(out.headers.get('Cache-Control'),'private, no-store');assert.deepEqual(Buffer.from(await out.arrayBuffer()),fixture);assert.equal(r.fileReads(),0);
 for(const mode of ['refused','size','changed']){const fail=route(true,mode);const response=await fail.get(new Request('https://beast.test/?talent=cole'));assert.equal(response.status,503);assert.doesNotMatch(await response.text(),/private-provider-detail|token|owned-user/);assert.equal(fail.fileReads(),0);}
});
test('Leila bytes and deferred display are preserved; Cole image is absent from source and tracing and cannot become publishing media',async()=>{
 const r=route(true);const out=await r.get(new Request('https://beast.test/?talent=leila'));assert.equal(out.status,200);assert.equal(out.headers.get('Content-Type'),'image/jpeg');assert.equal(createHash('sha256').update(new Uint8Array(await out.arrayBuffer())).digest('hex'),'2c0a03b587bd09827ae1a55a10a611838862dc0a5c85d4164af650fe0f673057');assert.deepEqual(r.downloads,[]);
 assert.equal(talentAppearance.cole.sha256,'c84a2646f592c74d92430e33753b10b87a3c9cc6dec1eb8e3539383842a4e3bb');assert.equal(talentAppearance.cole.bytes,2021199);assert.equal(existsSync('assets/agency/cole-blue-shirt.jpeg'),false);assert.equal(existsSync('assets/agency/cole-ink-free-coastal.png'),false);
 const config=readFileSync('next.config.js','utf8');assert.doesNotMatch(config,/assets\/agency\/(?:\*|cole)/);assert.match(config,/assets\/agency\/leila-cream-suit\.jpeg/);
 for(const key of ['cole','leila'])assert.equal(allowedSocialMedia('https://thebeast.seangworld.com/api/admin/agency/appearance?talent='+key),false);
});
