import {IdentityError,CANONICAL,uuid} from './proof.js';
import {transaction} from './store.js';
import {scopeFor} from './scope.js';
const columns={library:['user_id','content_type','provider','provider_id','status','created_at','tracking_start_season','tracking_start_episode','broadcast_override','streaming_override'],episode_progress:['user_id','provider','series_id','season_number','episode_number','watched','updated_at'],notification_preferences:['user_id','enabled','one_day_before','two_hours_before','news_enabled','email_enabled','time_zone','updated_at'],movies:['user_id','id','item','watched','created_at'],collections:['user_id','id','data'],events:['user_id','id','item','created_at']};
const conflicts={library:'user_id,content_type,provider,provider_id',episode_progress:'user_id,provider,series_id,season_number,episode_number',notification_preferences:'user_id',movies:'user_id,id',collections:'user_id,id',events:'user_id,id'};
export function dataService({verify,pool,scope=scopeFor('production')}){return async(token,operation)=>{
 const actor=await verify(token,CANONICAL),type=operation?.table?.replace(/^beastguide_/,'');
 if(!columns[type]||!['select','upsert','delete'].includes(operation.kind))throw new IdentityError('INVALID_OPERATION');
 return transaction(pool,async c=>{
  await c.query('select pg_advisory_xact_lock(hashtextextended($1,0))',[actor.id]);
  await c.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:actor.id,role:scope.dataRole})]);
  const link=(await c.query('select legacy_id,state from '+scope.identity+'.links where canonical_id=$1',[actor.id])).rows[0];
  if(link&&link.state!=='active')throw new IdentityError('LINK_REVOKED',403);
  const owner=link?.legacy_id||actor.id,schema=link?scope.legacy:scope.canonical,table=schema+'.beastguide_'+type;
  if(!link)await c.query('insert into '+scope.identity+'.subjects(canonical_id) values($1) on conflict do nothing',[actor.id]);
  await c.query("select set_config('request.jwt.claims',$1,true)",[JSON.stringify({sub:owner,role:scope.dataRole})]);
  const params=[owner],where=['user_id=$1'];
  for(const [key,value] of Object.entries(operation.filters||{})){
   if(!columns[type].includes(key))throw new IdentityError('INVALID_FILTER');
   if(key==='user_id'){if(value!==actor.id)throw new IdentityError('OWNER_MISMATCH',403);continue}
   params.push(value);where.push(key+'=$'+params.length);
  }
  if(operation.kind==='select'){
   const fields=operation.columns==='*'||!operation.columns?columns[type]:operation.columns.split(',');
   if(!fields.length||fields.some(k=>!columns[type].includes(k)))throw new IdentityError('INVALID_COLUMNS');
   // Paginated within one transaction; never silently truncate episode history.
   const rows=[];for(let offset=0;;offset+=500){const page=(await c.query('select '+fields.join(',')+' from '+table+' where '+where.join(' and ')+' order by '+conflicts[type]+' limit 500 offset $'+(params.length+1),[...params,offset])).rows;rows.push(...page);if(page.length<500)break;if(rows.length>=50000)throw new IdentityError('STATE_TOO_LARGE',413)}
   return rows;
  }
  if(operation.kind==='delete'){
   if(!Object.keys(operation.filters||{}).some(k=>k==='id'||k==='provider_id'))throw new IdentityError('ITEM_FILTER_REQUIRED');
   await c.query('delete from '+table+' where '+where.join(' and '),params);return null;
  }
  const rows=Array.isArray(operation.rows)?operation.rows:[operation.rows];
  if(!rows.length||rows.length>300)throw new IdentityError('INVALID_ROWS');
  for(const input of rows){
   if(!input||input.user_id!==actor.id)throw new IdentityError('OWNER_MISMATCH',403);
   if(type==='library'){
    for(const key of ['tracking_start_season','tracking_start_episode'])if(input[key]!=null&&(!Number.isInteger(input[key])||input[key]<1||input[key]>10000))throw new IdentityError('INVALID_TRACKING_BASELINE');
    if(Object.hasOwn(input,'tracking_start_season')!==Object.hasOwn(input,'tracking_start_episode')||(input.tracking_start_season==null)!==(input.tracking_start_episode==null))throw new IdentityError('INVALID_TRACKING_BASELINE');
    if(input.broadcast_override!=null&&(typeof input.broadcast_override!=='string'||input.broadcast_override.length>160))throw new IdentityError('INVALID_PROVIDER_INFO');
    if(input.streaming_override!=null&&(!Array.isArray(input.streaming_override)||input.streaming_override.length>10||input.streaming_override.some(x=>typeof x!=='string'||!x.trim()||x.length>80)))throw new IdentityError('INVALID_PROVIDER_INFO');
   }
   const row={...input,user_id:owner},keys=Object.keys(row);
   if(keys.some(k=>!columns[type].includes(k))||conflicts[type].split(',').some(k=>row[k]==null))throw new IdentityError('INVALID_FIELDS');
   if(row.provider&&row.provider!=='beastguide-demo')throw new IdentityError('INVALID_PROVIDER');
   const update=keys.filter(k=>!conflicts[type].split(',').includes(k)&&k!=='created_at').map(k=>k+'=excluded.'+k);
   const suffix=operation.ignoreDuplicates||!update.length?'do nothing':'do update set '+update.join(',');
   await c.query('insert into '+table+'('+keys.join(',')+') values('+keys.map((_,i)=>'$'+(i+1)).join(',')+') on conflict('+conflicts[type]+') '+suffix,keys.map(k=>row[k]));
  }
  return null;
 });
}}
