import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { createElement } from 'react';
import {renderToString} from 'react-dom/server';
import { render, fireEvent, waitFor, cleanup } from '@testing-library/react';
import * as setup from '../src/lib/auth/accountSetup';
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
    const serverHtml=renderToString(createElement(UniversalAuth,{onSignedIn:()=>{}}));assert.match(serverHtml, /<form[^>]*method="post"/);assert.match(serverHtml, /<button[^>]*disabled/);
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
  let currentUsername:string|null=null;const client={rpc:async()=>({data:currentUsername,error:null}),auth:{getUser:async()=>({data:{user:{id:'fixture-subject',email_confirmed_at:'2026-11-03'}},error:null})}};
  Module._load=function(name:string,...args:unknown[]){if(name==='@/lib/auth/accountSetup')return setup;if(name==='@/lib/supabase/client')return{createClient:()=>client};return originalLoad.call(this,name,...args)};
  const {UsernameClaim}=require('../src/app/components/auth/UsernameClaim') as typeof import('../src/app/components/auth/UsernameClaim');
  Module._load=originalLoad;
  let body:Record<string,unknown>|undefined;
  globalThis.fetch=async(_url,input)=>{body=JSON.parse(String(input?.body));return new Response(JSON.stringify({message:'Username claimed.',username:'fixture_username'}),{status:200})};
  const view=render(createElement(UsernameClaim));
  await waitFor(()=>assert.ok(view.getByLabelText('Login username')));
  fireEvent.change(view.getByLabelText('Login username'),{target:{value:'fixture_username'}});
  fireEvent.submit(view.container.querySelector('form')!);
  await waitFor(()=>assert.equal(view.getByRole('status').textContent,'Username claimed.'));
  assert.equal(body?.action,'claim');assert.equal(body?.expectedSubject,'fixture-subject');assert.equal(body?.user_id,undefined);assert.ok(view.getByText('fixture_username'));assert.equal(view.container.querySelector('form'),null);
  view.unmount();currentUsername='preserved_username';const existing=render(createElement(UsernameClaim));await waitFor(()=>assert.ok(existing.getByText('preserved_username')));assert.equal(existing.container.querySelector('input'),null);
 } finally {Module._load=originalLoad;restore()}
});

test('username email recovery never creates users and uses the same private notice for unknown addresses',async()=>{
 const restore=browser();const Module=require('node:module');const originalLoad=Module._load;
 try{
  const requests:Array<{email:string;options:{shouldCreateUser:boolean;emailRedirectTo:string}}>=[];
  const client={auth:{signInWithOtp:async(input:{email:string;options:{shouldCreateUser:boolean;emailRedirectTo:string}})=>{requests.push(input);return {error:{code:'user_not_found'}}}}};
  Module._load=function(name:string,...args:unknown[]){if(name==='@/lib/supabase/client')return{createClient:()=>client};if(name==='@/lib/auth/experience')return require('../src/lib/auth/experience');return originalLoad.call(this,name,...args)};
  const {AccountRecoveryEmail}=require('../src/app/components/auth/AccountRecoveryEmail') as typeof import('../src/app/components/auth/AccountRecoveryEmail');Module._load=originalLoad;
  const serverHtml=renderToString(createElement(AccountRecoveryEmail,{kind:'username'}));assert.match(serverHtml, /<form[^>]*method="post"/);assert.match(serverHtml, /<button[^>]*disabled/);
  const view=render(createElement(AccountRecoveryEmail,{kind:'username'}));fireEvent.change(view.getByLabelText('Registered email address'),{target:{value:'unknown@example.test'}});fireEvent.submit(view.container.querySelector('form')!);
  await waitFor(()=>assert.match(view.getByRole('status').textContent||'',/If this address can receive/));assert.equal(requests[0].options.shouldCreateUser,false);assert.equal(new URL(requests[0].options.emailRedirectTo).searchParams.get('next'),'/dashboard/settings/profile#account-username');
  fireEvent.submit(view.container.querySelector('form')!);assert.equal(requests.length,1);assert.match(view.getByRole('status').textContent||'',/one minute/);
 }finally{Module._load=originalLoad;restore()}
});

test('username format feedback is immediate and stale availability cannot overwrite newer input',async()=>{
 const restore=browser();try{
  let finish:((response:Response)=>void)|undefined;const requests:unknown[]=[];
  globalThis.fetch=async(_url,input)=>{requests.push(JSON.parse(String(input?.body)));return new Promise<Response>(resolve=>{finish=resolve})};
  const view=render(createElement(UniversalAuth,{action:'register',onSignedIn:()=>{}}));const field=view.getByLabelText('Username');
  fireEvent.input(field,{target:{value:'1invalid'}});assert.ok(view.getByText('Enter a valid username using the rules above.'));assert.equal(requests.length,0);
  assert.ok(view.getByText(setup.USERNAME_REQUIREMENTS));fireEvent.input(field,{target:{value:'valid_name'}});
  await waitFor(()=>assert.equal(requests.length,1),{timeout:1500});assert.deepEqual(requests[0],{action:'availability',username:'valid_name'});
  fireEvent.input(field,{target:{value:'another invalid'}});finish!(new Response(JSON.stringify({message:'That username is available.'})));await new Promise(resolve=>setTimeout(resolve,10));assert.equal(view.queryByText('That username is available.'),null);assert.ok(view.getByText('Enter a valid username using the rules above.'));
 }finally{restore()}
});

test('enabled username mail uses neutral server recovery without minting a sign-in token',async()=>{
 const restore=browser(),old=process.env.NEXT_PUBLIC_BEAST_USERNAME_MAIL_ENABLED;process.env.NEXT_PUBLIC_BEAST_USERNAME_MAIL_ENABLED='true';try{
  const {AccountRecoveryEmail}=require('../src/app/components/auth/AccountRecoveryEmail') as typeof import('../src/app/components/auth/AccountRecoveryEmail');let body:any;globalThis.fetch=async(url,input)=>{assert.equal(url,'/api/auth/username-mail');body=JSON.parse(String(input?.body));return new Response(JSON.stringify({message:'If this verified address belongs to a Beast account, check your inbox.'}),{status:202})};
  const view=render(createElement(AccountRecoveryEmail,{kind:'username',destination:'/account-setup?app=beastguide&next=library'}));assert.ok(view.getByRole('button',{name:'Email my username'}));fireEvent.change(view.getByLabelText('Registered email address'),{target:{value:'verified@example.test'}});fireEvent.submit(view.container.querySelector('form')!);await waitFor(()=>assert.match(view.getByRole('status').textContent||'',/If this verified address/));assert.deepEqual(body,{action:'recover',email:'verified@example.test',next:'/account-setup?app=beastguide&next=library'});
 }finally{if(old===undefined)delete process.env.NEXT_PUBLIC_BEAST_USERNAME_MAIL_ENABLED;else process.env.NEXT_PUBLIC_BEAST_USERNAME_MAIL_ENABLED=old;restore()}
});
