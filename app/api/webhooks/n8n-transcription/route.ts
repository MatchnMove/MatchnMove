import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { quoteRequestId, transcriptRaw, extractedFields } = body;
  if (!quoteRequestId) return NextResponse.json({ error: "quoteRequestId required" }, { status: 400 });

  await prisma.quoteRequest.update({ where: { id: quoteRequestId }, data: { transcriptRaw, transcriptFields: extractedFields, transcriptionState: "complete" } });
  return NextResponse.json({ ok: true });
}
