import { NextRequest, NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/admin-auth";
import { getMoverLaunchTrialSetting, setMoverLaunchTrialSetting } from "@/lib/platform-settings";

export async function GET(req: NextRequest) {
  const admin = await requireAdminRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const launchTrial = await getMoverLaunchTrialSetting();
  return NextResponse.json({ launchTrial });
}

export async function PATCH(req: NextRequest) {
  const admin = await requireAdminRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { enabled?: unknown } | null;
  if (typeof body?.enabled !== "boolean") {
    return NextResponse.json({ error: "Expected enabled to be true or false." }, { status: 400 });
  }

  const launchTrial = await setMoverLaunchTrialSetting(body.enabled, admin.reviewerId);
  return NextResponse.json({ launchTrial });
}
