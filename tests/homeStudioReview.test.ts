import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import React from 'react';
import { JSDOM } from 'jsdom';
import * as studio from '../src/lib/homeStudio';
import type { HomeStudioWorkspace as Component } from '../src/app/dashboard/home/studio/HomeStudioWorkspace';

const project = studio.normalizeHomeStudioProject({ roomName: 'Test office', roomType: 'Home office', style: 'Modern', roomLength: '20', roomWidth: '10' })!;
const plan = studio.normalizeHomeStudioPlan({ title: 'Existing office plan', summary: 'Keep the desk.', conceptPrompt: 'Preserve the desk and window.' })!;

test('room geometry preserves aspect ratio and area for wide, tall and square rooms', () => {
  for (const [length, width] of [[20, 10], [10, 20], [12, 12], [4.25, 3.5]]) {
    const g = studio.homeStudioRoomGeometry({ roomLength: String(length), roomWidth: String(width) })!;
    assert.ok(Math.abs(g.drawingWidth / g.drawingHeight - length / width) < 1e-10);
    assert.equal(g.area, Math.round(length * width * 100) / 100);
    assert.ok(g.drawingWidth <= 420 && g.drawingHeight <= 300);
  }
  for (const roomLength of ['-1', '0', 'abc', '12 ft', '1000', '0.001']) {
    assert.equal(studio.homeStudioRoomGeometry({ roomLength, roomWidth: '10' }), null);
    assert.equal(studio.homeStudioMeasurementIssues({ ...project, roomLength }).length, 1);
  }
  assert.equal(studio.homeStudioMeasurementIssues({ ...project, roomLength: '' }).length, 0);
  assert.match(studio.buildHomeStudioFloorPlanSvg(project), /200 square feet/);
  assert.match(studio.buildHomeStudioFloorPlanSvg(project), /width="420" height="210"/);
});

test('primary photo promotion preserves labels and does not mutate source order', () => {
  const photos = ['Door', 'Window', 'Closet'].map(label => ({ label, name: label, dataUrl: label }));
  assert.deepEqual(studio.homeStudioPrimaryPhoto(photos, 1).map(p => p.label), ['Window', 'Door', 'Closet']);
  assert.equal(photos[0].label, 'Door');
  assert.deepEqual(studio.homeStudioPrimaryPhoto(photos, -1), photos);
  assert.equal(studio.homeStudioBriefMatches(project, { ...project }), true);
  assert.equal(studio.homeStudioBriefMatches(project, { ...project, roomLength: '21' }), false);
});

const dom = new JSDOM('<html><body></body></html>', { url: 'http://localhost/dashboard/home/studio' });
Object.defineProperties(globalThis, {
  self: { value: dom.window, configurable: true },
  window: { value: dom.window, configurable: true }, document: { value: dom.window.document, configurable: true },
  navigator: { value: dom.window.navigator, configurable: true }, HTMLElement: { value: dom.window.HTMLElement, configurable: true },
  Node: { value: dom.window.Node, configurable: true }, MutationObserver: { value: dom.window.MutationObserver, configurable: true },
  IS_REACT_ACT_ENVIRONMENT: { value: true, configurable: true, writable: true },
});
const primitives = require('../src/app/components/design/DashboardPrimitives');
const Module = require('node:module');
const originalLoad = Module._load;
Module._load = function(id: string, ...args: unknown[]) {
  if (id === '@/lib/homeStudio') return studio;
  if (id === '@/lib/homeStudioClient') return { prepareHomeStudioPhoto: async () => 'data:image/jpeg;base64,YQ==' };
  if (id === '@/app/components/design/DashboardPrimitives') return primitives;
  return originalLoad.call(this, id, ...args);
};
const { HomeStudioWorkspace } = require('../src/app/dashboard/home/studio/HomeStudioWorkspace') as { HomeStudioWorkspace: typeof Component };
Module._load = originalLoad;
const { render, cleanup, fireEvent, waitFor, within } = require('@testing-library/react') as typeof import('@testing-library/react');
const originalFetch = globalThis.fetch;
let planCalls = 0;
afterEach(() => { cleanup(); globalThis.fetch = originalFetch; planCalls = 0; });

async function setup() {
  window.confirm = () => true;
  globalThis.fetch = (async (url: string) => {
    if (url.endsWith('/plan')) { planCalls++; return Response.json({ error: 'Provider unavailable' }, { status: 503 }); }
    return Response.json({ projects: [{ id: 'saved', project, plan, sourcePhotoCount: 1, createdAt: '2026-09-21T00:00:00Z', updatedAt: '2026-09-21T00:00:00Z' }] });
  }) as typeof fetch;
  const view = render(React.createElement(HomeStudioWorkspace));
  const ui = within(view.container);
  await waitFor(() => assert.ok(ui.getByRole('button', { name: 'Open' })));
  fireEvent.click(ui.getByRole('button', { name: 'Open' }));
  return { ui, view };
}

test('editing a saved brief preserves its plan, blocks mismatched saves/exports, and supports restoration', async () => {
  const { ui } = await setup();
  fireEvent.change(ui.getByLabelText('Room length'), { target: { value: '25' } });
  assert.ok(ui.getByText('Existing office plan'));
  assert.equal((ui.getByRole('button', { name: 'Update saved project' }) as HTMLButtonElement).disabled, true);
  assert.equal((ui.getByRole('button', { name: 'Download printable packet' }) as HTMLButtonElement).disabled, true);
  fireEvent.click(ui.getByRole('button', { name: 'Restore plan brief' }));
  assert.equal((ui.getByLabelText('Room length') as HTMLInputElement).value, '20');
  assert.equal((ui.getByRole('button', { name: 'Update saved project' }) as HTMLButtonElement).disabled, false);
  assert.equal(planCalls, 0);
});

