/** Display references only. Never use these as post media or approval evidence. */
export const talentAppearance = {
 cole: {name:'Cole Mercer',description:'Blue-shirt portrait with two full tattoo sleeves',width:736,height:1104,filename:'cole-blue-shirt.jpeg',sha256:'702e633bb8a0b4ceb75742957b46287f3b6cd89c3cf316cd423a6e3c1c862452',source:'https://www.pinterest.com/pin/862931978628663249/',sourceLabel:'Pinterest · Pin em Soulbound'},
 leila: {name:'Leila Bautista',description:'Cream-suit portrait',width:1024,height:1024,filename:'leila-cream-suit.jpeg',sha256:'2c0a03b587bd09827ae1a55a10a611838862dc0a5c85d4164af650fe0f673057',source:'https://bylo.ai/features/ai-influencer',sourceLabel:'Bylo.ai · AI Influencer'},
} as const;
export type AppearanceTalent=keyof typeof talentAppearance;
