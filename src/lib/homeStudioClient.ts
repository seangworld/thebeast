import { HOME_STUDIO_MAX_IMAGE_BYTES } from "@/lib/homeStudio";

export async function prepareHomeStudioPhoto(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > HOME_STUDIO_MAX_IMAGE_BYTES) {
    throw new Error("Choose JPG, PNG, or WebP room photos up to 3 MB each.");
  }
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const candidate = new window.Image();
      candidate.onload = () => resolve(candidate);
      candidate.onerror = () => reject(new Error("That room photo could not be read."));
      candidate.src = objectUrl;
    });
    const scale = Math.min(1, 1400 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("That room photo could not be prepared.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.82, 0.72, 0.62, 0.52]) {
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      if (dataUrl.length <= 950_000) return dataUrl;
    }
    throw new Error("That room photo is too detailed to prepare safely. Try a smaller image.");
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
