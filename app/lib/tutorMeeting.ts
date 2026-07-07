import { safeExternalUrl } from "./security";

export function normalizeVoovMeetingUrl(value: string) {
  const normalized = safeExternalUrl(value);
  if (!normalized) return null;

  const url = new URL(normalized);
  return url.protocol === "https:" && url.hostname === "voovmeeting.com"
    ? url.toString()
    : null;
}

export function isValidMeetingPassword(value: string) {
  return /^[0-9]{4,6}$/.test(value);
}
