import { redirect } from "next/navigation";
import { AdminMoverVerificationPanel } from "@/components/admin-mover-verification-panel";
import { isAdminUser } from "@/lib/admin-auth";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DOCUMENT_VERIFICATION, NZBN_VERIFICATION } from "@/lib/nzbn-verification";

export default async function AdminVerificationPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/mover/login");

  if (!isAdminUser(session.user)) {
    return (
      <section className="min-h-screen bg-slate-100 px-4 py-16">
        <div className="mx-auto max-w-3xl rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-rose-700">Admin only</p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.05em] text-slate-950">Verification queue unavailable</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">This page is restricted to Match &apos;n Move admin accounts.</p>
        </div>
      </section>
    );
  }

  const [nzbnReviews, documentReviews] = await Promise.all([
    prisma.moverCompany.findMany({
      where: {
        nzbnVerificationStatus: NZBN_VERIFICATION.PENDING_REVIEW,
      },
      select: {
        id: true,
        companyName: true,
        nzbn: true,
        nzbnRegisteredName: true,
        nzbnEntityStatus: true,
        nzbnVerificationError: true,
        nzbnVerificationSource: true,
        updatedAt: true,
        user: {
          select: {
            email: true,
          },
        },
      },
      orderBy: { updatedAt: "asc" },
      take: 100,
    }),
    prisma.moverDocument.findMany({
      where: {
        verificationStatus: DOCUMENT_VERIFICATION.PENDING_REVIEW,
      },
      include: {
        moverCompany: {
          select: {
            id: true,
            companyName: true,
            nzbn: true,
            nzbnVerificationStatus: true,
            user: {
              select: {
                email: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
      take: 100,
    }),
  ]);

  return (
    <section className="min-h-screen bg-[linear-gradient(180deg,#eef4fb_0%,#f7f9fc_100%)] px-4 py-5">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-4 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-sky-700">Admin verification</p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.05em] text-slate-950">Mover verification queue</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Approve only details that match the NZBN Register and submitted evidence. A mover profile is not public and cannot open new leads until all required checks pass.
          </p>
        </div>

        <AdminMoverVerificationPanel
          initialNzbnReviews={nzbnReviews.map((mover) => ({
            id: mover.id,
            companyName: mover.companyName,
            nzbn: mover.nzbn,
            nzbnRegisteredName: mover.nzbnRegisteredName,
            nzbnEntityStatus: mover.nzbnEntityStatus,
            nzbnVerificationError: mover.nzbnVerificationError,
            nzbnVerificationSource: mover.nzbnVerificationSource,
            updatedAt: mover.updatedAt.toISOString(),
            userEmail: mover.user.email,
          }))}
          initialDocumentReviews={documentReviews.map((document) => ({
            id: document.id,
            moverCompanyId: document.moverCompanyId,
            type: document.type,
            fileName: document.fileName ?? "Document",
            mimeType: document.mimeType,
            fileSize: document.fileSize,
            viewUrl: `/api/admin/mover-verification/documents/${document.id}/file`,
            createdAt: document.createdAt.toISOString(),
            moverCompany: {
              id: document.moverCompany.id,
              companyName: document.moverCompany.companyName,
              nzbn: document.moverCompany.nzbn,
              nzbnVerificationStatus: document.moverCompany.nzbnVerificationStatus,
              userEmail: document.moverCompany.user.email,
            },
          }))}
        />
      </div>
    </section>
  );
}
