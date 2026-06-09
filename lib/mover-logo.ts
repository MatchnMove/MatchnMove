const STORAGE_LOGO_PREFIX = "storage:";

export function getMoverLogoUrl(moverId: string, logoUrl: string | null) {
  return logoUrl?.startsWith(STORAGE_LOGO_PREFIX) ? `/api/public-movers/${moverId}/logo` : logoUrl;
}

export function getStoredMoverLogoKey(logoUrl: string | null) {
  return logoUrl?.startsWith(STORAGE_LOGO_PREFIX)
    ? logoUrl.slice(STORAGE_LOGO_PREFIX.length)
    : null;
}

export function toStoredMoverLogoUrl(storageKey: string) {
  return `${STORAGE_LOGO_PREFIX}${storageKey}`;
}
