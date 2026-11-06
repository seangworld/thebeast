// Reuse the existing self-service profile fields/RLS; never copy roles or identity mappings.
export const REQUIRED_NOTICE='Fields marked with * are required to complete your account setup.';
export function requiredProfileError(name,birthday,now=new Date()){
 if(typeof name!=='string'||!name.trim())return 'Enter your name.';
 if(name.trim().length>200)return 'Name must be 200 characters or fewer.';
 if(typeof birthday!=='string'||!birthday)return 'Enter your date of birth.';
 const date=new Date(birthday+'T12:00:00Z');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(birthday)||!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==birthday||birthday>now.toISOString().slice(0,10))return 'Enter a valid date of birth that is not in the future.';
 return null;
}
export function signupProfile(name,birthday){return {name:name.trim(),birthday}}
export async function readOwnProfile(client,user){
 const current=await client.auth.getUser();
 if(current.error||current.data.user?.id!==user.id||!current.data.user.email_confirmed_at||current.data.user.app_metadata?.is_disabled===true||current.data.user.app_metadata?.account_status==='disabled')throw Error('Sign in with your verified Beast account to complete setup.');
 const control=await client.rpc('is_current_beast_session_allowed');
 if(control.error||control.data!==true)throw Error('Sign in again before completing account setup.');
 const result=await client.from('profiles').select('id,preferred_name,display_name,full_name,birthday,updated_at').eq('id',user.id).maybeSingle();
 if(result.error||!result.data)throw Error('Your profile could not be loaded. Your information has not been changed. Retry.');
 return result.data;
}
export async function completeMissingProfile(client,user,input){
 const draft=input||user.user_metadata?.beast_setup_profile;
 if(!draft||requiredProfileError(draft.name,draft.birthday))return false;
 const profile=await readOwnProfile(client,user),patch={};
 if(![profile.preferred_name,profile.display_name,profile.full_name].some(x=>typeof x==='string'&&x.trim()))patch.preferred_name=draft.name.trim();
 if(!profile.birthday)patch.birthday=draft.birthday;
 if(!Object.keys(patch).length)return true;
 const current=await client.auth.getUser();if(current.error||current.data.user?.id!==user.id)throw Error('Your signed-in account changed. Reopen setup.');
 const result=client.from('profiles').update(patch).eq('id',user.id);
 const guarded=profile.updated_at==null?result.is('updated_at',null):result.eq('updated_at',profile.updated_at);
 const saved=await guarded.select('id');
 if(saved.error||saved.data?.length!==1)throw Error('Your profile changed or could not be saved. Your entered information is kept; reload the saved version before retrying.');
 return true;
}
