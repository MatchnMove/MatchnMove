import { PrismaClient } from "@prisma/client";
import { hashPassword } from "@/lib/password";

const prisma = new PrismaClient();

async function main() {
  const pwd = await hashPassword("Password123!");
  const now = new Date();
  const moverCompanyData = {
    companyName: "AKL Moving",
    businessDescription:
      "AKL Moving helps Auckland households and small businesses plan reliable local and regional moves with clear communication, careful loading, and practical move-day support.",
    nzbn: "9873670937863",
    yearsOperating: 5,
    logoUrl: "/images/movers/mover-partner-preview.svg",
    contactPerson: "Mark Henderson",
    phone: "+64 555 342 6578",
    serviceAreas: ["Auckland", "Wellington"],
  };

  const mover = await prisma.user.upsert({
    where: { email: "mover@matchnmove.co.nz" },
    update: {
      name: "Mark Henderson",
      emailVerifiedAt: now,
      role: "MOVER",
      moverCompany: {
        upsert: {
          update: moverCompanyData,
          create: moverCompanyData,
        },
      },
    },
    create: {
      email: "mover@matchnmove.co.nz",
      name: "Mark Henderson",
      passwordHash: pwd,
      emailVerifiedAt: now,
      role: "MOVER",
      moverCompany: {
        create: moverCompanyData,
      }
    },
    include: { moverCompany: true }
  });

  if (mover.moverCompany) {
    await prisma.moverDocument.deleteMany({ where: { moverCompanyId: mover.moverCompany.id } });
    await prisma.moverDocument.create({
      data: {
        moverCompanyId: mover.moverCompany.id,
        type: "INSURANCE",
        fileName: "AKL Moving insurance certificate.pdf",
        mimeType: "application/pdf",
        fileSize: 18,
        fileUrl: "data:application/pdf;base64,JVBERi0xLjQKJUVPRg==",
      },
    });
  }

  await prisma.pricingRule.upsert({
    where: { id: "default-rule" },
    update: {},
    create: {
      id: "default-rule",
      name: "Default lead pricing",
      baseLeadPrice: 2000,
      bedroomModifier: 1000,
      urgentModifier: 2000,
      distanceModifier: 2000
    }
  });

  console.log("Seeded:", mover.email);
}

main().finally(async () => prisma.$disconnect());
