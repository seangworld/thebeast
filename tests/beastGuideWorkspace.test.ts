import assert from "node:assert/strict";
import test, {afterEach} from "node:test";
import React from "react";
import type WorkspaceType from "../src/app/dashboard/beastguide/workspace";
import {JSDOM} from "jsdom";
const dom=new JSDOM('<html><body></body></html>',{url:'https://beast.test/dashboard/beastguide'});
Object.defineProperties(globalThis,{window:{value:dom.window,configurable:true},document:{value:dom.window.document,configurable:true},navigator:{value:dom.window.navigator,configurable:true},HTMLElement:{value:dom.window.HTMLElement,configurable:true},Node:{value:dom.window.Node,configurable:true},MutationObserver:{value:dom.window.MutationObserver,configurable:true},IS_REACT_ACT_ENVIRONMENT:{value:true,writable:true,configurable:true}});
let currentClient:any;
const Module=require('node:module'),original=Module._load;
Module._load=function(id:string,...args:unknown[]){if(id==='@/lib/supabase/client')return {createClient:()=>currentClient};return original.call(this,id,...args)};
const Workspace=require('../src/app/dashboard/beastguide/workspace').default as typeof WorkspaceType;
Module._load=original;
const {render,cleanup,act}=require('@testing-library/react') as typeof import('@testing-library/react');
afterEach(()=>{cleanup();delete window.__BEASTGUIDE_HOST__;});
function fixture(result:Promise<unknown>){let listener:(event:string)=>void=()=>{},unsubscribed=0;currentClient={auth:{getUser:()=>result,onAuthStateChange:(callback:(event:string)=>void)=>{listener=callback;return {data:{subscription:{unsubscribe(){unsubscribed++}}}}}}};return {client:currentClient,event:(e:string)=>listener(e),unsubscribed:()=>unsubscribed}}
test('BeastGuide waits for verified BeastOS user before loading its frame',async()=>{
 let complete:(v:unknown)=>void=()=>{};const f=fixture(new Promise(resolve=>complete=resolve));const ui=render(React.createElement(Workspace));
 assert.equal(ui.queryByTitle('BeastGuide'),null);assert.ok(ui.getByRole('status'));
 await act(async()=>complete({data:{user:{id:'canonical-user'}},error:null}));
 assert.equal((await ui.findByTitle('BeastGuide')).getAttribute('src'),'/beastguide-app/index.html');
 assert.equal(window.__BEASTGUIDE_HOST__?.supabase,f.client);assert.equal(window.__BEASTGUIDE_HOST__?.accountHref,'/dashboard/settings/profile');
});
test('failed account verification never opens an entertainment session',async()=>{
 fixture(Promise.resolve({data:{user:null},error:new Error('unavailable')}));const ui=render(React.createElement(Workspace));await ui.findByRole('alert');assert.equal(ui.queryByTitle('BeastGuide'),null);assert.equal(window.__BEASTGUIDE_HOST__,undefined);
});
test('BeastOS logout removes the embedded workspace and cleanup detaches listener',async()=>{
 const f=fixture(Promise.resolve({data:{user:{id:'canonical-user'}},error:null}));const ui=render(React.createElement(Workspace));await ui.findByTitle('BeastGuide');act(()=>f.event('SIGNED_OUT'));assert.equal(ui.queryByTitle('BeastGuide'),null);assert.ok(ui.getByRole('alert'));ui.unmount();assert.equal(f.unsubscribed(),1);assert.equal(window.__BEASTGUIDE_HOST__,undefined);
});
test('late verification after navigation cannot recreate an account host',async()=>{
 let complete:(v:unknown)=>void=()=>{};const f=fixture(new Promise(resolve=>complete=resolve));const ui=render(React.createElement(Workspace));ui.unmount();await act(async()=>complete({data:{user:{id:'old'}},error:null}));assert.equal(window.__BEASTGUIDE_HOST__,undefined);assert.equal(f.unsubscribed(),1);
});

test("acceptance workspace identifies isolated test data to the embedded application",async()=>{fixture(Promise.resolve({data:{user:{id:"canonical-user"}},error:null}));const ui=render(React.createElement(Workspace,{acceptancePreview:true}));await ui.findByTitle("BeastGuide");assert.equal(window.__BEASTGUIDE_HOST__?.preview,true);});
