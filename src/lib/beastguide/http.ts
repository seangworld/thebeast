export class GuideRequestError extends Error { constructor(public status: number) { super("Invalid BeastGuide request"); } }
export async function readGuideBody(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new GuideRequestError(415);
  if(Number(request.headers.get("content-length")||0)>65536) throw new GuideRequestError(413);
  const reader=request.body?.getReader();
  if(!reader) throw new GuideRequestError(400);
  const chunks:Uint8Array[]=[]; let size=0;
  try { while(true) { const {value,done}=await reader.read(); if(done)break; size+=value.length; if(size>65536){await reader.cancel();throw new GuideRequestError(413);} chunks.push(value); } }
  finally {reader.releaseLock();}
  try {return JSON.parse(Buffer.concat(chunks).toString("utf8"));} catch {throw new GuideRequestError(400);}
}
// A decoded subject is only an additional consistency check. The original
// gateway still verifies this exact bearer against canonical Auth and sessions.
export function bearerMatchesCookieUser(authorization: string | null, userId: string) {
  try {const token=/^Bearer ([A-Za-z0-9_.-]+)$/.exec(authorization||"")?.[1];return Boolean(token && token.length<=12000 && JSON.parse(Buffer.from(token.split(".")[1],"base64url").toString()).sub===userId);}catch{return false;}
}
