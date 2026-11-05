import {createAdminClient} from '@/lib/supabase/admin';
import {requireSupabasePublicConfiguration} from '@/lib/supabase/config';
import {deliverAccountMail,smtpSender} from './delivery';
export function accountMailAdmin(){
 if(process.env.BEAST_ACCOUNT_MAIL_ENABLED!=='true'||process.env.BEAST_IDENTITY_URL!=='https://grpyzwvgqiwtxadfdtni.supabase.co'||requireSupabasePublicConfiguration().url!==process.env.BEAST_IDENTITY_URL)throw Error('ACCOUNT_MAIL_DISABLED');
 const admin=createAdminClient();if(!admin)throw Error('ACCOUNT_MAIL_CONFIGURATION');return admin;
}
export async function sendQueuedAccountMail(userId:string|null=null,kind:string|null=null){return deliverAccountMail(accountMailAdmin(),smtpSender(process.env),userId,kind)}
