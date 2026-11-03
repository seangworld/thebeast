import {IdentityError} from './proof.js';
import {scopeFor} from './scope.js';
export async function transaction(pool,work){const c=await pool.connect();try{await c.query('begin');const result=await work(c);await c.query('commit');return result}catch(e){await c.query('rollback');throw e}finally{c.release()}}
export function identityStore(pool,scope=scopeFor('production')){const query=(client,sql,args)=>client.query(sql.replaceAll('beastguide_identity.',scope.identity+'.').replaceAll('beastguide_canonical.',scope.canonical+'.'),args);return {
 async challenge(x){return transaction(pool,async c=>{await query(c,'select pg_advisory_xact_lock(hashtextextended($1,0))',[x.canonical]);const n=(await query(c,'select count(*)::int as n from beastguide_identity.challenges where canonical_id=$1 and expires_at>now()',[x.canonical])).rows[0].n;if(n>=5)throw new IdentityError('LINK_TRY_LATER',429);await query(c,'insert into beastguide_identity.challenges(hash,canonical_id,session_hash,expires_at) values($1,$2,$3,$4)',[x.hash,x.canonical,x.session,x.expires])})},
 async link(x){return transaction(pool,async c=>{
  const challenge=(await query(c,'select * from beastguide_identity.challenges where hash=$1 for update',[x.hash])).rows[0];
  if(!challenge||challenge.canonical_id!==x.canonical||challenge.session_hash!==x.session||challenge.used_at||new Date(challenge.expires_at)<=x.now)throw new IdentityError('LINK_CHALLENGE_INVALID',409);
  // Serialize canonical data writes against linking, including separate requests.
  await query(c,'select pg_advisory_xact_lock(hashtextextended($1,0))',[x.canonical]);
  const occupied=(await query(c,'select canonical_id,legacy_id,state from beastguide_identity.links where canonical_id=$1 or legacy_id=$2',[x.canonical,x.legacy])).rows;
  if(occupied.length){if(occupied.length===1&&occupied[0].canonical_id===x.canonical&&occupied[0].legacy_id===x.legacy&&occupied[0].state==='active'){await query(c,'update beastguide_identity.challenges set used_at=$2 where hash=$1',[x.hash,x.now]);return}throw new IdentityError('IDENTITY_ALREADY_LINKED',409)}
  for(const table of ['library','episode_progress','notification_preferences','movies','collections','events']){
   const has=(await query(c,'select 1 from beastguide_canonical.beastguide_'+table+' where user_id=$1 limit 1',[x.canonical])).rows.length;
   if(has)throw new IdentityError('CANONICAL_LIBRARY_NOT_EMPTY',409);
  }
  await query(c,'insert into beastguide_identity.subjects(canonical_id) values($1) on conflict do nothing',[x.canonical]);
  await query(c,'insert into beastguide_identity.links(canonical_id,legacy_id,canonical_auth_at,legacy_auth_at) values($1,$2,$3,$4)',[x.canonical,x.legacy,x.canonicalAuthAt,x.legacyAuthAt]);
  await query(c,'update beastguide_identity.challenges set used_at=$2 where hash=$1',[x.hash,x.now]);
  await query(c,"insert into beastguide_identity.audit(canonical_id,kind) values($1,'linked')",[x.canonical]);
 })},
 async status(id){const row=(await query(pool,'select state from beastguide_identity.links where canonical_id=$1',[id])).rows[0];return {linked:row?.state==='active',revoked:row?.state==='revoked'}},
 async revoke(id){return transaction(pool,async c=>{await query(c,'select pg_advisory_xact_lock(hashtextextended($1,0))',[id]);const changed=await query(c,"update beastguide_identity.links set state='revoked',revoked_at=now() where canonical_id=$1 and state='active' returning canonical_id",[id]);if(changed.rows.length)await query(c,"insert into beastguide_identity.audit(canonical_id,kind) values($1,'revoked')",[id])})}
}}
