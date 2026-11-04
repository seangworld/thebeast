import {readFile,writeFile,mkdir,cp,rm} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
const source=resolve(process.argv[2]||'');
const manifest=JSON.parse(await readFile(join(source,'manifest.json'),'utf8'));
if(manifest.application!=='beastguide'||manifest.format!==1||!manifest.sourceCommit?.match(/^[a-f0-9]{40}$/))throw new Error('Invalid BeastGuide export');
for(const [name,hash] of Object.entries(manifest.files)){
 if(!/^(public|runtime)\//.test(name)||name.includes('..')||!hash.match(/^[a-f0-9]{64}$/))throw new Error('Unsafe export path');
 if(createHash('sha256').update(await readFile(join(source,name))).digest('hex')!==hash)throw new Error('Export checksum mismatch: '+name);
}
for(const [from,to] of [['public','public/beastguide-app'],['runtime','src/vendor/beastguide']]){await rm(to,{recursive:true,force:true});await mkdir(to,{recursive:true});for(const name of Object.keys(manifest.files).filter(n=>n.startsWith(from+'/'))){const dest=join(to,name.slice(from.length+1));await mkdir(resolve(dest,'..'),{recursive:true});await cp(join(source,name),dest);}}
await writeFile('src/vendor/beastguide/manifest.json',JSON.stringify(manifest,null,2)+'\n');
console.log('Imported verified BeastGuide artifact '+manifest.sourceCommit);
