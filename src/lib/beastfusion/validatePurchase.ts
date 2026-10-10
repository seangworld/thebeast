export type BeastFusionCheckoutLike = {
  id:string; mode?:string|null; amount_total?:number|null; currency?:string|null;
  payment_status?:string|null; client_reference_id?:string|null;
  created:number; livemode?:boolean;
  metadata?:Record<string,string>|null;
};
export function validateBeastFusionPurchase(session:BeastFusionCheckoutLike, expectedLivemode:boolean){
 if(session.metadata?.product!=="beastfusion-professional")return {ok:false as const,reason:"wrong_product"};
 if(session.livemode!==expectedLivemode)return {ok:false as const,reason:"mode_mismatch"};
 if(session.payment_status!=="paid")return {ok:false as const,reason:"not_paid"};
 if(session.mode!=="payment"||session.amount_total!==50000||session.currency?.toLowerCase()!=="usd")return {ok:false as const,reason:"purchase_mismatch"};
 const userId=session.metadata?.user_id;
 if(!userId||userId!==session.client_reference_id)return {ok:false as const,reason:"customer_identity_mismatch"};
 if(!Number.isFinite(session.created)||session.created<=0)return {ok:false as const,reason:"invalid_purchase_time"};
 const updatesUntil=new Date(session.created*1000);
 updatesUntil.setUTCFullYear(updatesUntil.getUTCFullYear()+1);
 return {ok:true as const,userId,licenseId:`bf_${session.id}`,updatesUntil:updatesUntil.toISOString().slice(0,10)};
}