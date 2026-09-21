import assert from "node:assert/strict";
import test from "node:test";
import * as studio from "../src/lib/homeStudio";
let user: {id:string}|null={id:'owner-a'};
let row: Record<string, unknown>|null=null;
let filters: Array<[string,unknown]>=[];
let writes=0;
const client={auth:{getUser:async()=>({data:{user}})},from:()=>{
 const query: Record<string,any>={};
 query.select=(_columns:unknown,options?:{head?:boolean})=>options?.head?{eq:async()=>({count:0,error:null})}:query;
 query.eq=(key:string,value:unknown)=>{filters.push([key,value]);return query;};
 query.order=()=>query;query.limit=async()=>({data:row?[row]:[],error:null});
 query.insert=(payload:Record<string,unknown>)=>{writes++;row={id:'11111111-1111-4111-8111-111111111111',...payload};return query;};
 query.update=(payload:Record<string,unknown>)=>{writes++;row={...row,...payload};return query;};
 query.single=query.maybeSingle=async()=>({data:row,error:null});return query;
}};
const Module=require('node:module'),originalLoad=Module._load;
Module._load=function(id:string,...args:unknown[]){
 if(id==='@/lib/homeStudio')return studio;
 if(id==='@/lib/supabase/server')return {createRouteClient:()=>client};
 if(id==='@/lib/memberAgeServer')return {requireMemberModuleEntitlement:async()=>({ok:true})};
 return originalLoad.call(this,id,...args);
};
const route=require('../src/app/api/home/studio/projects/route') as typeof import('../src/app/api/home/studio/projects/route');
Module._load=originalLoad;
function req(body:unknown,origin='https://beast.test'){return new Request('https://beast.test/api/home/studio/projects',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)});}

test('project API rejects anonymous, cross-origin and malformed requests without writing',async()=>{
 writes=0;user=null;assert.equal((await route.POST(req({action:'save'})))!.status,401);
 user={id:'owner-a'};assert.equal((await route.POST(req({},'https://other.test')))!.status,403);
 for(const body of [null,[],{action:'save',project:{}}])assert.equal((await route.POST(req(body)))!.status,400);
 assert.equal(writes,0);
});
test('project API roundtrips bounded workbench data and scopes updates/reads to authenticated owner',async()=>{
 filters=[];user={id:'owner-a'};
 const project=studio.normalizeHomeStudioProject({roomName:'Office',roomType:'Home office',style:'Modern',workspace:{budgetLimit:'300',client:{name:'Example client'},layout:[{id:'desk',label:'Desk',x:0,y:0,width:3,depth:2}]}})!;
 const plan=studio.normalizeHomeStudioPlan({title:'Plan',summary:'Keep desk',conceptPrompt:'Keep geometry',shoppingList:[{item:'Lamp',quantity:2,unitPrice:'24.50',status:'Purchased'}]})!;
 const response=await route.POST(req({action:'save',project,plan,owner_id:'attacker'}));assert.ok(response);assert.equal(response.status,201);
 const body=await response.json();assert.equal(body.project.project.workspace.budgetLimit,'300');assert.equal(body.project.plan.shoppingList[0].unitPrice,'24.50');assert.equal(row!.owner_id,'owner-a');
 await route.POST(req({action:'save',id:body.project.id,project,plan}));assert.ok(filters.some(([k,v])=>k==='owner_id'&&v==='owner-a'));
 filters=[];const read=await route.GET();assert.ok(read);assert.equal((await read.json()).projects.length,1);assert.ok(filters.some(([k,v])=>k==='owner_id'&&v==='owner-a'));
});
