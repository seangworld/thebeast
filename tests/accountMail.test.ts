import test from 'node:test';import assert from 'node:assert/strict';import {accountMessage,deliverAccountMail,smtpOptions,type AccountMail} from '../src/lib/auth/accountMail/delivery';
const mail:AccountMail={mail_id:'10000000-0000-4000-8000-000000000001',delivery_token:'20000000-0000-4000-8000-000000000002',recipient:'verified@example.test',username:'chosen_name',kind:'username_recovery',return_path:'/account-setup?app=beastguide&next=library'};
test('informational username messages preserve the requested app and contain no authentication material',()=>{const result=accountMessage(mail,'seang@seangworld.com');assert.equal(result.to,mail.recipient);assert.match(result.text,/chosen_name/);const link=result.text.split('\n').find(x=>x.startsWith('Sign in: '))!.slice(9);assert.equal(new URL(link).searchParams.get('next'),mail.return_path);assert.ok(!JSON.stringify(result).includes(mail.delivery_token));assert.doesNotMatch(result.text,/access_token|refresh_token|token_hash|code=/);assert.equal(result.messageId,accountMessage(mail,'seang@seangworld.com').messageId)});
test('verified accounts without usernames get setup instructions rather than an invented username',()=>{const result=accountMessage({...mail,username:null},'seang@seangworld.com');assert.match(result.text,/does not have a login username/);assert.match(result.text,/account-setup\?app=beastguide/);assert.throws(()=>accountMessage({...mail,kind:'username_assigned',username:null},'seang@seangworld.com'))});
test('informational messages reject injection and foreign destinations',()=>{for(const change of [{recipient:'a@example.test\r\nBcc: x@example.test'},{username:'unsafe\nname'},{return_path:'https://evil.test'},{return_path:'//evil.test'}])assert.throws(()=>accountMessage({...mail,...change},'seang@seangworld.com'))});
test('SMTP is off by default and requires the existing sender, verified TLS and private credentials',()=>{assert.throws(()=>smtpOptions({}),/DISABLED/);const env={BEAST_ACCOUNT_MAIL_ENABLED:'true',BEAST_SMTP_HOST:'smtp.resend.com',BEAST_SMTP_PORT:'465',BEAST_SMTP_USER:'fixture',BEAST_SMTP_PASSWORD:'fixture-only',BEAST_SMTP_FROM:'seang@seangworld.com'};const options=smtpOptions(env);assert.equal(options.secure,true);assert.equal(options.tls.rejectUnauthorized,true);assert.equal(options.debug,false);assert.equal(options.logger,false);assert.equal(options.disableUrlAccess,true);assert.equal(options.disableFileAccess,true);for(const extra of [{BEAST_SMTP_HOST:'evil.test'},{BEAST_SMTP_PORT:'25'},{BEAST_SMTP_FROM:'a@evil.test'},{BEAST_SMTP_PASSWORD:''}])assert.throws(()=>smtpOptions({...env,...extra}))});
for(const fail of [false,true])test('delivery '+(fail?'failure is held':'success gets a durable receipt'),async()=>{const calls:Array<{name:string;args:Record<string,unknown>}>=[];const admin={rpc:async(name:string,args:Record<string,unknown>)=>{calls.push({name,args});return {data:name==='beast_account_mail_claim'?[mail]:true,error:null}}};let attempted=0;assert.equal(await deliverAccountMail(admin,async()=>{attempted++;if(fail)throw Error('SMTP transport containing secret details')},'private-own-id','username_recovery'),!fail);assert.equal(attempted,1);assert.equal(calls[0].args.p_user_id,'private-own-id');assert.deepEqual(calls[1].args,{p_id:mail.mail_id,p_token:mail.delivery_token,p_sent:!fail})});
test('missing delivery receipt never reports success or retries SMTP',async()=>{let sent=0;await assert.rejects(deliverAccountMail({rpc:async name=>({data:name==='beast_account_mail_claim'?[mail]:false,error:null})},async()=>{sent++}),/RECEIPT/);assert.equal(sent,1)});

