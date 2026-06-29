export const MAX_COVER_IMAGE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_COVER_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export function safeExternalUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(
      /^[a-z][a-z\d+\-.]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`,
    );
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function coverImageValidationError(file: File) {
  if (!ALLOWED_COVER_IMAGE_TYPES.has(file.type)) return "type";
  if (file.size > MAX_COVER_IMAGE_BYTES) return "size";
  return null;
}
