const send=(res,status,data)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','public, max-age=60, s-maxage=900');res.end(JSON.stringify(data))};
export default async function handler(req,res){
 if(req.method!=='GET')return send(res,405,{error:'Method not allowed'});
 const type=String(req.query.type||''),q=String(req.query.q||'').trim().slice(0,100),id=String(req.query.id||'');
 if(type==='movie'){
  const token=process.env.TMDB_READ_ACCESS_TOKEN;
  if(!token||process.env.TMDB_COMMERCIAL_USE_APPROVED!=='true')return send(res,503,{error:'Movie search is awaiting provider licensing and configuration.'});
  if(!q&&!/^\d+$/.test(id))return send(res,400,{error:'Search term required'});
  const url=id?'https://api.themoviedb.org/3/movie/'+encodeURIComponent(id):'https://api.themoviedb.org/3/search/movie?query='+encodeURIComponent(q)+'&include_adult=false';
  try{const r=await fetch(url,{signal:AbortSignal.timeout(8000),headers:{Authorization:'Bearer '+token,Accept:'application/json'}});if(!r.ok)return send(res,502,{error:'Movie provider unavailable'});const data=await r.json();const items=(id?[data]:data.results||[]).slice(0,20).map(m=>({id:'tmdb:'+m.id,name:m.title||'',type:'Movies',detail:m.release_date?'Released '+m.release_date.slice(0,4):'Movie',releaseDate:m.release_date||null,service:'Movie',image:m.poster_path?'https://image.tmdb.org/t/p/w185'+m.poster_path:null}));return send(res,200,{items})}catch{return send(res,502,{error:'Movie provider unavailable'})}
 }
 if(type==='team'||type==='team-events'||type==='team-lookup'||type==='event'||type==='event-lookup'){
  const key=process.env.SPORTSDB_API_KEY;
  if(!key||process.env.SPORTSDB_COMMERCIAL_USE_APPROVED!=='true')return send(res,503,{error:'Sports search is awaiting complete schedule provider configuration.'});
  if((type==='team'||type==='event')&&q.length<2)return send(res,400,{error:'Search term required'});
  if((type==='team-events'||type==='team-lookup'||type==='event-lookup')&&!/^\d+$/.test(id))return send(res,400,{error:'Invalid team ID'});
  const endpoint=type==='team'?'searchteams.php?t='+encodeURIComponent(q):type==='team-lookup'?'lookupteam.php?id='+encodeURIComponent(id):type==='event'?'searchevents.php?e='+encodeURIComponent(q):type==='event-lookup'?'lookupevent.php?id='+encodeURIComponent(id):'eventsnext.php?id='+encodeURIComponent(id);
  try{const r=await fetch('https://www.thesportsdb.com/api/v1/json/'+encodeURIComponent(key)+'/'+endpoint,{signal:AbortSignal.timeout(8000)});if(!r.ok)return send(res,502,{error:'Sports provider unavailable'});const data=await r.json();
   if(type==='team'||type==='team-lookup'){const items=(data.teams||[]).filter(t=>['NFL','NBA','MLB','NHL'].includes(t.strLeague)||['American NFL','NBA','MLB','NHL'].includes(t.strLeague)).slice(0,20).map(t=>({id:'sportsdb:'+t.idTeam,name:t.strTeam||'',type:'Sports',detail:t.strLeague||t.strSport||'Sports team',service:t.strSport||'Sports',image:t.strBadge||null}));return send(res,200,{items})}
   if(type==='event'||type==='event-lookup'){const items=(data.event||data.events||[]).slice(0,20).map(e=>({id:'eventdb:'+e.idEvent,name:e.strEvent||'Event',type:'Event',detail:e.dateEvent?'Date: '+e.dateEvent:'Date unannounced',service:e.strLeague||e.strSport||'Live event',image:e.strThumb||null,utc:e.strTimestamp||null}));return send(res,200,{items})}
   const items=(data.events||[]).map(e=>({id:String(e.idEvent),name:e.strEvent||'',date:e.dateEvent||null,utc:e.strTimestamp||null,home:e.strHomeTeam||null,away:e.strAwayTeam||null}));return send(res,200,{items});
  }catch{return send(res,502,{error:'Sports provider unavailable'})}
 }
 return send(res,400,{error:'Unsupported catalog type'});
}
