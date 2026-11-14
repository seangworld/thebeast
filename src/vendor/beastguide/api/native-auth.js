import {createUniversalHandler} from './auth-universal.js';
import {nativeRequest,nativeOriginAllowed} from '../server/native-policy.js';
export function createNativeAuthHandler({env=process.env,...dependencies}={}){
 const shared=createUniversalHandler({...dependencies,env,originAllowed:req=>nativeOriginAllowed(req,env)});
 return async(req,res)=>{if(nativeRequest(req,res,{env,authorization:false}))return shared(req,res);};
}
export default createNativeAuthHandler();
