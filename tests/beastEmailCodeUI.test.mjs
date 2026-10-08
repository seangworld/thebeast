import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {JSDOM} from 'jsdom';
const require=createRequire(import.meta.url);
const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'https://preview.invalid/login?next=%2Fbeastfusion'});
globalThis.window=dom.window;globalThis.document=dom.window.document;Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});globalThis.HTMLElement=dom.window.HTMLElement;
const React=require('react');const {render,fireEvent,screen,waitFor,cleanup}=require('@testing-library/react');
const ts=require('typescript');
const compiled=ts.transpileModule(readFileSync('src/app/login/page.tsx','utf8'),{compilerOptions:{module:1,target:9,jsx:4,esModuleInterop:true}}).outputText;
const transpile=path=>ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:99,target:99}}).outputText;
const url=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
const experienceURL=url(transpile('src/lib/auth/experience.ts'));const experience=await import(experienceURL);
const emailCode=await import(url(transpile('src/lib/auth/emailCode.ts').replace('"./experience"',JSON.stringify(experienceURL))));
function fixture(enabled){
 const routes=[],analytics=[];let verified=false;
 const auth={getUser:async()=>({data:{user:verified?{id:'user'}:null},error:null}),signInWithOtp:async(input)=>{assert.equal(input.options.shouldCreateUser,false);return {error:null};},verifyOtp:async(input)=>{assert.equal(input.token,'123456');verified=true;return {error:null};},signOut:async()=>({error:null})};
 const params=new URLSearchParams('next=%2Fbeastfusion');const router={replace:path=>routes.push(path),refresh:()=>{}};
 const mocks={'next/image':props=>React.createElement('img',{alt:props.alt}),'next/link':props=>React.createElement('a',{href:props.href},props.children),'next/navigation':{useRouter:()=>router,useSearchParams:()=>params},'@/lib/platform/identity':{beastOSApplications:[],beastOSPlatformIdentity:{role:'Beast',description:'Beast'},beastOSSharedCapabilities:[]},'@/lib/auth/experience':experience,'@/lib/auth/emailCode':emailCode,'@/lib/supabase/client':{createClient:()=>({auth})},'@/lib/analytics/client':{trackBeastFunnelEvent:(...args)=>analytics.push(args)}};
 const previous=process.env.NEXT_PUBLIC_BEAST_EMAIL_CODE_ENABLED;process.env.NEXT_PUBLIC_BEAST_EMAIL_CODE_ENABLED=enabled?'true':'false';
 const module={exports:{}};new Function('require','module','exports',compiled)(name=>mocks[name]??require(name),module,module.exports);
 if(previous===undefined)delete process.env.NEXT_PUBLIC_BEAST_EMAIL_CODE_ENABLED;else process.env.NEXT_PUBLIC_BEAST_EMAIL_CODE_ENABLED=previous;
 return {Page:module.exports.default,routes,analytics};
}
test('email-code option is hidden unless explicitly configured',async()=>{const f=fixture(false);render(React.createElement(f.Page));fireEvent.change(screen.getByLabelText('Email address'),{target:{value:'user@example.com'}});fireEvent.click(screen.getByRole('button',{name:'Email Me a Sign-In Link'}));await screen.findByText('Check your email');assert.equal(screen.queryByLabelText('Email sign-in code'),null);cleanup();});
test('customer can request email, enter a code, and reach the safe purchase destination without handoff or token analytics',async()=>{const f=fixture(true);render(React.createElement(f.Page));fireEvent.change(screen.getByLabelText('Email address'),{target:{value:'user@example.com'}});fireEvent.click(screen.getByRole('button',{name:'Email Me a Sign-In Link'}));await screen.findByText('Check your email');const input=screen.getByLabelText('Email sign-in code');assert.equal(input.getAttribute('autocomplete'),'one-time-code');fireEvent.change(input,{target:{value:'123456'}});fireEvent.click(screen.getByRole('button',{name:'Verify Email Code'}));await waitFor(()=>assert.deepEqual(f.routes,['/beastfusion']));assert.doesNotMatch(JSON.stringify(f.analytics),/123456|user@example.com/);assert.equal(input.value,'');cleanup();});
