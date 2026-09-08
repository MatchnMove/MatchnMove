import { NextResponse } from "next/server";
import { requireAuthenticatedCleaner } from "@/lib/cleaner-auth";
import { prisma } from "@/lib/db";

const privateNoStoreHeaders = {
  "Cache-Control": "private, no-store, max-age=0, must-revalidate",
  Pragma: "no-cache",
};

function getSafeDocumentUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (process.env.NODE_ENV === "production" && url.protocol !== "https:") return null;
    return url;
  } catch {
    return null;
  }
}

export async function GET(
  _: Request,
  { params }: { params: Promise<{ invoiceId: string }> },
) {
  const cleaner = await requireAuthenticatedCleaner();
  if (!cleaner) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: privateNoStoreHeaders },
    );
  }

  const { invoiceId } = await params;
  const invoice = await prisma.cleanerInvoice.findFirst({
    where: { id: invoiceId, cleanerCompanyId: cleaner.id },
    select: { hostedInvoiceUrl: true, invoicePdfUrl: true },
  });
  if (!invoice) {
    return NextResponse.json(
      { error: "Cleaner invoice not found." },
      { status: 404, headers: privateNoStoreHeaders },
    );
  }

  const target = getSafeDocumentUrl(invoice.hostedInvoiceUrl)
    ?? getSafeDocumentUrl(invoice.invoicePdfUrl);
  if (!target) {
    return NextResponse.json(
      { error: "An invoice document is not available yet." },
      { status: 404, headers: privateNoStoreHeaders },
    );
  }

  const response = NextResponse.redirect(target);
  response.headers.set("Cache-Control", privateNoStoreHeaders["Cache-Control"]);
  response.headers.set("Pragma", privateNoStoreHeaders.Pragma);
  return response;
}
