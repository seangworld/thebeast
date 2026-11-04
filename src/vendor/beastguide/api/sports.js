// Development-only ESPN public-endpoint adapter. These endpoints are not a licensed
// commercial API. Keep behind explicit server configuration until usage rights reviewed.
const leagues={NFL:['football','nfl'],NBA:['basketball','nba'],MLB:['baseball','mlb'],NHL:['hockey','nhl']};
const send=(res,status,data)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','private, max-age=0');res.end(JSON.stringify(data))};
async function espn(path){const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),7000);try{const r=await fetch('https://site.api.espn.com/apis/site/v2/sports/'+path,{signal:controller.signal,headers:{Accept:'application/json'}});if(!r.ok)throw new Error('Schedule source unavailable');return await r.json()}finally{clearTimeout(timeout)}}
function teamInfo(t,league){return {id:'espn:'+league+':'+t.id,name:t.displayName||t.name,type:'Sports',detail:league,service:league,image:t.logos?.[0]?.href||null,abbreviation:t.abbreviation||''}}
export default async function handler(req,res){
 if(req.method!=='GET')return send(res,405,{error:'Method not allowed'});
 if(process.env.VERCEL_ENV==='production'||process.env.ENABLE_UNLICENSED_SPORTS_DEV!=='true')return send(res,503,{error:'Sports schedule source is not yet cleared for public use.'});
 const league=String(req.query.league||'NFL').toUpperCase(),action=String(req.query.action||'teams'),id=String(req.query.id||'');
 if(!leagues[league])return send(res,400,{error:'Unsupported league'});
 if(action==='schedule'&&!/^[a-zA-Z0-9-]{1,24}$/.test(id))return send(res,400,{error:'Invalid team'});
 const [sport,slug]=leagues[league];
 try{
  if(action==='teams'){
   const data=await espn(sport+'/'+slug+'/teams?limit=100');
   const teams=(data.sports?.[0]?.leagues?.[0]?.teams||[]).map(x=>teamInfo(x.team,league));
   return send(res,200,{items:teams});
  }
  if(action==='schedule'){
   const data=await espn(sport+'/'+slug+'/teams/'+encodeURIComponent(id)+'/schedule');
   const now=Date.now();
   const events=(data.events||[]).filter(e=>e.date&&Date.parse(e.date)>=now&&e.competitions?.[0]?.competitors?.length===2).map(e=>{
    const teams=e.competitions[0].competitors;
    const home=teams.find(t=>t.homeAway==='home'),away=teams.find(t=>t.homeAway==='away');
    return {id:String(e.id),utc:e.date,home:home?.team?.abbreviation||home?.team?.displayName||'',away:away?.team?.abbreviation||away?.team?.displayName||'',name:e.shortName||e.name||'',teamId:'espn:'+league+':'+id}
   }).sort((a,b)=>Date.parse(a.utc)-Date.parse(b.utc));
   return send(res,200,{items:events});
  }
  return send(res,400,{error:'Unsupported action'});
 }catch{return send(res,502,{error:'Sports schedule temporarily unavailable'})}
}
