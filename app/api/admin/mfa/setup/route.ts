import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { auth } from "@/lib/auth";
import { isAdminUser } from "@/lib/admin-auth";
import {
  createAdminMfaSecret,
  decryptAdminMfaSecret,
  encryptAdminMfaSecret,
  getAdminMfaKeyUri,
} from "@/lib/admin-mfa";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!isAdminUser(session?.user)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { adminMfaSecret: true, adminMfaEnabledAt: true },
  });
  if (!user) return NextResponse.json({ error: "Admin account not found." }, { status: 404 });

  const secret = user.adminMfaSecret ? decryptAdminMfaSecret(user.adminMfaSecret) : createAdminMfaSecret();
  if (!user.adminMfaSecret) {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { adminMfaSecret: encryptAdminMfaSecret(secret) },
    });
  }

  const keyUri = getAdminMfaKeyUri(session.user.email, secret);
  const qrDataUrl = user.adminMfaEnabledAt ? null : await QRCode.toDataURL(keyUri, { width: 280, margin: 1 });

  return NextResponse.json({
    enabled: Boolean(user.adminMfaEnabledAt),
    qrDataUrl,
    manualKey: user.adminMfaEnabledAt ? null : secret,
  });
}
