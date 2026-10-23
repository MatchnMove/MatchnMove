export function isPrivateWorkspacePath(pathname: string | null) {
  return Boolean(
    pathname &&
      [
        "/admin",
        "/recruitment",
        "/mover",
        "/cleaner",
        "/review",
        "/quote",
        "/contact",
        "/thank-you",
        "/request",
        "/moving-inventory",
      ].some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
      ),
  );
}
