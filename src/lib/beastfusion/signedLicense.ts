import {createHmac,timingSafeEqual} from "node:crypto";
export type LicensePayload={license_id:string;customer_id:string;edition:string;updates_until:string|null;issued_at:string};
export function signBeastFusionLicense(payload:LicensePayload,secret:string){
 if(!secret||secret.length<32)throw new Error("signing_secret_unavailable");
 const body=Buffer.from(JSON.stringify(payload)).toString("base64url");
 const signature=createHmac("sha256",secret).update(body).digest("base64url");
 return `BF5.${body}.${signature}`;
}
export function verifyBeastFusionLicense(key:string,secret:string){
 try{
 const [prefix,body,sig,...rest]=key.split(".");
 if(prefix!=="BF5"||!body||!sig||rest.length||!secret)return null;
 const expected=createHmac("sha256",secret).update(body).digest();
 const actual=Buffer.from(sig,"base64url");
 if(expected.length!==actual.length||!timingSafeEqual(expected,actual))return null;
 const data=JSON.parse(Buffer.from(body,"base64url").toString("utf8")) as LicensePayload;
 if(!data.license_id||!data.customer_id||!data.edition||!data.issued_at)return null;
 return data;
 }catch{return null;}
}
