// Local Release UI acceptance. All upstream Auth and submission responses are
// synthetic; no canonical user, email, registry or application record is touched.
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const base=process.env.AUTH_SMOKE_BASE_URL||'http://127.0.0.1:4188';
const browser=await chromium.launch({headless:true});
const passed=[];
try {
 await mkdir('/private/tmp/canonical-auth-ui',{recursive:true});
 for(const width of [390,844,1440]){
  const context=await browser.newContext({viewport:{width,height:900}});
  await context.route('**/*',async route=>{
   const url=new URL(route.request().url());
   if(url.origin===base){
    if(url.pathname==='/api/auth/universal'){
     const body=route.request().postDataJSON();
     assert.ok(body.username);assert.ok(body.password);
     return route.fulfill({status:body.action==='register'?200:401,contentType:'application/json',body:JSON.stringify({message:body.action==='register'?'If registration can proceed, check your email to verify your account.':'Unable to authenticate with these credentials.'})});
    }
    if(url.pathname.startsWith('/api/'))return route.fulfill({status:200,contentType:'application/json',body:'{}'});
    return route.continue();
   }
   if(url.hostname.endsWith('.supabase.co'))return route.fulfill({status:401,contentType:'application/json',body:JSON.stringify({message:'No synthetic session',code:'session_not_found'})});
   return route.abort();
  });
  const page=await context.newPage();
  await page.goto(base+'/login');
  const login=page.getByRole('region',{name:'Sign in with a Beast username'});
  await login.getByLabel('Username',{exact:true}).fill('acceptance_fixture');
  await login.getByLabel('Password',{exact:true}).fill('synthetic-password-123');
  await login.getByRole('button',{name:'Sign in with username'}).click();
  await page.getByRole('status').filter({hasText:'Unable to authenticate'}).waitFor();
  const legacy=page.locator('details').filter({hasText:'Existing email sign-in options'});
  await legacy.locator('summary').click();
  await legacy.getByLabel('Email address',{exact:true}).waitFor({state:'visible'});
  await legacy.getByLabel('Password',{exact:true}).waitFor({state:'visible'});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),true);
  await page.screenshot({path:`/private/tmp/canonical-auth-ui/login-${width}.png`,fullPage:true});
  await page.goto(base+'/login?intent=create-account');
  const signup=page.getByRole('region',{name:'Register a Beast username'});
  await signup.getByLabel('Username',{exact:true}).fill('acceptance_fixture');
  await signup.getByLabel('Email address',{exact:true}).fill('synthetic@example.com');
  await signup.getByLabel('Password',{exact:true}).fill('synthetic-password-123');
  await page.screenshot({path:`/private/tmp/canonical-auth-ui/register-${width}.png`,fullPage:true});
  await signup.getByRole('button',{name:'Create Beast account'}).click();
  await signup.getByRole('status').filter({hasText:'verify your account'}).waitFor();
  assert.equal(await signup.locator('input[type=password]').count(),0);
  await page.goto(base+'/');
  await page.getByRole('button',{name:'Sign Up',exact:true}).click();
  const dialog=page.getByRole('dialog',{name:'Create your account'});
  const username=dialog.getByLabel('Username',{exact:true});
  await username.waitFor({state:'visible'});await username.focus();
  assert.equal(await username.evaluate(e=>e===document.activeElement),true);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),true);
  await page.keyboard.press('Escape');
  passed.push(`username login/registration, preserved email/password fallback, one-time verification notice, homepage dialog and layout ${width}px`);
  await context.close();
 }
 console.log(JSON.stringify({passed,liveAuth:false,emailsSent:0}));
}finally{await browser.close()}