test('reattaching photos and a failed rebuild preserve the saved plan without a successful provider call', async () => {
  const { ui, view } = await setup();
  fireEvent.change(view.container.querySelector('input[type="file"]')!, { target: { files: [new dom.window.File(['photo'], 'room.jpg', { type: 'image/jpeg' })] } });
  await waitFor(() => assert.ok(ui.getByLabelText('Description for photo 1')));
  assert.ok(ui.getByText('Existing office plan'));
  fireEvent.click(ui.getByRole('button', { name: 'Rebuild design plan' }));
  await waitFor(() => assert.ok(ui.getByText('Provider unavailable')));
  assert.ok(ui.getByText('Existing office plan'));
  assert.equal(planCalls, 1);
  window.confirm = () => false;
  fireEvent.click(ui.getByRole('button', { name: 'Start a new room' }));
  assert.ok(ui.getByText('Existing office plan'));
  window.confirm = () => true;
  fireEvent.click(ui.getByRole('button', { name: 'Start a new room' }));
  assert.equal(ui.queryByText('Existing office plan'), null);
  fireEvent.change(ui.getByLabelText(/Colors or palette/), { target: { value: 'Green' } });
  window.confirm = () => false;
  fireEvent.click(ui.getByRole('button', { name: 'Start a new room' }));
  assert.equal((ui.getByLabelText(/Colors or palette/) as HTMLInputElement).value, 'Green');
  window.confirm = () => true;
  fireEvent.click(ui.getByRole('button', { name: 'Start a new room' }));
  fireEvent.change(ui.getByLabelText('Project or room name'), { target: { value: 'New room' } });
  fireEvent.change(ui.getByLabelText('Room length'), { target: { value: '-1' } });
  assert.equal((ui.getByRole('button', { name: 'Save project' }) as HTMLButtonElement).disabled, true);
  fireEvent.change(ui.getByLabelText('Room length'), { target: { value: '15' } });
  assert.equal((ui.getByRole('button', { name: 'Save project' }) as HTMLButtonElement).disabled, false);
});

test('manual plan, budget, version, save and reopen retain project data without AI requests', async () => {
  window.confirm=()=>true;
  let saved: (studio.HomeStudioSavedProject & {sourcePhotoCount:number}) | null=null;
  globalThis.fetch=(async (url:string,options?:RequestInit)=>{
    assert.ok(url.endsWith('/projects'));
    if(options?.method==='POST') {
      const body=JSON.parse(String(options.body));const normalized=studio.normalizeHomeStudioSavedProject(body)!;
      saved={id:'test-project',...normalized,sourcePhotoCount:0,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
      return Response.json({project:saved});
    }
    return Response.json({projects:saved?[saved]:[]});
  }) as typeof fetch;
  const view=render(React.createElement(HomeStudioWorkspace)); const ui=within(view.container);
  await waitFor(()=>assert.ok(ui.getByText('No saved Home Studio projects yet.')));
  fireEvent.change(ui.getByLabelText('Project or room name'),{target:{value:'Manual office'}});
  fireEvent.click(ui.getByRole('button',{name:'Start manual plan'}));
  fireEvent.change(ui.getByLabelText('Add your own shopping item'),{target:{value:'Desk lamp'}});
  fireEvent.click(ui.getByRole('button',{name:'Add shopping item'}));
  fireEvent.change(ui.getByLabelText('Unit price for Desk lamp'),{target:{value:'25.50'}});
  fireEvent.change(ui.getByLabelText('Quantity for Desk lamp'),{target:{value:'2'}});
  fireEvent.change(ui.getByLabelText('Shopping budget limit (USD)'),{target:{value:'100'}});
  assert.ok(ui.getByText(/Budget balance \$49.00/));
  fireEvent.click(ui.getByText('Design versions and comparison'));
  fireEvent.change(ui.getByLabelText('Version name'),{target:{value:'Original'}});
  fireEvent.click(ui.getByRole('button',{name:'Keep design version'}));
  fireEvent.change(ui.getByLabelText('Unit price for Desk lamp'),{target:{value:'40'}});
  fireEvent.click(ui.getByRole('button',{name:'Restore version'}));
  assert.equal((ui.getByLabelText('Unit price for Desk lamp') as HTMLInputElement).value,'25.50');
  fireEvent.click(ui.getByRole('button',{name:'Save project'}));
  await waitFor(()=>assert.ok(ui.getByText('Project saved. Photos remain session-only and were not stored.')));
  assert.equal(saved!.project.workspace!.versions.length,1);
  assert.equal(saved!.plan!.shoppingList[0].quantity,2);
  fireEvent.click(ui.getByRole('button',{name:'Start a new room'}));
  fireEvent.click(ui.getByRole('button',{name:'Open'}));
  assert.equal((ui.getByLabelText('Shopping budget limit (USD)') as HTMLInputElement).value,'100');
  assert.equal((ui.getByLabelText('Unit price for Desk lamp') as HTMLInputElement).value,'25.50');
  assert.equal(planCalls,0);
});

test('project save locks edits until the request settles', async()=>{
  const {ui}=await setup(); let release:()=>void=()=>{};
  globalThis.fetch=(async()=>{await new Promise<void>(resolve=>{release=resolve});return Response.json({error:'Save unavailable'},{status:503});}) as typeof fetch;
  fireEvent.click(ui.getByRole('button',{name:'Update saved project'}));
  await waitFor(()=>assert.equal((ui.getByLabelText('Project or room name') as HTMLInputElement).matches(':disabled'),true));
  release();
  await waitFor(()=>assert.ok(ui.getByText('Save unavailable')));
  assert.equal((ui.getByLabelText('Project or room name') as HTMLInputElement).matches(':disabled'),false);
});
