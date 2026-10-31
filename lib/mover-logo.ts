const STORAGE_LOGO_PREFIX = "storage:";

export function getMoverLogoUrl(moverId: string, logoUrl: string | null) {
  if (!logoUrl?.startsWith(STORAGE_LOGO_PREFIX)) return logoUrl;
  const key = getStoredMoverLogoKey(logoUrl);
  if (!key) return null;
  // A replacement logo must bypass cached redirects for the previous upload.
  const revision = key.split("/").at(-1) ?? key;
  return `/api/public-movers/${moverId}/logo?v=${encodeURIComponent(revision)}`;
}

export function getStoredMoverLogoKey(logoUrl: string | null) {
  return logoUrl?.startsWith(STORAGE_LOGO_PREFIX)
    ? logoUrl.slice(STORAGE_LOGO_PREFIX.length)
    : null;
}

export function toStoredMoverLogoUrl(storageKey: string) {
  return `${STORAGE_LOGO_PREFIX}${storageKey}`;
}
