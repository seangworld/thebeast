import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createElement} from 'react';
import {render,waitFor,cleanup,act} from '@testing-library/react';
test('registration confirmation requires verified success and preserves the current application URL',async()=>{
 const dom=new JSDOM('<html><body></body></html>',{url:'https://beast.test/dashboard/money?view=month&registration=complete#summary'}),old=new Map<string,PropertyDescriptor|undefined>();
 for(const [key,value] of Object.entries({window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement})){old.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true,writable:true})}
 const Module=require('node:module'),load=Module._load;let user:{email_confirmed_at:string|null}={email_confirmed_at:'2026-11-04'},deferred:((value:unknown)=>void)|undefined;
 const client={auth:{getUser:async()=>({data:{user},error:null})}};
 try{
  Module._load=function(name:string,...args:unknown[]){if(name==='@/lib/supabase/client')return{createClient:()=>client};return load.call(this,name,...args)};
  const {RegistrationConfirmation}=require('../src/app/components/auth/RegistrationConfirmation') as typeof import('../src/app/components/auth/RegistrationConfirmation');Module._load=load;
  const view=render(createElement(RegistrationConfirmation));await waitFor(()=>assert.match(view.getByRole('status').textContent||'',/Registration succeeded/));const url=new URL(dom.window.location.href);assert.equal(url.pathname,'/dashboard/money');assert.equal(url.searchParams.get('view'),'month');assert.equal(url.hash,'#summary');assert.equal(url.searchParams.has('registration'),false);view.unmount();
  dom.window.history.replaceState({},'','/dashboard/today?registration=complete');user={email_confirmed_at:null};const unverified=render(createElement(RegistrationConfirmation));await act(async()=>{});assert.equal(unverified.queryByRole('status'),null);unverified.unmount();
  user={email_confirmed_at:'2026-11-04'};client.auth.getUser=()=>new Promise(resolve=>{deferred=resolve as (value:unknown)=>void});const late=render(createElement(RegistrationConfirmation));dom.window.history.replaceState({},'','/dashboard/health');await act(async()=>{deferred?.({data:{user},error:null})});assert.equal(dom.window.location.pathname,'/dashboard/health');assert.equal(late.queryByRole('status'),null);
 }finally{Module._load=load;cleanup();for(const [key,descriptor] of Array.from(old)){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else Reflect.deleteProperty(globalThis,key)}dom.window.close()}
});
