import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {JSDOM} from 'jsdom';
const require=createRequire(import.meta.url);
const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'https://preview.invalid/beastfusion/customer'});
globalThis.window=dom.window;globalThis.document=dom.window.document;
Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});
globalThis.HTMLElement=dom.window.HTMLElement;
const React=require('react');
const {render,fireEvent,screen,waitFor,cleanup}=require('@testing-library/react');
const ts=require('typescript');
const source=ts.transpileModule(readFileSync('src/app/beastfusion/customer/CustomerActions.tsx','utf8'),{compilerOptions:{module:1,target:9,jsx:4,esModuleInterop:true}}).outputText;
const mod={exports:{}};new Function('require','module','exports',source)(require,mod,mod.exports);
const Actions=mod.exports.default;
const props={active:true,licenseId:'bf-test'};
const sha='a'.repeat(64);
let calls=[],downloads=[];
dom.window.HTMLAnchorElement.prototype.click=function(){downloads.push({href:this.href,download:this.download,referrerPolicy:this.referrerPolicy});};
const fixture=(body,status=200)=>{calls=[];downloads=[];globalThis.fetch=async(path,options)=>{calls.push({path,options});return {ok:status===200,status,json:async()=>body};};render(React.createElement(Actions,props));};
test('software download requests a fresh entitled link and starts it without exposing the URL in the page',async()=>{
 const url='https://project.supabase.co/storage/download?token=private';fixture({download_url:url,version:'5.3.0-rc',sha256:sha});
 fireEvent.click(screen.getByRole('button',{name:'Download software'}));await screen.findByRole('status');
 assert.equal(calls[0].path,'/api/beastfusion/customer/download');assert.equal(calls[0].options.cache,'no-store');
 assert.equal(downloads[0].href,url);assert.equal(downloads[0].referrerPolicy,'no-referrer');assert.doesNotMatch(document.body.textContent,/token=private/);cleanup();
});
test('expired sign-in shows actionable failure, prevents download and permits retry',async()=>{
 fixture({},401);fireEvent.click(screen.getByRole('button',{name:'Download software'}));await screen.findByRole('alert');
 assert.match(screen.getByRole('alert').textContent,/sign in again/);assert.equal(downloads.length,0);
 globalThis.fetch=async()=>({ok:true,json:async()=>({download_url:'https://project.supabase.co/archive',version:'5.3',sha256:sha})});
 fireEvent.click(screen.getByRole('button',{name:'Download software'}));await screen.findByRole('status');assert.equal(downloads.length,1);cleanup();
});
test('non-HTTPS download payload is rejected',async()=>{
 fixture({download_url:'javascript:alert(1)',version:'5.3',sha256:sha});fireEvent.click(screen.getByRole('button',{name:'Download software'}));await screen.findByRole('alert');assert.equal(downloads.length,0);cleanup();
});
test('copy fetches the key only on action and never renders it',async()=>{
 let copied;Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{copied=text;}},configurable:true});
 fixture({license_key:'private-signed-key'});assert.equal(calls.length,0);fireEvent.click(screen.getByRole('button',{name:'Copy key'}));await screen.findByRole('status');
 assert.equal(copied,'private-signed-key');assert.equal(calls[0].path,'/api/beastfusion/customer/license');assert.doesNotMatch(document.body.textContent,/private-signed-key/);cleanup();
});
test('save exports exact activation key as a text file',async()=>{
 let savedBlob;const previousCreate=URL.createObjectURL;const previousRevoke=URL.revokeObjectURL;
 URL.createObjectURL=blob=>{savedBlob=blob;return 'blob:license';};URL.revokeObjectURL=()=>{};
 fixture({license_key:'private-signed-key'});fireEvent.click(screen.getByRole('button',{name:'Save license'}));await screen.findByRole('status');
 assert.equal(await savedBlob.text(),'private-signed-key\n');assert.equal(downloads[0].download,'beastfusion-activation-key.txt');
 cleanup();URL.createObjectURL=previousCreate;URL.revokeObjectURL=previousRevoke;
});
test('print renders a private key only during the print action and clears it afterwards',async()=>{
 let printed;window.print=()=>{printed=document.body.textContent;};fixture({license_key:'private-print-key'});
 fireEvent.click(screen.getByRole('button',{name:'Print license details'}));await screen.findByRole('status');
 assert.match(printed,/private-print-key/);assert.doesNotMatch(document.body.textContent,/private-print-key/);cleanup();
});
test('inactive licenses cannot invoke key or download controls',()=>{
 calls=[];render(React.createElement(Actions,{...props,active:false}));for(const b of screen.getAllByRole('button'))assert.equal(b.disabled,true);assert.equal(calls.length,0);cleanup();
});
