import {CANONICAL,LEGACY,IdentityError,digest,nonce} from './proof.js';
export function identityService({verify,store,now=()=>Date.now()}){
 return {
  async begin(canonicalToken){const c=await verify(canonicalToken,CANONICAL,{fresh:true}),secret=nonce();await store.challenge({hash:digest(secret),canonical:c.id,session:digest(c.session),expires:new Date(now()+300000)});return {challenge:secret,expiresIn:300,canonicalId:c.id}},
  async complete(canonicalToken,{challenge,legacyToken,consent}={}){
   if(consent!==true||typeof challenge!=='string'||challenge.length!==43)throw new IdentityError('EXPLICIT_LINK_CONSENT_REQUIRED');
   const c=await verify(canonicalToken,CANONICAL,{fresh:true});
   const l=await verify(legacyToken,LEGACY,{fresh:true});
   // Never accept subject IDs, emails, or routing metadata from the browser.
   await store.link({hash:digest(challenge),canonical:c.id,legacy:l.id,session:digest(c.session),canonicalAuthAt:c.authAt,legacyAuthAt:l.authAt,now:new Date(now())});
   return {linked:true,canonicalId:c.id};
  },
  async status(token){const c=await verify(token,CANONICAL);return store.status(c.id)},
  async revoke(token){const c=await verify(token,CANONICAL,{fresh:true});await store.revoke(c.id);return {revoked:true}},
  async register({email,consent}={},admin){
   if(consent!==true||typeof email!=='string'||email.length>254||!/^\S+@\S+\.\S+$/.test(email))throw new IdentityError('REGISTRATION_CONSENT_REQUIRED');
   // Hosted rollout must remain disabled until trigger/onboarding/SMTP gates pass.
   if(!admin)throw new IdentityError('REGISTRATION_NOT_ENABLED',503);
   await admin.createBeastGuideUser({email,app_metadata:{beastguide_only:true},email_confirm:false});
   return {message:'Continue with the sign-in email flow.'};
  }
 };
}
