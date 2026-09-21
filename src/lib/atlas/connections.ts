import { readGitHubRepositoryEvidence, readVercelDeploymentEvidence } from '@/lib/server/beastAdminRepositoryProviders';
import { loadBeastFusionCanonicalReadModel } from '@/lib/server/beastFusionReadModel';

export async function inspectAtlasConnections() {
 const deadline=AbortSignal.timeout(20000);
 const fetchImpl:typeof fetch=(input,init)=>fetch(input,{...init,signal:deadline,cache:'no-store'});
 const [github,vercel,fusion]=await Promise.allSettled([
  readGitHubRepositoryEvidence({fetchImpl}),readVercelDeploymentEvidence({fetchImpl}),loadBeastFusionCanonicalReadModel()
 ]);
 const failed={provider:{status:'error',detail:'Live provider check unavailable.',observedAt:null},observations:[]};
 const canonical=fusion.status==='fulfilled'?fusion.value:null;
 return {
  checkedAt:new Date().toISOString(),access:'read-only',
  github:github.status==='fulfilled'?github.value:failed,
  vercel:vercel.status==='fulfilled'?vercel.value:failed,
  beastFusion:{provider:canonical?.provider||{status:'error',detail:'Canonical projection unavailable.'},cursor:canonical?.canonical?.cursor||null,attention:canonical?.canonical?.attention.slice(0,12)||[],roadmap:canonical?.canonical?.roadmap.filter(r=>r.status!=='completed').slice(0,25).map(r=>({id:r.id,product:r.product,title:r.title,status:r.status,blocked:r.blocked,ownerAction:r.ownerAction}))||[],products:canonical?.canonical?.products.map(p=>({id:p.id,name:p.name,version:p.version,releaseDate:p.releaseDate}))||[]},
 };
}
export function atlasConnectionSummary(result:Awaited<ReturnType<typeof inspectAtlasConnections>>) {
 const repos=result.github.observations.map(r=>`${r.repository}: ${r.state}${r.headCommit?` (${r.defaultBranch}, ${r.headCommit.slice(0,8)})`:''}.`);
 const deployments=result.vercel.observations.filter(d=>d.environment==='production'&&d.state!=='not_applicable').map(d=>`${d.repository}: ${d.state}${d.servedCommit?` (commit ${d.servedCommit.slice(0,8)})`:''}.`);
 return [`GitHub: ${result.github.provider.status}. ${result.github.provider.detail}`,...repos,`Vercel: ${result.vercel.provider.status}. ${result.vercel.provider.detail}`,...deployments,`BeastFusion projection: ${result.beastFusion.provider.status}.`,`Supabase: your ATLAS database is reachable. This does not verify every database or table.`,`These connections are read-only. I can report evidence but cannot edit code, deploy, or change database schemas.`].join('\n');
}
