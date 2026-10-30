export function isPrivateWorkspacePath(pathname: string | null) {
  return Boolean(
    pathname &&
      [
        "/app", "/login", "/signup", "/install",
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
