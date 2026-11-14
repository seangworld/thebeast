import catalog from './catalog.js';
import {nativeRequest} from '../server/native-policy.js';
// Public catalog metadata only. Existing provider/license gates remain in catalog.
export default async function handler(req,res){if(nativeRequest(req,res,{method:'GET',authorization:false}))return catalog(req,res);}
