import { handleNativeBeastGuide } from "@/lib/beastguide/nativeGateway";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = (request: Request) =>
  handleNativeBeastGuide(request, "auth");
export const OPTIONS = (request: Request) =>
  handleNativeBeastGuide(request, "auth");
