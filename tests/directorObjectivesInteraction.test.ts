import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { JSDOM } from "jsdom";
import DirectorObjectives from "../src/app/dashboard/director/DirectorObjectives";
import type * as AssignmentRoute from "../src/app/api/director/assignments/route";

const routeContract: keyof typeof AssignmentRoute = "POST";
const dom = new JSDOM("<html><body></body></html>", { url: "http://localhost/dashboard/director" });
Object.defineProperties(globalThis, {
  window: { value: dom.window, configurable: true }, document: { value: dom.window.document, configurable: true },
  navigator: { value: dom.window.navigator, configurable: true }, HTMLElement: { value: dom.window.HTMLElement, configurable: true },
  Node: { value: dom.window.Node, configurable: true }, MutationObserver: { value: dom.window.MutationObserver, configurable: true },
  IS_REACT_ACT_ENVIRONMENT: { value: true, writable: true, configurable: true },
});
const { render, fireEvent, waitFor, cleanup } = require("@testing-library/react") as typeof import("@testing-library/react");
const originalFetch = globalThis.fetch;
afterEach(() => { cleanup(); globalThis.fetch = originalFetch; });
const goals = [{ id: "saved-goal", title: "Prepare appointment and cash review", category: "Health" }];
const assigned = { id: "checkpoint", capability: "health.preparation-review", status: "planned", dependencies: [], attempts: 0, blocker: null, events: [], result: null };

test("Director objective UI authorizes a plan, executes a checkpoint, displays evidence, and restores saved history", async () => {
  assert.equal(routeContract, "POST");
  const writes: Record<string, unknown>[] = []; let tasks: unknown[] = [];
  globalThis.fetch = (async (url: unknown, init?: RequestInit) => {
    if (init?.method === "POST") {
      const body = JSON.parse(String(init.body)); writes.push(body);
      tasks = body.action === "plan" ? [assigned] : [{ ...assigned, status: "verified", attempts: 1, result: { asOf: new Date().toISOString(), output: { medicationReview: [{ title: "Synthetic medication" }] }, limitations: ["Saved-record review only"] } }];
      return Response.json({ assignments: tasks, outcome: { detail: "Checkpoint independently recomputed." } });
    }
    return Response.json(String(url).includes("goalId=") ? { assignments: tasks } : { goals });
  }) as typeof fetch;
  const view = render(React.createElement(DirectorObjectives));
  await waitFor(() => assert.ok(view.getByRole("option", { name: goals[0].title, hidden: true })));
  fireEvent.click(view.getByText(/Supervised objectives/));
  fireEvent.change(view.getByLabelText("Saved objective"), { target: { value: "saved-goal" } });
  await waitFor(() => assert.equal(view.queryByRole("alert"), null));
  fireEvent.click(view.getByLabelText("Health Advisor: record preparation"));
  fireEvent.click(view.getByRole("button", { name: "Save review plan" }));
  await waitFor(() => assert.equal(writes.length, 1));
  await waitFor(() => assert.ok(view.getByText(/record preparation · planned/)));
  fireEvent.click(view.getByRole("button", { name: "Resume next checkpoint" }));
  await waitFor(() => assert.ok(view.getByText(/record preparation · verified/)));
  assert.deepEqual(writes.map((body) => body.action), ["plan", "resume"]);
  assert.deepEqual(writes[0].capabilities, ["health.preparation-review"]);
  assert.ok(view.getByText(/medicationReview/));
  view.unmount();
  const restored = render(React.createElement(DirectorObjectives));
  await waitFor(() => assert.ok(restored.getByRole("option", { name: goals[0].title, hidden: true })));
  fireEvent.click(restored.getByText(/Supervised objectives/));
  fireEvent.change(restored.getByLabelText("Saved objective"), { target: { value: "saved-goal" } });
  await waitFor(() => assert.ok(restored.getByText(/record preparation · verified/)));
  assert.equal(writes.length, 2, "restoration must not execute work again");
});

