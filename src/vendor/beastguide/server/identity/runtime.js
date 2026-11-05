import {createVerifier,IdentityError} from './proof.js';
import {identityService} from './service.js';
import {identityStore} from './store.js';
import {dataService} from './data.js';
import {registrationAdapter} from './registration.js';
import {databaseTLS} from './database-tls.js';
import {scopeFor} from './scope.js';
let runtime;
export async function getRuntime(env=process.env){
 if(env.BEAST_IDENTITY_BRIDGE_ENABLED!=='true'||!env.BEAST_IDENTITY_ORIGIN)throw new IdentityError('IDENTITY_NOT_ENABLED',503);
 const name=env.VERCEL_ENV==='production'&&env.BEAST_IDENTITY_TARGET==='production'?'production':'preview';
 if(name==='preview'&&env.BEAST_IDENTITY_TARGET!=='preview')throw new IdentityError('PREVIEW_ISOLATION_REQUIRED',503);
 const scope=scopeFor(name);
 if(!runtime)runtime=(async()=>{
  const {Pool}=await import('pg');
  const opened=[];try{
  const pool=async(url,role)=>{if(!url)throw new IdentityError('IDENTITY_NOT_CONFIGURED',503);const parsed=new URL(url);if([...parsed.searchParams.keys()].some(k=>k.toLowerCase().startsWith('ssl')||k==='uselibpqcompat'))throw new IdentityError('UNSAFE_TLS_CONFIGURATION',503);const p=new Pool({connectionString:url,ssl:databaseTLS(),max:1,idleTimeoutMillis:5000,connectionTimeoutMillis:8000});opened.push(p);p.on('error',e=>console.error('BEAST_IDENTITY_IDLE_CONNECTION',/^[A-Z0-9]{5}$/.test(e.code||'')?e.code:'CONNECTION_ERROR'));const r=await p.query('select current_user,rolsuper,rolbypassrls from pg_roles where rolname=current_user');if(r.rows[0]?.current_user!==role||r.rows[0].rolsuper||r.rows[0].rolbypassrls){throw new IdentityError('UNSAFE_DATABASE_ROLE',503)}return p};
  const linker=await pool(name==='preview'?env.BEAST_PREVIEW_LINK_DATABASE_URL:env.BEAST_IDENTITY_LINK_DATABASE_URL,scope.linkRole),data=await pool(name==='preview'?env.BEAST_PREVIEW_DATA_DATABASE_URL:env.BEAST_IDENTITY_DATA_DATABASE_URL,scope.dataRole);
  const verify=createVerifier({canonicalKey:env.BEAST_CANONICAL_PUBLISHABLE_KEY,legacyKey:env.BEAST_LEGACY_PUBLISHABLE_KEY,requireAccountSetup:env.BEAST_ACCOUNT_SETUP_REQUIRED==='true'});
  return {identity:identityService({verify,store:identityStore(linker,scope)}),data:dataService({verify,pool:data,scope}),registration:name==='preview'?null:registrationAdapter({pool:linker,key:env.BEAST_CANONICAL_AUTH_ADMIN_KEY,salt:env.BEAST_REGISTRATION_RATE_SALT,validated:env.BEAST_REGISTRATION_VALIDATED==='true'})};
  }catch(e){await Promise.allSettled(opened.map(p=>p.end()));throw e}
 })().catch(e=>{runtime=null;throw e});
 return runtime;
}
