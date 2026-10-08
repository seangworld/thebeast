import {createPrivateKey,createPublicKey,sign,verify} from "node:crypto";
export type LicensePayload={license_id:string;customer_id:string;edition:string;updates_until:string|null;issued_at:string};
export function signBeastFusionLicense(payload:LicensePayload,privateKeyPem:string){
 const key=createPrivateKey(privateKeyPem);
 if(key.asymmetricKeyType!=="ed25519")throw new Error("ed25519_private_key_required");
 const body=Buffer.from(JSON.stringify(payload)).toString("base64url");
 const signature=sign(null,Buffer.from(body),key).toString("base64url");
 return `BF5.${body}.${signature}`;
}
export function verifyBeastFusionLicense(token:string,publicKeyPem:string):LicensePayload|null{
 try{
 const [prefix,body,signature,...extra]=token.split(".");
 if(prefix!=="BF5"||!body||!signature||extra.length)return null;
 const key=createPublicKey(publicKeyPem);
 if(key.asymmetricKeyType!=="ed25519"||!verify(null,Buffer.from(body),key,Buffer.from(signature,"base64url")))return null;
 const data=JSON.parse(Buffer.from(body,"base64url").toString("utf8")) as LicensePayload;
 if(!data.license_id||!data.customer_id||!data.edition||!data.issued_at)return null;
 return data;
 }catch{return null;}
}
