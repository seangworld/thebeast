import {getRuntime} from '../server/identity/runtime.js';
import {sameOrigin,bearer,IdentityError} from '../server/identity/proof.js';
export function createIdentityHandler({runtime=getRuntime,origin=()=>process.env.BEAST_IDENTITY_ORIGIN}={}){return async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');
 try{
  if(req.method!=='POST')throw new IdentityError('METHOD_NOT_ALLOWED',405);
  sameOrigin(req,origin());
  if(!String(req.headers['content-type']||'').startsWith('application/json'))throw new IdentityError('JSON_REQUIRED',415);
  if(Number(req.headers['content-length']||0)>65536)throw new IdentityError('BODY_TOO_LARGE',413);
  const body=typeof req.body==='string'?JSON.parse(req.body):req.body;
  if(Buffer.byteLength(JSON.stringify(body||{}))>65536)throw new IdentityError('BODY_TOO_LARGE',413);
  const services=await runtime();const token=bearer(req);let result;
  if(body.action==='begin')result=await services.identity.begin(token);
  else if(body.action==='complete')result=await services.identity.complete(token,body);
  else if(body.action==='status')result=await services.identity.status(token);
  else if(body.action==='revoke')result=await services.identity.revoke(token);
  else if(body.action==='data')result=await services.data(token,body.operation);
  else throw new IdentityError('INVALID_ACTION');
  res.statusCode=200;res.end(JSON.stringify({data:result}));
 }catch(e){res.statusCode=e instanceof IdentityError?e.status:503;res.end(JSON.stringify({error:e instanceof IdentityError?e.code:'IDENTITY_UNAVAILABLE'}))}
}
}
export default createIdentityHandler();
