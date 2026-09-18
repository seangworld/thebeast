import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import React from "react";
import { JSDOM } from "jsdom";
import * as editing from "../src/lib/platform/profileEditing";
import * as hub from "../src/lib/platform/personalHub";
import type Component from "../src/app/dashboard/settings/profile/page";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {url:"http://localhost/dashboard/settings/profile"});
Object.defineProperties(globalThis, {
  window:{value:dom.window,configurable:true}, document:{value:dom.window.document,configurable:true}, navigator:{value:dom.window.navigator,configurable:true},
  HTMLElement:{value:dom.window.HTMLElement,configurable:true}, Node:{value:dom.window.Node,configurable:true}, MutationObserver:{value:dom.window.MutationObserver,configurable:true},
  IS_REACT_ACT_ENVIRONMENT:{value:true,configurable:true,writable:true},
});
const baseline = {...editing.profileToForm(), id:"member-a", updated_at:"2026-09-18T12:00:00Z", preferred_name:"Alex", location:"Norfolk"};
let saved: Record<string, unknown> | null = {...baseline};
let stale = false; let rejectSave = false; let signedInId = "member-a";
let writes:Array<{patch:Record<string,unknown>; filters:Record<string,unknown>}> = [];
const client = {
  auth:{getUser: async()=>({data:{user:{id:signedInId,email:"member@example.test"}},error:null})},
  from:()=>{
    let write:typeof writes[number]|undefined;
    const chain = {
      select:()=>chain,
      eq:(key:string,value:unknown)=>{if(write)write.filters[key]=value;return chain;},
      maybeSingle:async()=>({data:saved,error:null}),
      update:(patch:Record<string,unknown>)=>{write={patch,filters:{}};writes.push(write);return chain;},
      then:(resolve:(value:unknown)=>unknown,reject:(reason:unknown)=>unknown)=>{
        if(rejectSave)return Promise.reject(new Error("Network unavailable")).then(resolve,reject);
        if(write&&!stale)saved={...saved,...write.patch,updated_at:"2026-09-18T12:01:00Z"};
        return Promise.resolve({data:stale?[]:[saved],error:null}).then(resolve,reject);
      },
    };return chain;
  },
};
const Module=require("node:module");const originalLoad=Module._load;
Module._load=function(id:string,...args:unknown[]){
  if(id==="next/navigation")return{useRouter:()=>({refresh:()=>undefined})};
  if(id==="next/link")return{__esModule:true,default:({children,...props}:React.AnchorHTMLAttributes<HTMLAnchorElement>)=>React.createElement("a",props,children)};
  if(id==="@/lib/supabase/client")return{createClient:()=>client};
  if(id==="@/lib/platform/profileEditing")return editing;
  if(id==="@/lib/platform/personalHub")return hub;
  if(id==="@/lib/profile")return{getProfileDisplayName:(profile:typeof baseline)=>profile.preferred_name||"member"};
  if(id==="@/app/components/design/DashboardPrimitives")return {
    DashboardCard:({children}:{children:React.ReactNode})=>React.createElement("div",null,children),
    ModuleBadge:({label}:{label:string})=>React.createElement("span",null,label),
    SectionHeader:({title,description}:{title:string;description:string})=>React.createElement("div",null,React.createElement("h2",null,title),description),
  };
  if(id==="./AccountEmailWorkflowCard")return{AccountEmailWorkflowCard:()=>null};
  if(id==="./AccountPasswordCard")return{AccountPasswordCard:()=>null};
  return originalLoad.call(this,id,...args);
};
const ProfilePage=require("../src/app/dashboard/settings/profile/page").default as typeof Component;
Module._load=originalLoad;
const {render,cleanup,fireEvent,within,waitFor}=require("@testing-library/react") as typeof import("@testing-library/react");
afterEach(()=>{cleanup();saved={...baseline};stale=false;rejectSave=false;signedInId="member-a";writes=[];});
async function setup(){const ui=within(render(React.createElement(ProfilePage)).container);await waitFor(()=>assert.ok(!ui.queryByText("Loading your information…"), "Profile should finish loading"));return ui;}

