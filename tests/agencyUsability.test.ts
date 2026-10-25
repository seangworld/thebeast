import assert from 'node:assert/strict';
import test,{afterEach} from 'node:test';
import React from 'react';
import {JSDOM} from 'jsdom';
import type {AgencyMetricsContent as AgencyComponent} from '../src/app/dashboard/admin/agency/metrics/AgencyMetricsContent';
import * as appearance from '../src/lib/agencyAppearance';
import * as brand from '../src/lib/agencyBrand';
const dom=new JSDOM('<html><body></body></html>',{url:'https://beast.test/dashboard/admin/agency/metrics'});
Object.defineProperties(globalThis,{window:{value:dom.window,configurable:true},document:{value:dom.window.document,configurable:true},navigator:{value:dom.window.navigator,configurable:true},HTMLElement:{value:dom.window.HTMLElement,configurable:true},Node:{value:dom.window.Node,configurable:true},MutationObserver:{value:dom.window.MutationObserver,configurable:true},IS_REACT_ACT_ENVIRONMENT:{value:true,writable:true,configurable:true}});
const Module=require('node:module'),original=Module._load;
Module._load=function(id:string,...args:unknown[]){if(id==='@/lib/agencyBrand')return brand;if(id==='@/lib/agencyAppearance')return appearance;if(id==='next/link')return {__esModule:true,default:({children,...props}:any)=>React.createElement('a',props,children)};if(id==='next/image')return {__esModule:true,default:({unoptimized,...props}:any)=>React.createElement('img',props)};return original.call(this,id,...args);};
const {AgencyMetricsContent}=require('../src/app/dashboard/admin/agency/metrics/AgencyMetricsContent') as {AgencyMetricsContent:typeof AgencyComponent};Module._load=original;
const {render,cleanup,fireEvent}=require('@testing-library/react') as typeof import('@testing-library/react');afterEach(cleanup);
const profile={id:'cole',name:brand.COLE_NAME,updated_at:'epoch',visual_identity:{direction:'locked'},voice_identity:{direction:'calm'},presentation_rules:{audience:'adults'},allowed_topics:[]};
function snapshot(metrics:unknown,bound=true){return {profiles:[profile],connections:[{id:'saved',account_id:'123',label:'@cole.after.hours',expires_at:null}],bindings:bound?[{presenter_profile_id:'cole',expected_account_id:'123',expected_username:'cole.after.hours',metrics,metrics_checked_at:'2026-10-24T23:59:33Z',metrics_error:null}]:[],posts:[],configuration:{meta:true},automationEnabled:false,dmEnabled:false};}
test('bound account shows four sections, genuine zero versus unavailable, collapsed technical details and read-only refresh only',async()=>{
 const calls:any[]=[];globalThis.fetch=(async(_url,options)=>{if(options?.method==='POST'){calls.push(JSON.parse(options.body as string));return Response.json({saved:true});}return Response.json(snapshot({followers:0,mediaCount:null}));}) as typeof fetch;
 const ui=render(React.createElement(AgencyMetricsContent));await ui.findByText('Connected and assigned to Cole: @cole.after.hours');
 for(const name of ['Account','Brand & Style','Posts','Results'])assert.ok(ui.getByRole('heading',{name}));
 assert.equal(ui.queryByRole('button',{name:'Connect Instagram'}),null);assert.ok(ui.getByText('0',{exact:true}));assert.ok(ui.getByText('Unavailable',{exact:true}));
 for(const summary of ui.getAllByText('Technical details',{exact:true}))assert.equal(summary.parentElement?.hasAttribute('open'),false);
 assert.ok(ui.getByText(/Publishing paused/));fireEvent.click(ui.getByRole('button',{name:'Update account numbers (read only)'}));await ui.findByText('Account numbers checked. See Results below.');assert.deepEqual(calls,[{presenterProfileId:'cole',action:'accountMetrics'}]);
});
test('saved but unbound account asks for explicit username confirmation without forcing reconnection',async()=>{
 globalThis.fetch=(async()=>Response.json(snapshot(null,false))) as typeof fetch;const ui=render(React.createElement(AgencyMetricsContent));await ui.findByText('Connection saved. Confirm the account below to assign it to Cole.');assert.ok(ui.getByLabelText('Instagram username (with or without @)'));assert.equal(ui.queryByRole('button',{name:'Connect Instagram'}),null);assert.equal((ui.getByRole('button',{name:'Confirm Cole’s account'}) as HTMLButtonElement).disabled,true);
});

test('appearance references enlarge without publishing or account writes; provenance stays closed and callback setup notice clears once bound',async()=>{
 dom.window.history.replaceState(null,'','?connection=connected');
 const requests:string[]=[];globalThis.fetch=(async(_url,options)=>{if(options?.method==='POST')requests.push(options.body as string);return Response.json(snapshot({followers:0,mediaCount:0}));}) as typeof fetch;
 const shown:HTMLDialogElement[]=[];
 Object.defineProperty(dom.window.HTMLDialogElement.prototype,'showModal',{configurable:true,value:function(){this.setAttribute('open','');shown.push(this);}});
 const ui=render(React.createElement(AgencyMetricsContent));await ui.findByText('Connected and assigned to Cole: @cole.after.hours');
 assert.equal(ui.queryByText(/Connection callback completed/),null);
 for(const name of ['Cole Mercer','Leila Bautista']){const buttons=ui.getAllByRole('button',{name:`Enlarge ${name} appearance reference`});assert.equal(buttons.length,2);fireEvent.click(buttons[0]);assert.equal(shown.at(-1)?.getAttribute('aria-label'),`${name} appearance reference`);shown.at(-1)?.removeAttribute('open');}
 for(const summary of ui.getAllByText('Source & provenance',{exact:true}))assert.equal(summary.parentElement?.hasAttribute('open'),false);
 assert.ok(ui.getByText('Leila remains deferred.'));assert.deepEqual(requests,[]);
 dom.window.history.replaceState(null,'','/dashboard/admin/agency/metrics');
});
