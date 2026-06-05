import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

type AdminContext = {
  reviewerId: string;
};

function extractBearerToken(req: NextRequest) {
  const authorization = req.headers.get("authorization");
  const bearerMatch = authorization?.match(/^Bearer\s+(.+)$/i);
  return bearerMatch?.[1]?.trim() || req.headers.get("x-admin-token")?.trim() || null;
}

export async function requireAdminRequest(req: NextRequest): Promise<AdminContext | null> {
  const session = await auth();
  if (session?.user?.role === "ADMIN") {
    return { reviewerId: session.user.id };
  }

  const configuredToken = process.env.MOVER_VERIFICATION_ADMIN_TOKEN;
  const requestToken = extractBearerToken(req);
  if (configuredToken && requestToken && requestToken === configuredToken) {
    return { reviewerId: "admin-token" };
  }

  return null;
}
