import {createIdentityHandler} from './identity.js';
import {nativeRequest,nativeOriginAllowed} from '../server/native-policy.js';
import {IdentityError} from '../server/identity/proof.js';
export function createNativeIdentityHandler({env=process.env,...dependencies}={}){
 const shared=createIdentityHandler({...dependencies,validateOrigin:req=>{if(!nativeOriginAllowed(req,env))throw new IdentityError('ORIGIN_DENIED',403);}});
 return async(req,res)=>{if(nativeRequest(req,res,{env}))return shared(req,res);};
}
export default createNativeIdentityHandler();
