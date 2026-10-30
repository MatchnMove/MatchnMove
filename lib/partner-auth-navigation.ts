export type PartnerBusiness = "mover" | "cleaner";
export type PartnerAuthMode = "login" | "signup";

export function partnerAuthHref(business: PartnerBusiness, mode: PartnerAuthMode) {
  return business === "mover" ? `/mover/login?mode=${mode}` : mode === "signup" ? "/cleaner/register" : "/cleaner/login";
}

export function partnerAuthReturnPath(business: PartnerBusiness, value: string | null, appMode: boolean) {
  const fallback = `/${business}/dashboard`;
  if (!value || value.length > 2000 || !value.startsWith("/") || value.startsWith("//") || /[\\\r\n]/.test(value)) return fallback;
  try {
    const url = new URL(value, "https://partner.invalid");
    const allowed = business === "cleaner" ? url.pathname === "/cleaner/dashboard"
      : url.pathname === "/mover/dashboard" || (!appMode && (/^\/admin(?:\/|$)/.test(url.pathname) || ["/mover/reviews", "/mover/pricing"].includes(url.pathname)));
    return url.origin === "https://partner.invalid" && allowed ? `${url.pathname}${url.search}${url.hash}` : fallback;
  } catch { return fallback; }
}
