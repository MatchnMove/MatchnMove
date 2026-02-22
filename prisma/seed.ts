import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const pwd = await bcrypt.hash("Password123!", 10);
  const mover = await prisma.user.upsert({
    where: { email: "mover@matchnmove.co.nz" },
    update: {},
    create: {
      email: "mover@matchnmove.co.nz",
      name: "Mark Henderson",
      passwordHash: pwd,
      role: "MOVER",
      moverCompany: {
        create: {
          companyName: "AKL Moving",
          nzbn: "9873670937863",
          yearsOperating: 5,
          contactPerson: "Mark Henderson",
          phone: "+64 555 342 6578",
          serviceAreas: ["Auckland", "Wellington"]
        }
      }
    },
    include: { moverCompany: true }
  });

  await prisma.pricingRule.upsert({
    where: { id: "default-rule" },
    update: {},
    create: {
      id: "default-rule",
      name: "Default lead pricing",
      baseLeadPrice: 4900,
      bedroomModifier: 300,
      urgentModifier: 1200,
      distanceModifier: 500
    }
  });

  console.log("Seeded:", mover.email);
}

main().finally(async () => prisma.$disconnect());
