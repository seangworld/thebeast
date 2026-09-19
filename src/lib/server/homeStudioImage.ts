import "server-only";

import {
  HOME_STUDIO_MAX_DATA_URL_LENGTH,
  HOME_STUDIO_MAX_IMAGE_BYTES,
  homeStudioImagePattern,
} from "@/lib/homeStudio";

export function decodeHomeStudioImage(image: unknown) {
  if (typeof image !== "string" || image.length > HOME_STUDIO_MAX_DATA_URL_LENGTH) return null;
  const match = homeStudioImagePattern.exec(image);
  if (!match) return null;
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.byteLength === 0 || bytes.byteLength > HOME_STUDIO_MAX_IMAGE_BYTES) return null;
  return { bytes, mimeType: `image/${match[1]}` as "image/jpeg" | "image/png" | "image/webp" };
}
