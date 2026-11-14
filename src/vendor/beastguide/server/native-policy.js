// This identifies an allowed client surface, NOT a user or a trusted app binary.
// Authentication and authorization must still be performed by the shared gateways.
export const NATIVE_ORIGIN='capacitor://localhost';
export function nativeOriginAllowed(req,env=process.env){
 return env.BEAST_NATIVE_API_ENABLED==='true'&&req.headers.origin===NATIVE_ORIGIN&&!Object.hasOwn(req.headers,'cookie');
}
export function nativeRequest(req,res,{env=process.env,method='POST',authorization=true}={}){
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');res.setHeader('Vary','Origin');
 const reject=(status,error)=>{res.statusCode=status;res.end(JSON.stringify({error,message:'Native access is unavailable or the request was rejected.'}));return false;};
 if(!nativeOriginAllowed(req,env))return reject(env.BEAST_NATIVE_API_ENABLED==='true'?403:503,'NATIVE_ACCESS_DENIED');
 if(req.method!=='OPTIONS'&&req.method!==method)return reject(405,'METHOD_NOT_ALLOWED');
 if(req.method==='OPTIONS'){
  const requested=req.headers['access-control-request-method'];
  const headers=String(req.headers['access-control-request-headers']||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
  const allowed=authorization?['content-type','authorization']:['content-type'];
  if(requested!==method||headers.some(x=>!allowed.includes(x)))return reject(403,'PREFLIGHT_DENIED');
  res.setHeader('Access-Control-Allow-Methods',method);
  res.setHeader('Access-Control-Allow-Headers',allowed.join(', '));
  res.setHeader('Access-Control-Max-Age','300');
 }
 res.setHeader('Access-Control-Allow-Origin',NATIVE_ORIGIN);
 if(req.method==='OPTIONS'){res.statusCode=204;res.end();return false;}
 return true;
}
