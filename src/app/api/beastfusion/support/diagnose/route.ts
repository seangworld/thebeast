import {NextResponse} from "next/server";
const SECRET_KEYS=/key|token|secret|password|authorization/i;
function scrub(value:unknown):unknown{if(Array.isArray(value))return value.map(scrub);if(value&&typeof value==="object")return Object.fromEntries(Object.entries(value as Record<string,unknown>).map(([k,v])=>[k,SECRET_KEYS.test(k)?"[REDACTED]":scrub(v)]));return value;}
export async function POST(request:Request){const body=await request.json().catch(()=>({}));return NextResponse.json({ok:true,diagnostic:scrub(body),support:{tier:"self_service",vendor_installation_required:false}});}
