/** Display references only. Never use these as post media or approval evidence. */
export const talentAppearance = {
 cole: {name:'Cole Mercer',description:'Mature, athletic, dark tousled hair, trimmed beard, no tattoos — coastal portrait',width:1254,height:1254,filename:'cole-ink-free-coastal.png',storageFilename:'cole-ink-free-coastal.png',contentType:'image/png',bytes:2021199,sha256:'c84a2646f592c74d92430e33753b10b87a3c9cc6dec1eb8e3539383842a4e3bb',source:'',sourceLabel:'Owner-approved ChatGPT portrait',provenance:'Owner reports generation in ChatGPT from a written description without an outside reference image, followed by editing to remove tattoos. No guaranteed uniqueness or exclusive rights claimed. Canonical appearance and profile-picture approval only; future posts require separate approval.'},
 leila: {name:'Leila Bautista',description:'Cream-suit portrait',width:1024,height:1024,filename:'leila-cream-suit.jpeg',sha256:'2c0a03b587bd09827ae1a55a10a611838862dc0a5c85d4164af650fe0f673057',source:'https://bylo.ai/features/ai-influencer',sourceLabel:'Bylo.ai · AI Influencer'},
} as const;
export type AppearanceTalent=keyof typeof talentAppearance;
