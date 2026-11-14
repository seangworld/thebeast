const pages=new Set(['library','discover','profile','bookmark']);
export const guideDestination=value=>pages.has(value)?value:'library';
export function guideVerificationCallback(origin,next){
 const url=new URL('/',origin);url.searchParams.set('beast_verify','1');url.searchParams.set('return_app','beastguide');url.searchParams.set('next',guideDestination(next));return url.toString();
}
