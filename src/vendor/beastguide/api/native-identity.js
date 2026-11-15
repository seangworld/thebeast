import {createIdentityHandler} from './identity.js';
import {nativeRequest} from '../server/native-policy.js';
export function createNativeIdentityHandler({env=process.env,...dependencies}={}){
 // nativeRequest is the single origin gate: it checks the exact Capacitor
 // origin, the native API feature flag, and cookie-free access before calling
 // the shared identity handler. Do not run the browser URL-origin validator
 // again; custom Capacitor origins have different URL.origin semantics.
 const shared=createIdentityHandler({...dependencies,validateOrigin:()=>{}});
 return async(req,res)=>{if(nativeRequest(req,res,{env}))return shared(req,res);};
}
export default createNativeIdentityHandler();
