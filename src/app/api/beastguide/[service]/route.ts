import { NextRequest, NextResponse } from "next/server";
import { requireMemberModuleEntitlement } from "@/lib/memberAgeServer";
import { beastGuideAvailable } from "@/lib/beastguide/configuration";
import { beastGuideRuntimeEnvironment } from "@/lib/beastguide/runtime";
import { bearerMatchesCookieUser, GuideRequestError, readGuideBody } from "@/lib/beastguide/http";
import { createIdentityHandler } from "@/vendor/beastguide/api/identity.js";
import catalog from "@/vendor/beastguide/api/catalog.js";
import sports from "@/vendor/beastguide/api/sports.js";
import { getRuntime } from "@/vendor/beastguide/server/identity/runtime.js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const privateHeaders={"cache-control":"private, no-store"};
async function handle(request:NextRequest, context:{params:Promise<{service:string}>}) {
  if(!beastGuideAvailable({enabled:process.env.NEXT_PUBLIC_BEASTGUIDE_ENABLED,authUrl:process.env.NEXT_PUBLIC_SUPABASE_URL})) return NextResponse.json({error:"BEASTGUIDE_NOT_ENABLED"},{status:404,headers:privateHeaders});
  const {service}=await context.params;
  if(!["identity","catalog","sports"].includes(service)) return NextResponse.json({error:"NOT_FOUND"},{status:404,headers:privateHeaders});
  if((service==="identity"&&request.method!=="POST")||(service!=="identity"&&request.method!=="GET"))return NextResponse.json({error:"METHOD_NOT_ALLOWED"},{status:405,headers:privateHeaders});
  const access=await requireMemberModuleEntitlement("beastguide");
  if(!access.ok)return NextResponse.json({error:"BEAST_ACCOUNT_REQUIRED"},{status:access.status,headers:privateHeaders});
  const authorization=request.headers.get("authorization");
  if(service==="identity"&&!bearerMatchesCookieUser(authorization,access.user.id))return NextResponse.json({error:"ACCOUNT_MISMATCH"},{status:401,headers:privateHeaders});
  try {
    const body=service==="identity"?await readGuideBody(request):undefined;
    const headers=Object.fromEntries(request.headers.entries());
    const req={method:request.method,headers,query:Object.fromEntries(request.nextUrl.searchParams.entries()),body};
    let statusCode=200, responseBody="";
    const responseHeaders=new Headers(privateHeaders);
    const res={get statusCode(){return statusCode;},set statusCode(value:number){statusCode=value;},setHeader(name:string,value:string){responseHeaders.set(name,value);},end(value:string){responseBody=value;}};
    const env=beastGuideRuntimeEnvironment(process.env);
    const handler=service==="identity"?createIdentityHandler({runtime:()=>getRuntime(env),origin:()=>env.BEAST_IDENTITY_ORIGIN}):service==="catalog"?catalog:sports;
    await handler(req,res);
    // All embedded endpoints require an account. Never cache their responses.
    responseHeaders.set("cache-control","private, no-store");
    return new NextResponse(responseBody,{status:statusCode,headers:responseHeaders});
  } catch(error) { return NextResponse.json({error:"BEASTGUIDE_UNAVAILABLE"},{status:error instanceof GuideRequestError?error.status:503,headers:privateHeaders}); }
}
export const GET=handle;
export const POST=handle;
