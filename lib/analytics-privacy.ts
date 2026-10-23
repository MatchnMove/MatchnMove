export function isPrivateWorkspacePath(pathname: string | null) {
  return Boolean(
    pathname &&
      ["/admin", "/recruitment", "/mover", "/cleaner", "/review"].some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
      ),
  );
}