test("profile validation rejects future and impossible birthdays and invalid timezone",()=>{
  const today=new Date("2026-09-18T12:00:00Z");
  for(const birthday of ["2026-02-30","2027-01-01","bad"])assert.ok(editing.profileChangeError({birthday},today));
  assert.equal(editing.profileChangeError({birthday:"2000-02-29",timezone:"America/New_York"},today),null);
  assert.ok(editing.profileChangeError({timezone:"Eastern-ish"},today));
  assert.equal(editing.profileAge("1972-04-11",today),54);
});
test("profile patch only contains changed allowlisted fields and supports clearing",()=>{
  const original=editing.profileToForm(baseline);
  assert.deepEqual(editing.profileChanges({...original, preferred_name:" Alex ",location:"",role:"admin"} as editing.ProfileForm,original),{location:null});
  assert.deepEqual(editing.profileChanges(original,original),{});
});
test("saving returns one confirmed row, prevents duplicate writes and keeps success visible",async()=>{
  const ui=await setup();
  fireEvent.change(ui.getByLabelText("Preferred name"),{target:{value:"Alexandra"}});
  const save=ui.getByRole("button",{name:"Save changes"});fireEvent.click(save);fireEvent.click(save);
  await waitFor(()=>assert.match(ui.getByRole("status").textContent||"",/is saved/));
  assert.equal(writes.length,1);assert.deepEqual(writes[0].patch,{preferred_name:"Alexandra"});
  assert.deepEqual(writes[0].filters,{id:"member-a",updated_at:baseline.updated_at});
  assert.equal((ui.getByRole("button",{name:"Save changes"}) as HTMLButtonElement).disabled,true);
  assert.equal((ui.getByLabelText("Preferred name") as HTMLInputElement).value,"Alexandra");
});
test("stale profile does not report success and retains the unsaved draft",async()=>{
  const ui=await setup();stale=true;
  fireEvent.change(ui.getByLabelText("Location"),{target:{value:"Chesapeake"}});fireEvent.click(ui.getByRole("button",{name:"Save changes"}));
  await waitFor(()=>assert.match(ui.getByRole("alert").textContent||"",/another window/));
  assert.equal((ui.getByLabelText("Location") as HTMLInputElement).value,"Chesapeake");assert.ok(!ui.queryByRole("status"));
});
test("reload requires an explicit discard choice when edits are unsaved",async()=>{
  const ui=await setup();fireEvent.change(ui.getByLabelText("Location"),{target:{value:"Chesapeake"}});
  fireEvent.click(ui.getByRole("button",{name:"Reload saved information"}));
  assert.equal((ui.getByLabelText("Location") as HTMLInputElement).value,"Chesapeake");
  fireEvent.click(ui.getByRole("button",{name:"Keep editing"}));
  fireEvent.click(ui.getByRole("button",{name:"Reload saved information"}));fireEvent.click(ui.getByRole("button",{name:"Discard edits and reload"}));
  await waitFor(()=>assert.equal((ui.getByLabelText("Location") as HTMLInputElement).value,"Norfolk"));
});
test("network failure releases save lock and retains the draft",async()=>{
  const ui=await setup();rejectSave=true;fireEvent.change(ui.getByLabelText("Location"),{target:{value:"Chesapeake"}});fireEvent.click(ui.getByRole("button",{name:"Save changes"}));
  await waitFor(()=>assert.ok(ui.getByRole("alert")));
  assert.equal((ui.getByRole("button",{name:"Save changes"}) as HTMLButtonElement).disabled,false);
  assert.equal((ui.getByLabelText("Location") as HTMLInputElement).value,"Chesapeake");
});
test("missing profile cannot be saved or silently recreated",async()=>{
  saved=null;const ui=await setup();assert.match(ui.getByRole("alert").textContent||"",/isn’t available/);
  assert.equal((ui.getByLabelText("Location") as HTMLInputElement).disabled,true);assert.equal(writes.length,0);
});
test("account change blocks writing the previously loaded member profile",async()=>{
  const ui=await setup();signedInId="member-b";fireEvent.change(ui.getByLabelText("Location"),{target:{value:"Chesapeake"}});fireEvent.click(ui.getByRole("button",{name:"Save changes"}));
  await waitFor(()=>assert.match(ui.getByRole("alert").textContent||"",/sign-in changed/));assert.equal(writes.length,0);
});
