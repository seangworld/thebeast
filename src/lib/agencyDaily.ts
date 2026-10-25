/** Cole only. Prices are verified rates, not a guarantee of request cost. */
export const COLE_DAILY = {
 username:'cole.after.hours', timezone:'America/New_York', monthlyLimitMicros:10_000_000,
 preparationHour:6, postingHour:18, mode:'approval_required',
 model:'gpt-image-2.5-flare-2026-09-08', pricingChecked:'2026-10-25', pricingExpires:'2026-11-25',
 pricingSource:'https://developers.openai.com/api/docs/models/gpt-image-2.5-flare',
 // Owner-approved conservative estimate, not a provider billing maximum.
 reservationEstimateMicros:250_000,
 estimate:{promptTokensAssumed:2000,referenceTokensAssumed:10000,outputTokensEstimated:196,headroomMicros:154120},
 textInputMicrosPerToken:5, imageInputMicrosPerToken:8, imageOutputMicrosPerToken:30,
} as const;
export function nyDay(date:Date){return new Intl.DateTimeFormat('en-CA',{timeZone:COLE_DAILY.timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(date);}
export function nyHour(date:Date){return Number(new Intl.DateTimeFormat('en-US',{timeZone:COLE_DAILY.timezone,hour:'2-digit',hourCycle:'h23'}).format(date));}
export function nyMonth(date:Date){return nyDay(date).slice(0,7);}
export function dayAtHour(day:string,hour:number){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isInteger(hour)||hour<0||hour>23)throw Error('invalid_schedule');
 const base=Date.parse(`${day}T00:00:00Z`);
 for(let offset=0;offset<30;offset++){const d=new Date(base+offset*3600000);if(nyDay(d)===day&&nyHour(d)===hour)return d.toISOString();}
 throw Error('invalid_schedule');
}
export function nextPostingTime(now:Date){const today=dayAtHour(nyDay(now),18);if(Date.parse(today)>now.getTime())return today;return dayAtHour(nyDay(new Date(now.getTime()+86400000)),18);}
export function requestQuote(now:Date){
 if(now.toISOString().slice(0,10)>=COLE_DAILY.pricingExpires)throw Error('pricing_review_required');
 const estimate=COLE_DAILY.reservationEstimateMicros;
 if(!Number.isSafeInteger(estimate)||estimate<=0||estimate>COLE_DAILY.monthlyLimitMicros)throw Error('invalid_estimate');
 return estimate;
}
export type GenerationUsage={textInputTokens:number;imageInputTokens:number;imageOutputTokens:number};
export function generationUsage(usage:unknown):GenerationUsage{
 const u=usage as {input_tokens?:number;output_tokens?:number;input_tokens_details?:{text_tokens?:number;image_tokens?:number};output_tokens_details?:{text_tokens?:number;image_tokens?:number};total_tokens?:number};
 const t=u?.input_tokens_details?.text_tokens,i=u?.input_tokens_details?.image_tokens,o=u?.output_tokens_details?.image_tokens??u?.output_tokens;
 if(![t,i,o,u?.input_tokens,u?.output_tokens].every(x=>typeof x==='number'&&Number.isSafeInteger(x)&&x>=0&&x<=1_000_000_000)||(t!+i!)!==u.input_tokens||o!==u.output_tokens||(u.output_tokens_details?.text_tokens??0)!==0||(u.total_tokens!==undefined&&u.total_tokens!==u.input_tokens!+u.output_tokens!))throw Error('usage_unverified');
 return {textInputTokens:t!,imageInputTokens:i!,imageOutputTokens:o!};
}
export function usageCost(usage:unknown):number{const u=generationUsage(usage);return u.textInputTokens*5+u.imageInputTokens*8+u.imageOutputTokens*30;}
export function providerFailure(status:number,code:unknown){
 const allowed=['invalid_api_key','insufficient_quota','model_not_found','permission_denied','billing_hard_limit_reached','rate_limit_exceeded','content_policy_violation','moderation_blocked'];
 return {reason:`provider_http_${status}`,code:typeof code==='string'&&allowed.includes(code)?code:'provider_error'};
}

const concepts=[
 ['Fitness','A quiet outdoor strength session, navy athletic tee, natural morning light.','A little stronger than yesterday. That’s enough for today.'],
 ['Outdoors','A coastal trail walk, casual hiking clothes, ocean air and natural daylight.','Fresh air, a longer route, and nowhere to rush.'],
 ['After-hours lifestyle','Relaxed evening on a coastal terrace, simple linen shirt, warm sunset.','Training done. Phone down. Evening open.'],
] as const;
export function dailyCreative(day:string){
 const index=Math.floor(Date.parse(`${day}T12:00:00Z`)/86400000), c=concepts[((index%3)+3)%3];
 const endings=['No rush to the next thing.','Keeping a little room in the day.','The small routines are the ones that stick.','A good reason to step away from the screen.','Nothing elaborate. Just showing up.','Taking the long way home.','A reset worth making time for.','More of this, please.','Simple plans tend to be the best ones.','Leaving some energy for the evening.','Finding a pace I can keep.'];
 const caption=`${c[2]} ${endings[Math.floor(index/3)%endings.length]}`;
 return {theme:c[0],caption,prompt:`Create one original photorealistic lifestyle photograph of the fictional character Cole Mercer. Use ONLY the supplied owner-approved character reference to preserve his exact face: mature, dark tousled hair, trimmed beard, athletic build, 6 feet 1 inch proportions. NO tattoos anywhere. Do not copy the reference composition. ${c[1]} No text, logos, other people or borrowed photographs. Preserve natural anatomy. This is a private draft for owner review, not proof of uniqueness or exclusive rights.`};
}
export function safeDailyReason(error:unknown){const code=error instanceof Error?error.message:'';return ['pricing_review_required','usage_unverified','reservation_exceeded','paused','budget_exhausted','spending_unresolved','provider_timeout','provider_network_error','generated_image_invalid','private_save_unconfirmed','reference_unavailable','generation_not_configured'].includes(code)?code:'preparation_unconfirmed';}