test("Director objective UI reports unavailable persistence without fabricated progress", async () => {
  globalThis.fetch = (async () => Response.json({ error: "Saved objectives unavailable." }, { status: 503 })) as typeof fetch;
  const view = render(React.createElement(DirectorObjectives));
  await waitFor(() => assert.match(view.getByRole("alert", { hidden: true }).textContent || "", /unavailable/));
  assert.equal((view.getByRole("button", { name: "Resume next checkpoint", hidden: true }) as HTMLButtonElement).disabled, true);
});

test("scoped requirements leave independent review approval enabled and show what remains blocked", async()=>{
  const proposal={id:"proposal",content:{directorPlan:{plan:{contractVersion:2,requirements:[{scope:"money.cash-review",kind:"required_information",detail:"Cash-specific source issue"}],interpretation:"Independent permitted care can proceed",steps:[{capability:"health.preparation-review",purpose:"Care review",acceptance:"Current permitted records",dependsOn:[]},{capability:"money.cash-review",purpose:"Cash review",acceptance:"Saved consistency",dependsOn:[]}],planningNotes:["Ordinary approval is handled by this button"],evidenceClaims:[],alternatives:[],contradictions:[],missingInformation:[],ownerDecisions:[],unsupportedWork:[],assessments:[]}}}};
  const writes:Record<string,unknown>[]=[];
  globalThis.fetch=(async(url:unknown,init?:RequestInit)=>{
    if(init?.method==="POST"){writes.push(JSON.parse(String(init.body)));return Response.json({assignments:[assigned]});}
    return Response.json(String(url).includes("goalId=")?{assignments:[],proposal}:{goals});
  }) as typeof fetch;
  const view=render(React.createElement(DirectorObjectives));await waitFor(()=>assert.ok(view.getByRole("option",{name:goals[0].title,hidden:true})));fireEvent.click(view.getByText(/Supervised objectives/));fireEvent.change(view.getByLabelText("Saved objective"),{target:{value:"saved-goal"}});
  await waitFor(()=>assert.ok(view.getByText("Cash-specific source issue",{exact:false})));
  const button=view.getByRole("button",{name:"Authorize supported steps"}) as HTMLButtonElement;assert.equal(button.disabled,false);fireEvent.click(button);await waitFor(()=>assert.equal(writes.length,1));assert.equal(writes[0].action,"approve_reasoned_plan");assert.equal(writes[0].proposalId,"proposal");
});

test("current cancellation is an explicit owner action and preserves displayed completed evidence",async()=>{
  const complete={...assigned,id:"care",status:"verified",attempts:1,result:{asOf:new Date().toISOString(),output:{review:"saved only"},limitations:["No life goal completion"]}};
  const pending={...assigned,id:"cash",capability:"money.cash-review"};let writes=0;
  globalThis.fetch=(async(url:unknown,init?:RequestInit)=>{
    if(init?.method==="POST"){assert.equal(JSON.parse(String(init.body)).action,"cancel");writes++;return Response.json({assignments:[complete,{...pending,status:"cancelled"}],notice:"Remaining visible reviews cancelled. Verified reviews retained."});}
    return Response.json(String(url).includes("goalId=")?{assignments:[complete,pending]}:{goals});
  }) as typeof fetch;
  const view=render(React.createElement(DirectorObjectives));await waitFor(()=>assert.ok(view.getByRole("option",{name:goals[0].title,hidden:true})));fireEvent.click(view.getByText(/Supervised objectives/));fireEvent.change(view.getByLabelText("Saved objective"),{target:{value:"saved-goal"}});await waitFor(()=>assert.ok(view.getByText(/saved cash review · planned/)));fireEvent.click(view.getByRole("button",{name:"Cancel remaining reviews"}));await waitFor(()=>assert.equal(writes,1));await waitFor(()=>assert.ok(view.getByText(/saved cash review · cancelled/)));assert.ok(view.getByText(/record preparation · verified/));
});
