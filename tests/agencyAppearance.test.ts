import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {transpileModule,ModuleKind,ScriptTarget} from 'typescript';
import {talentAppearance} from '../src/lib/agencyAppearance';
function route(owner:boolean,changed=false){let reads=0;const m={exports:{} as {GET:(r:Request)=>Promise<Response>}};const modules:Record<string,unknown>={
 'node:fs/promises':{readFile:async(path:string)=>{reads++;return changed?Buffer.from('wrong'):readFileSync(path);}},'node:path':require('node:path'),'node:crypto':require('node:crypto'),'@/lib/agencyAppearance':{talentAppearance},'@/lib/server/social/auth':{socialOwner:async()=>owner?{}:null,socialJson:(body:unknown,status:number)=>Response.json(body,{status})}};
 new Function('require','module','exports',transpileModule(readFileSync('src/app/api/admin/agency/appearance/route.ts','utf8'),{compilerOptions:{module:ModuleKind.CommonJS,target:ScriptTarget.ES2020}}).outputText)((id:string)=>{assert.ok(id in modules);return modules[id];},m,m.exports);return {get:m.exports.GET,reads:()=>reads};}
test('appearance endpoint requires owner before file access and rejects unknown/path inputs',async()=>{for(const owner of [false,true])for(const key of ['cole','../../secret','constructor']){const r=route(owner);const out=await r.get(new Request('https://beast.test/api/admin/agency/appearance?talent='+encodeURIComponent(key)));assert.equal(out.status,!owner?403:key==='cole'?200:404);assert.equal(r.reads(),owner&&key==='cole'?1:0);}});
test('both owner-only references preserve exact recovered bytes and never enter public assets; changed bytes fail closed',async()=>{for(const key of ['cole','leila'] as const){const ref=talentAppearance[key];const out=await route(true).get(new Request('https://beast.test/api/admin/agency/appearance?talent='+key));assert.equal(out.status,200);assert.equal(out.headers.get('Cache-Control'),'private, no-store');assert.equal(out.headers.get('Content-Type'),'image/jpeg');assert.equal(createHash('sha256').update(new Uint8Array(await out.arrayBuffer())).digest('hex'),ref.sha256);assert.equal((await route(true,true).get(new Request('https://beast.test/?talent='+key))).status,503);}
 const config=readFileSync('next.config.js','utf8');assert.match(config,/"\/api\/admin\/agency\/appearance": \["\.\/assets\/agency\/\*\.jpeg"\]/);
});