test('managed security notice candidates disclose no tokens or account-specific fields and keep a clear recovery action',()=>{
 const {readFileSync}=require('node:fs');const packet=JSON.parse(readFileSync('docs/feedback/SECURITY-NOTIFICATION-REVIEW-20261104.json','utf8'));assert.equal(packet.notices.length,7);for(const notice of packet.notices){assert.equal(notice.enabledBefore,false);assert.equal(notice.subject,'unchanged');const html=readFileSync(notice.body,'utf8');assert.ok(!html.includes('{{'));assert.doesNotMatch(html,/TokenHash|ConfirmationURL|OldPhone|NewEmail|access_token|refresh_token/);assert.match(html,/https:\/\/thebeast.seangworld.com\/forgot-password/);assert.match(html,/mailto:seang@seangworld.com/)}
});

test('owner registration message contains only the canonical creation snapshot and fixed Members link',()=>{
 const event:AccountMail={...mail,kind:'owner_registration',recipient:'owner@example.test',username:null,registration_email:'new.member@example.test',registration_at:'2026-11-05T14:00:00.000Z',verified_at_creation:false};
 const message=accountMessage(event,'seang@seangworld.com');
 assert.equal(message.to,'owner@example.test');assert.equal(message.subject,'New Beast member registration');
 assert.match(message.text,/Registration date\/time: 2026-11-05T14:00:00.000Z/);assert.match(message.text,/Registered email address: new.member@example.test/);assert.match(message.text,/Email verification status: Pending/);
 assert.match(message.text,/https:\/\/thebeast.seangworld.com\/dashboard\/admin\/members/);assert.doesNotMatch(message.text,/Originating application|forged_app|access_token|refresh_token|token_hash|code=/);
 assert.ok(!JSON.stringify(message).includes(event.delivery_token));assert.ok(message.text.includes('\n\n'));assert.ok(!message.text.includes('\\n'));
 assert.equal(message.messageId,accountMessage(event,'seang@seangworld.com').messageId);
 assert.match(accountMessage({...event,verified_at_creation:true},'seang@seangworld.com').text,/Verified at account creation/,'pre-verified admin creation must not falsely report Pending');
 for(const changes of [{registration_email:'victim@example.test\r\nBcc: attacker@example.test'},{registration_at:'invalid'},{verified_at_creation:undefined}])assert.throws(()=>accountMessage({...event,...changes},'seang@seangworld.com'));
});

test('owner SMTP failure has the same durable hold and never retries or changes an account',async()=>{
 const event:AccountMail={...mail,kind:'owner_registration',registration_email:'registered@example.test',registration_at:'2026-11-05T14:00:00Z',verified_at_creation:false};
 const calls:Array<{name:string,args:Record<string,unknown>}>=[];let attempts=0;
 const admin={rpc:async(name:string,args:Record<string,unknown>)=>{calls.push({name,args});return {data:name==='beast_account_mail_claim'?[event]:true,error:null}}};
 assert.equal(await deliverAccountMail(admin,async()=>{attempts++;throw Error('fixture SMTP failure')},null,null,'owner@example.test'),false);
 assert.equal(attempts,1);assert.equal(calls[0].args.p_owner_email,'owner@example.test');assert.equal(calls[1].args.p_sent,false);assert.ok(calls.every(call=>['beast_account_mail_claim','beast_account_mail_finish'].includes(call.name)));
});


test('informational recovery links strip callback credentials while preserving the requested application',()=>{
 for(const username of ['chosen_name',null]){
  const guide=accountMessage({...mail,username,return_path:'/account-setup?app=beastguide&next=library&access_token=private-fixture&code=private-code#refresh_token=private-refresh'},'seang@seangworld.com');
  assert.doesNotMatch(guide.text,/private-fixture|private-code|private-refresh|access_token|refresh_token|code=/);assert.match(decodeURIComponent(guide.text),/app=beastguide&next=library/);
  const dashboard=accountMessage({...mail,username,return_path:'/dashboard/beastguide?token_hash=private-hash#access_token=private-token'},'seang@seangworld.com');
  assert.doesNotMatch(dashboard.text,/private-hash|private-token|token_hash|access_token/);assert.ok(decodeURIComponent(dashboard.text).includes('/dashboard/beastguide'));
 }
});
