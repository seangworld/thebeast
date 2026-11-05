import test from "node:test";
import assert from "node:assert/strict";
import {beastModuleRegistry,beastGuideModule} from "../src/lib/moduleRegistry";
import {buildApplicationNavigationForPersona} from "../src/lib/moduleNavigation";
import {beastGuideAvailable,CANONICAL_BEAST_AUTH} from "../src/lib/beastguide/configuration";
import {beastGuideRuntimeEnvironment} from "../src/lib/beastguide/runtime";
import {bearerMatchesCookieUser,readGuideBody} from "../src/lib/beastguide/http";

test("BeastGuide navigation uses normal module access overrides",()=>{
 const registry=[...beastModuleRegistry.filter(e=>e.id!=="beastguide"),beastGuideModule];
 assert.equal(buildApplicationNavigationForPersona({isOwner:false,registry}).find(e=>e.module==="beastguide")?.href,"/dashboard/beastguide");
 assert.ok(!buildApplicationNavigationForPersona({isOwner:false,registry,moduleAccess:[{moduleId:"beastguide",enabled:false}]}).some(e=>e.module==="beastguide"));
 assert.equal(beastGuideModule.visibility,"beta");
});
test("integration is off by default and cannot use development Auth",()=>{
 assert.equal(beastGuideAvailable({}),false);
 assert.equal(beastGuideAvailable({enabled:"true",authUrl:"https://zvzcojwjgnedrouilovc.supabase.co"}),false);
 assert.equal(beastGuideAvailable({enabled:"true",authUrl:CANONICAL_BEAST_AUTH}),true);
});
test("embedded runtime has scoped credentials and never enables separate registration",()=>{
 const env=beastGuideRuntimeEnvironment({NODE_ENV:"test",BEAST_ACCOUNT_SETUP_REQUIRED:"true",BEASTGUIDE_TARGET:"preview",BEASTGUIDE_PREVIEW_DATA_DATABASE_URL:"preview-scoped",BEAST_IDENTITY_DATA_DATABASE_URL:"unrelated",BEAST_CANONICAL_AUTH_ADMIN_KEY:"forbidden",BEAST_REGISTRATION_VALIDATED:"true"});
 assert.equal(env.BEAST_IDENTITY_TARGET,"preview");assert.equal(env.BEAST_PREVIEW_DATA_DATABASE_URL,"preview-scoped");assert.equal(env.BEAST_IDENTITY_DATA_DATABASE_URL,undefined);
 assert.equal(env.BEAST_ACCOUNT_SETUP_REQUIRED,"true");assert.equal(env.BEAST_REGISTRATION_VALIDATED,"false");assert.ok(!("BEAST_CANONICAL_AUTH_ADMIN_KEY" in env));
});
test("bearer for another account cannot be combined with the BeastOS cookie account",()=>{
 const token=(sub:string)=>"a."+Buffer.from(JSON.stringify({sub})).toString("base64url")+".c";
 assert.equal(bearerMatchesCookieUser("Bearer "+token("a"),"a"),true);
 assert.equal(bearerMatchesCookieUser("Bearer "+token("b"),"a"),false);
 assert.equal(bearerMatchesCookieUser("Bearer malformed","a"),false);
});
test("JSON body is bounded even when content length is omitted",async()=>{
 const request=(value:string)=>new Request("https://example.test/api/beastguide/identity",{method:"POST",headers:{"content-type":"application/json"},body:value});
 assert.deepEqual(await readGuideBody(request('{"action":"status"}')),{action:"status"});
 await assert.rejects(readGuideBody(request('"'+"x".repeat(65536)+'"')),e=>(e as {status:number}).status===413);
 await assert.rejects(readGuideBody(request("bad json")),e=>(e as {status:number}).status===400);
});
