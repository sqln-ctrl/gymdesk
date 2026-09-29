import { PrismaClient } from "@prisma/client";

import { seedAuthorization } from "../src/lib/permissions/seed";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  await prisma.$transaction(seedAuthorization);
  console.log("Seeded GymFlow roles and permissions.");
}

main()
  .catch((error: unknown) => {
    console.error("Failed to seed roles and permissions.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
