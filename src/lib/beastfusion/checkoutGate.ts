export function stripeKeyMode(key:string|undefined){
 if(key&&/^(?:sk|rk)_live_/.test(key))return "live";
 if(key&&/^(?:sk|rk)_test_/.test(key))return "test";
 return null;
}
export function beastFusionCheckoutGate(env:Record<string,string|undefined>){
 const mode=stripeKeyMode(env.STRIPE_SECRET_KEY);
 if(!mode||!env.STRIPE_BEASTFUSION_PRO_PRICE_ID)return {allowed:false,reason:"beastfusion_checkout_not_configured"};
 if(mode==="test"){
  const isolated=env.VERCEL_ENV==="preview"||env.VERCEL_ENV==="development"||(!env.VERCEL_ENV&&["test","development"].includes(env.NODE_ENV??""));
  return isolated&&env.BEASTFUSION_TEST_CHECKOUT_ENABLED==="true"
   ?{allowed:true,mode}
   :{allowed:false,reason:"beastfusion_test_checkout_not_authorized"};
 }
 if(env.VERCEL_ENV!=="production"||env.BEASTFUSION_COMMERCIAL_RELEASE_APPROVED!=="true"||env.BEASTFUSION_COMMERCIAL_TERMS_APPROVED!=="true"){
  return {allowed:false,reason:"beastfusion_commercial_release_not_approved"};
 }
 if(!env.BEASTFUSION_LICENSE_PRIVATE_KEY_PEM||!env.STRIPE_BEASTFUSION_WEBHOOK_SECRET||!env.BEASTFUSION_CUSTOMER_ARTIFACT_SHA256?.match(/^[a-f0-9]{64}$/)||!env.BEASTFUSION_CUSTOMER_ARTIFACT_VERSION){
  return {allowed:false,reason:"beastfusion_delivery_not_configured"};
 }
 const release=customerReleaseCatalog(env.BEASTFUSION_CUSTOMER_RELEASES_JSON).find(r=>r.version===env.BEASTFUSION_CUSTOMER_ARTIFACT_VERSION&&r.sha256===env.BEASTFUSION_CUSTOMER_ARTIFACT_SHA256&&r.releasedOn<=new Date().toISOString().slice(0,10));
 if(!release||!env.BEASTFUSION_CUSTOMER_DOWNLOAD_BUCKET)return {allowed:false,reason:"beastfusion_delivery_not_configured"};
 return {allowed:true,mode};
}

export type CustomerRelease={version:string;releasedOn:string;storagePath:string;sha256:string;approved:boolean};
function isoDate(value:unknown):value is string{
 return typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
}
export function customerReleaseCatalog(raw:string|undefined):CustomerRelease[]{
 try{
  const value:unknown=JSON.parse(raw??"null");
  if(!Array.isArray(value)||!value.length)return [];
  const releases:CustomerRelease[]=[];
  const versions=new Set<string>();
  for(const entry of value){
   if(!entry||typeof entry.version!=="string"||!/^[0-9A-Za-z.-]+$/.test(entry.version)||versions.has(entry.version)||!isoDate(entry.releasedOn)||typeof entry.storagePath!=="string"||!entry.storagePath.split("/").every((p:string)=>/^[0-9A-Za-z][0-9A-Za-z._-]*$/.test(p))||typeof entry.sha256!=="string"||!/^[a-f0-9]{64}$/.test(entry.sha256)||entry.approved!==true)return [];
   versions.add(entry.version);releases.push(entry);
  }
  return releases.sort((a,b)=>b.releasedOn.localeCompare(a.releasedOn));
 }catch{return [];}
}
export function entitledCustomerRelease(raw:string|undefined,updatesUntil:string|null,now=new Date()){
 if(!isoDate(updatesUntil))return null;
 const today=now.toISOString().slice(0,10);
 return customerReleaseCatalog(raw).find(r=>r.releasedOn<=updatesUntil&&r.releasedOn<=today)??null;
}


