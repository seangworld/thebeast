import { createSeangworldAdsTxtResponse } from "../../lib/adsense";

export const dynamic = "force-static";

export function GET() {
  return createSeangworldAdsTxtResponse();
}
