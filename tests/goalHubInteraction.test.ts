import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import React from "react";
import { JSDOM } from "jsdom";
import * as goals from "../src/lib/platform/goals";
import * as planning from "../src/lib/platform/lifePlanning";
import * as editing from "../src/lib/platform/goalEditing";
import * as connections from "../src/lib/platform/goalConnections";
import type { LifePlanningHub as Component } from "../src/app/dashboard/goals/LifePlanningHub";
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/dashboard/goals" });
Object.defineProperties(globalThis, {
  window: { value: dom.window, configurable: true }, document: { value: dom.window.document, configurable: true }, navigator: { value: dom.window.navigator, configurable: true },
  HTMLElement: { value: dom.window.HTMLElement, configurable: true }, Node: { value: dom.window.Node, configurable: true }, MutationObserver: { value: dom.window.MutationObserver, configurable: true },
  requestAnimationFrame: { value: (fn: () => void) => { fn(); return 0; }, configurable: true }, IS_REACT_ACT_ENVIRONMENT: { value: true, configurable: true, writable: true },
});
let writes: Array<{table:string; payload:Record<string, unknown>; filters:Record<string, unknown>}> = [];
let failFollowup = false; let stale = false;
const client = {
  auth: { getUser: async () => ({data:{user:{id:"member-owner"}},error:null}) },
  from: (table: string) => {
    let write: typeof writes[number] | undefined;
    const chain = {
      insert: (payload:Record<string, unknown>) => { write = {table,payload,filters:{}}; writes.push(write); return chain; },
      update: (payload:Record<string, unknown>) => { write = {table,payload,filters:{}}; writes.push(write); return chain; },
      upsert: (payload:Record<string, unknown>) => { write = {table,payload,filters:{}}; writes.push(write); return chain; },
      select: () => chain, eq: (key:string,value:unknown) => { if(write)write.filters[key]=value; return chain; },
      single: async () => ({data:{id:"new-goal",status:"Active"},error:null}),
      then: (resolve: (v:unknown)=>unknown) => Promise.resolve({data:stale?[]:[{id:"existing"}],error:failFollowup && table!=="beast_goals"?{message:"failed"}:null}).then(resolve),
    };return chain;
  },
};
const Module=require("node:module");const old=Module._load;
Module._load=function(id:string,...args:unknown[]){
  if(id==="next/navigation")return{useRouter:()=>({refresh:()=>undefined})};
  if(id==="@/lib/platform/goals")return goals;
  if(id==="@/lib/platform/lifePlanning")return planning;
  if(id==="@/lib/platform/goalEditing")return editing;
  if(id==="@/lib/platform/goalConnections")return connections;
  if(id==="@/lib/supabase/client")return{createClient:()=>client};
  if(id==="@/lib/memberSafeError")return{memberSafeMessage:()=>"Unable to save."};
  return old.call(this,id,...args);
};
const {LifePlanningHub}=require("../src/app/dashboard/goals/LifePlanningHub") as {LifePlanningHub:typeof Component};Module._load=old;
const {render,cleanup,fireEvent,within,waitFor}=require("@testing-library/react") as typeof import("@testing-library/react");
afterEach(()=>{cleanup();writes=[];failFollowup=false;stale=false;});
function setup(initialGoals:goals.Goal[]=[]){return within(render(React.createElement(LifePlanningHub,{initialGoals})).container);}
test("income title suggests Money and Career; saved once despite follow-up failure",async()=>{
  const ui=setup();fireEvent.click(ui.getByRole("button",{name:"Add goal"}));
  const dialog=within(ui.getByRole("dialog"));
  fireEvent.change(dialog.getByLabelText("Title"),{target:{value:"Earn $60,000 per year"}});
  assert.equal((dialog.getByRole("checkbox",{name:"Money"}) as HTMLInputElement).checked,true);
  assert.equal((dialog.getByRole("checkbox",{name:"Education & Career"}) as HTMLInputElement).checked,true);
  failFollowup=true;
  const save=dialog.getByRole("button",{name:"Save goal"});fireEvent.click(save);fireEvent.click(save);
  await waitFor(()=>assert.ok(!ui.queryByRole("dialog"), "Editor should close after saving"));
  assert.equal(writes.filter(item=>item.table==="beast_goals").length,1);
  assert.deepEqual(writes[0].payload.tags,["goal-connection:money","goal-connection:learning"]);
  assert.match(ui.getByRole("status").textContent||"",/goal is saved/);
});
test("category submenu pre-fills new goals and optional advisor connection can be declined",async()=>{
  const ui=setup();fireEvent.click(ui.getByRole("button",{name:"Weight"}));
  fireEvent.click(ui.getByRole("button",{name:"Add goal"}));const dialog=within(ui.getByRole("dialog"));
  assert.equal((dialog.getByLabelText("Category") as HTMLSelectElement).value,"Health");
  assert.equal((dialog.getByLabelText("Tags, comma separated") as HTMLInputElement).value,"weight");
  assert.equal((dialog.getByRole("checkbox",{name:"Health & Fitness"}) as HTMLInputElement).checked,true);
});
test("stale goal edit stays open and does not overwrite original source provenance",async()=>{
  const goal={...goals.mockGoals[0],sourceType:"professional" as const};const ui=setup([goal]);
  fireEvent.click(ui.getByRole("button",{name:"Edit"}));stale=true;
  fireEvent.click(within(ui.getByRole("dialog")).getByRole("button",{name:"Save goal"}));
  await waitFor(()=>assert.match(ui.getByRole("alert").textContent||"",/another window/));
  assert.equal(writes[0].payload.source_type,undefined);
  assert.equal(writes[0].filters.owner_id,"member-owner");assert.equal(writes[0].filters.updated_at,goal.updatedAt);
});
test("milestone editor saves completion with owner and version checks",async()=>{
  const goal={...goals.mockGoals[0],status:"Active" as const};const ui=setup([goal]);
  const section=within(ui.getByRole("region",{name:`Milestones for ${goal.title}`}));
  fireEvent.click(section.getAllByRole("button",{name:"Edit milestone"})[0]);
  fireEvent.change(section.getByLabelText("Milestone status"),{target:{value:"Completed"}});
  fireEvent.click(section.getByRole("button",{name:"Save milestone"}));
  await waitFor(()=>assert.match(section.getByRole("status").textContent||"",/Milestone saved/));
  const write=writes.find(item=>item.table==="beast_goal_milestones")!;
  assert.equal(write.payload.status,"Completed");assert.ok(write.payload.completed_at);
  assert.equal(write.filters.owner_id,"member-owner");assert.equal(write.filters.goal_id,goal.id);
});

test("confirming a quarterly review preserves the goal and scopes the update", async () => {
  const goal = {...goals.mockGoals[0], status: "Active" as const, updatedAt: "2020-01-01T00:00:00Z"};
  const ui = setup([goal]);
  fireEvent.click(ui.getByRole("button", {name: "Review due (1)"}));
  fireEvent.click(ui.getByRole("button", {name: "Still current"}));
  await waitFor(() => assert.match(ui.getByRole("status").textContent || "", /Goal confirmed/));
  const write = writes.find(item => item.table === "beast_goals")!;
  assert.equal(write.payload.status, goal.status);
  assert.equal(write.payload.title, undefined);
  assert.equal(write.filters.owner_id, "member-owner");
  assert.equal(write.filters.updated_at, goal.updatedAt);
  assert.equal(writes.find(item => item.table === "beast_goal_lifecycle_events")?.payload.title, "Goal reviewed — still current");
});
