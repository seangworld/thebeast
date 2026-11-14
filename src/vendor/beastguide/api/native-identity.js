import {createIdentityHandler} from './identity.js';
import {nativeRequest,NATIVE_ORIGIN} from '../server/native-policy.js';
export function createNativeIdentityHandler({env=process.env,...dependencies}={}){
 const shared=createIdentityHandler({...dependencies,origin:()=>NATIVE_ORIGIN});
 return async(req,res)=>{if(nativeRequest(req,res,{env}))return shared(req,res);};
}
export default createNativeIdentityHandler();
