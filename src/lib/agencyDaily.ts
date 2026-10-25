/** Cole only. Prices are verified rates, not a guarantee of request cost. */
export const COLE_DAILY = {
 username:'cole.after.hours', timezone:'America/New_York', monthlyLimitMicros:10_000_000,
 preparationHour:6, postingHour:18, mode:'approval_required',
 model:'gpt-image-2.5-flare-2026-09-08', pricingChecked:'2026-10-25', pricingExpires:'2026-11-25',
 pricingSource:'https://developers.openai.com/api/docs/models/gpt-image-2.5-flare',
 // The Images API has no documented token ceiling for this reference edit.
 // Do not replace this with a typical image price or a client/environment value.
 requestMaximumMicros:null as number|null,
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
 const bound=COLE_DAILY.requestMaximumMicros;
 if(bound===null||!Number.isSafeInteger(bound)||bound<=0||bound>COLE_DAILY.monthlyLimitMicros)throw Error('request_cost_bound_unverified');
 return bound;
}
export function usageCost(usage:unknown):number{
 const u=usage as {input_tokens?:number;output_tokens?:number;input_tokens_details?:{text_tokens?:number;image_tokens?:number};output_tokens_details?:{text_tokens?:number;image_tokens?:number}};
 const t=u?.input_tokens_details?.text_tokens,i=u?.input_tokens_details?.image_tokens,o=u?.output_tokens_details?.image_tokens;
 if(![t,i,o,u?.input_tokens,u?.output_tokens].every(x=>typeof x==='number'&&Number.isSafeInteger(x)&&x>=0)||(t! + i!)!==u.input_tokens||o!==u.output_tokens||(u.output_tokens_details?.text_tokens??0)!==0)throw Error('usage_unverified');
 const cost=t!*5+i!*8+o!*30;if(!Number.isSafeInteger(cost))throw Error('usage_unverified');return cost;
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
export function safeDailyReason(error:unknown){const code=error instanceof Error?error.message:'';return ['request_cost_bound_unverified','pricing_review_required','usage_unverified','paused','budget_exhausted','spending_unresolved'].includes(code)?code:'preparation_unconfirmed';}
