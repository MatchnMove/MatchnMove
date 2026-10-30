export function moverDashboardReturnPath(value: string | null | undefined) {
  if (!value || value.length > 2000 || !value.startsWith("/") || value.startsWith("//") || /[\\\r\n]/.test(value)) return "/mover/dashboard";
  try {
    const url = new URL(value, "https://mover.invalid");
    return url.origin === "https://mover.invalid" && url.pathname === "/mover/dashboard"
      ? `${url.pathname}${url.search}${url.hash}` : "/mover/dashboard";
  } catch { return "/mover/dashboard"; }
}
