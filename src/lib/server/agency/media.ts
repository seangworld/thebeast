import { createHash } from 'node:crypto';
import { allowedSocialMedia } from '@/lib/marketingSocial';
/** Hash the bounded original JPEG bytes, not a mutable URL alone. Never follow redirects. */
export async function agencyMediaHash(url:string,supabaseUrl?:string) {
 if(!allowedSocialMedia(url,supabaseUrl))throw Error('Choose an owned public media asset.');
 const response=await fetch(url,{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)});
 if(!response.ok||!response.headers.get('content-type')?.startsWith('image/jpeg')||Number(response.headers.get('content-length')||0)>8*1024*1024)throw Error('Media must be an available JPEG smaller than 8 MB.');
 const reader=response.body?.getReader();if(!reader)throw Error('Media bytes are unavailable.');
 const hash=createHash('sha256');let size=0;let signature:Uint8Array|undefined;
 try {while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>8*1024*1024)throw Error('JPEG exceeds 8 MB.');if(!signature)signature=value;hash.update(value);}}finally{await reader.cancel();}
 if(!signature||size<4||signature[0]!==255||signature[1]!==216)throw Error('The asset is not a valid JPEG.');
 return hash.digest('hex');
}
