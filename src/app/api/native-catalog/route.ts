import { handleNativeBeastGuide } from "@/lib/beastguide/nativeGateway";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = (request: Request) =>
  handleNativeBeastGuide(request, "catalog");
export const OPTIONS = (request: Request) =>
  handleNativeBeastGuide(request, "catalog");
