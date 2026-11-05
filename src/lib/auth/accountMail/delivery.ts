import {createTransport} from 'nodemailer';
export type AccountMail={mail_id:string;delivery_token:string;recipient:string;username:string|null;return_path?:string;kind:'username_assigned'|'username_recovery'};
export function smtpOptions(env:Record<string,string|undefined>){
 if(env.BEAST_ACCOUNT_MAIL_ENABLED!=='true')throw Error('ACCOUNT_MAIL_DISABLED');
 if(env.BEAST_SMTP_HOST!=='smtp.resend.com'||env.BEAST_SMTP_PORT!=='465'||!env.BEAST_SMTP_USER||!env.BEAST_SMTP_PASSWORD||!/^[-a-zA-Z0-9._+]+@seangworld\.com$/.test(env.BEAST_SMTP_FROM||''))throw Error('ACCOUNT_MAIL_CONFIGURATION');
 return {host:env.BEAST_SMTP_HOST,port:465,secure:true,auth:{user:env.BEAST_SMTP_USER,pass:env.BEAST_SMTP_PASSWORD},tls:{rejectUnauthorized:true,minVersion:'TLSv1.2' as const},pool:false,logger:false,debug:false,disableFileAccess:true,disableUrlAccess:true,connectionTimeout:8000,greetingTimeout:8000,socketTimeout:12000};
}
export function accountMessage(mail:AccountMail,from:string){
 if(!['username_assigned','username_recovery'].includes(mail.kind)||/[,;:"\\]/.test(mail.recipient)||!/^[a-f0-9-]{36}$/i.test(mail.mail_id)||!/^[^\s@<>\r\n]+@[^\s@<>\r\n]+\.[^\s@<>\r\n]+$/.test(mail.recipient)||(mail.username!==null&&!/^[a-z][a-z0-9_]{2,31}$/i.test(mail.username)))throw Error('INVALID_ACCOUNT_MAIL');
 const requested=new URL(mail.return_path||'/dashboard/settings/profile#account-username','https://thebeast.seangworld.com');
 if(requested.origin!=='https://thebeast.seangworld.com'||!/^\/(dashboard(?:\/|$)|account-setup(?:$))/.test(requested.pathname))throw Error('INVALID_ACCOUNT_MAIL');
 const login=new URL('/login','https://thebeast.seangworld.com');login.searchParams.set('next',requested.pathname+requested.search+requested.hash);
 const setup=requested.pathname==='/account-setup'?requested:new URL('/account-setup?next='+encodeURIComponent(requested.pathname+requested.search+requested.hash),'https://thebeast.seangworld.com');
 const assignment=mail.kind==='username_assigned';
 if(assignment&&!mail.username)throw Error('INVALID_ACCOUNT_MAIL');
 const text=mail.username?`Your Beast login username is: ${mail.username}\n\nYour email address is verified. Use the same Beast account across supported Beast applications. Your editable display name is separate from your login username.\n\nSign in: ${login.toString()}`:`Your verified Beast account does not have a login username yet. Sign in using your existing account email and finish setup: ${setup.toString()}`;
 return {from,to:mail.recipient,subject:assignment?'Your Beast username is ready':'Your Beast username recovery',text:text+'\n\nIf you did not request this, contact seang@seangworld.com. Never share your password or verification links.',messageId:`<beast-account-${mail.mail_id}@seangworld.com>`,disableFileAccess:true,disableUrlAccess:true};
}
export function smtpSender(env:Record<string,string|undefined>){
 const options=smtpOptions(env),transport=createTransport(options);
 return async(mail:AccountMail)=>{const result=await transport.sendMail(accountMessage(mail,env.BEAST_SMTP_FROM!));if(result.accepted.length!==1||result.rejected.length)throw Error('ACCOUNT_MAIL_NOT_ACCEPTED');};
}
export type MailRpc={rpc:(name:string,args:Record<string,unknown>)=>PromiseLike<{data:unknown;error:unknown}>};
export async function deliverAccountMail(admin:MailRpc,send:(mail:AccountMail)=>Promise<void>,userId:string|null=null,kind:string|null=null){
 const claimed=await admin.rpc('beast_account_mail_claim',{p_user_id:userId,p_kind:kind});if(claimed.error)throw Error('ACCOUNT_MAIL_STORE');
 const mail=(claimed.data as AccountMail[]|null)?.[0];if(!mail)return false;
 let sent=false;
 try{await send(mail);sent=true;}catch{/* Ambiguous SMTP outcomes are held, never blindly retried. */}
 const result=await admin.rpc('beast_account_mail_finish',{p_id:mail.mail_id,p_token:mail.delivery_token,p_sent:sent});
 if(result.error||result.data!==true)throw Error('ACCOUNT_MAIL_RECEIPT');
 return sent;
}
