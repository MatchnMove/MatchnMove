import { NextRequest } from "next/server";
export function hasSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return (
      new URL(origin).origin ===
      new URL(
        process.env.NEXT_PUBLIC_APP_URL ||
          process.env.NEXTAUTH_URL ||
          request.nextUrl.origin,
      ).origin
    );
  } catch {
    return false;
  }
}
