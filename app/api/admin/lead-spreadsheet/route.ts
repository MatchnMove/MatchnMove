import { NextRequest, NextResponse } from "next/server";
import { requireAdminRequest } from "@/lib/admin-auth";
import {
  disconnectMicrosoftLeadSpreadsheet,
  getLeadSpreadsheetDiagnostics,
  processLeadSpreadsheetQueue,
  provisionLeadWorkbook,
  retryLeadSpreadsheetDeliveries,
} from "@/lib/lead-spreadsheet";

export async function GET(req: NextRequest) {
  const admin = await requireAdminRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json(await getLeadSpreadsheetDiagnostics());
}

export async function POST(req: NextRequest) {
  const admin = await requireAdminRequest(req);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { action?: unknown } | null;
  if (typeof body?.action !== "string") {
    return NextResponse.json({ error: "A valid action is required." }, { status: 400 });
  }

  try {
    if (body.action === "provision") {
      const result = await provisionLeadWorkbook(admin.reviewerId);
      return NextResponse.json({ action: body.action, result, diagnostics: await getLeadSpreadsheetDiagnostics() });
    }
    if (body.action === "process") {
      const result = await processLeadSpreadsheetQueue(100);
      return NextResponse.json({ action: body.action, result, diagnostics: await getLeadSpreadsheetDiagnostics() });
    }
    if (body.action === "retry") {
      const reset = await retryLeadSpreadsheetDeliveries(admin.reviewerId);
      const result = await processLeadSpreadsheetQueue(100);
      return NextResponse.json({ action: body.action, reset, result, diagnostics: await getLeadSpreadsheetDiagnostics() });
    }
    if (body.action === "disconnect") {
      await disconnectMicrosoftLeadSpreadsheet(admin.reviewerId);
      return NextResponse.json({ action: body.action, diagnostics: await getLeadSpreadsheetDiagnostics() });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (error) {
    console.error("lead spreadsheet admin action failed", {
      action: body.action,
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json({
      error: error instanceof Error ? error.message : "The spreadsheet action failed.",
    }, { status: 500 });
  }
}
