import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const manifest=JSON.parse(readFileSync('src/vendor/beastguide/manifest.json','utf8'));
assert.equal(manifest.application,'beastguide');assert.match(manifest.sourceCommit,/^[a-f0-9]{40}$/);
for(const [name,hash] of Object.entries(manifest.files)){
 assert.ok(/^(public|runtime)\//.test(name)&&!name.includes('..'),'Safe imported artifact path');
 const path=name.startsWith('public/')?'public/beastguide-app/'+name.slice(7):'src/vendor/beastguide/'+name.slice(8);
 assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'),hash,'Imported Guide checksum: '+name);
}
const runtime=readFileSync('src/vendor/beastguide/server/identity/runtime.js','utf8');
assert.match(runtime,/max:1,idleTimeoutMillis:5000/,'Embedded Guide must preserve production connection budget');
assert.match(runtime,/requireAccountSetup:env.BEAST_ACCOUNT_SETUP_REQUIRED==='true'/,'Embedded Guide must preserve canonical setup enforcement');
assert.match(readFileSync('src/lib/beastguide/runtime.ts','utf8'),/BEAST_ACCOUNT_SETUP_REQUIRED: env.BEAST_ACCOUNT_SETUP_REQUIRED/,'Host must forward canonical setup policy');
console.log('Embedded BeastGuide artifact and production safeguards passed');
