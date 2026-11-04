import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement } from 'react';
import { render, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { UniversalAuth } from '../src/app/components/auth/UniversalAuth';

function browser() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://beast.test' });
  const old = new Map<string, PropertyDescriptor | undefined>();
  for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, FormData: dom.window.FormData })) {
    old.set(key, Object.getOwnPropertyDescriptor(globalThis,key)); Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});
  }
  const fetchBefore = globalThis.fetch;
  return () => { cleanup(); globalThis.fetch=fetchBefore; for(const [key,descriptor] of Array.from(old)){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else Reflect.deleteProperty(globalThis,key)} dom.window.close(); };
}
test('shared login submits credentials only to same-origin gateway and clears password on success', async () => {
  const restore=browser();
  try {
    let signedIn=0;const requests:Array<{url:string;input:RequestInit|undefined}>=[];
    globalThis.fetch=async(url,input)=>{requests.push({url:String(url),input});return new Response(JSON.stringify({message:'Signed in.'}),{status:200})};
    const view=render(createElement(UniversalAuth,{onSignedIn:()=>{signedIn++}}));
    const username=view.getByLabelText('Username') as HTMLInputElement,password=view.getByLabelText('Password') as HTMLInputElement;
    assert.equal(password.autocomplete,'current-password');
    fireEvent.change(username,{target:{value:'My_Beast'}});fireEvent.change(password,{target:{value:'synthetic-password-123'}});
    fireEvent.submit(view.container.querySelector('form')!);
    await waitFor(()=>assert.equal(signedIn,1));
    assert.equal(requests[0].url,'/api/auth/universal');assert.equal(requests[0].input?.credentials,'same-origin');
    const body=JSON.parse(String(requests[0].input?.body));assert.equal(body.action,'login');assert.equal(body.username,'My_Beast');assert.equal(password.value,'');
    assert.equal(view.getByRole('link',{name:'Forgot password?'}).getAttribute('href'),'/forgot-password');
  } finally {restore()}
});
test('registration requires username/email/password and waits for one-time verification without signing in', async()=>{
 const restore=browser();try{
  let signedIn=false;globalThis.fetch=async()=>new Response(JSON.stringify({message:'If registration can proceed, check your email to verify your account.'}),{status:200});
  const view=render(createElement(UniversalAuth,{action:'register',onSignedIn:()=>{signedIn=true}}));
  for(const [label,value] of [['Username','acceptance_beast'],['Email address','synthetic@example.com'],['Password','synthetic-password-123']])fireEvent.change(view.getByLabelText(label),{target:{value}});
  fireEvent.submit(view.container.querySelector('form')!);
  await waitFor(()=>assert.ok(view.getByRole('status').textContent?.includes('verify your account')));
  assert.equal(signedIn,false);assert.equal(view.container.querySelector('input[type="password"]'),null);
 }finally{restore()}
});

test('claim UI binds the verified subject and submits no client-selected ownership', async()=>{
 const restore=browser();const Module=require('node:module');const originalLoad=Module._load;
 try {
  const client={auth:{getUser:async()=>({data:{user:{id:'fixture-subject',email_confirmed_at:'2026-11-03'}},error:null})}};
  Module._load=function(name:string,...args:unknown[]){if(name==='@/lib/supabase/client')return{createClient:()=>client};return originalLoad.call(this,name,...args)};
  const {UsernameClaim}=require('../src/app/components/auth/UsernameClaim') as typeof import('../src/app/components/auth/UsernameClaim');
  Module._load=originalLoad;
  let body:Record<string,unknown>|undefined;
  globalThis.fetch=async(_url,input)=>{body=JSON.parse(String(input?.body));return new Response(JSON.stringify({message:'Username claimed.'}),{status:200})};
  const view=render(createElement(UsernameClaim));
  fireEvent.change(view.getByLabelText('Login username'),{target:{value:'fixture_username'}});
  fireEvent.submit(view.container.querySelector('form')!);
  await waitFor(()=>assert.equal(view.getByRole('status').textContent,'Username claimed.'));
  assert.equal(body?.action,'claim');assert.equal(body?.expectedSubject,'fixture-subject');assert.equal(body?.user_id,undefined);
 } finally {Module._load=originalLoad;restore()}
});
