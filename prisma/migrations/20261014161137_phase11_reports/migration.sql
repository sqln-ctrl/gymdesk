-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Membership" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "isRenewal" BOOLEAN NOT NULL DEFAULT false,
    "priceMinor" INTEGER NOT NULL,
    "discountMinor" INTEGER NOT NULL DEFAULT 0,
    "taxMinor" INTEGER NOT NULL DEFAULT 0,
    "totalMinor" INTEGER NOT NULL,
    "freezeDaysUsed" INTEGER NOT NULL DEFAULT 0,
    "cancelledAt" DATETIME,
    "cancellationReason" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Membership_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Membership_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Membership_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MembershipPlan" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Membership_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Membership" ("branchId", "cancellationReason", "cancelledAt", "createdAt", "createdById", "discountMinor", "endDate", "freezeDaysUsed", "id", "memberId", "planId", "priceMinor", "startDate", "status", "taxMinor", "totalMinor", "updatedAt") SELECT "branchId", "cancellationReason", "cancelledAt", "createdAt", "createdById", "discountMinor", "endDate", "freezeDaysUsed", "id", "memberId", "planId", "priceMinor", "startDate", "status", "taxMinor", "totalMinor", "updatedAt" FROM "Membership";
DROP TABLE "Membership";
ALTER TABLE "new_Membership" RENAME TO "Membership";
CREATE INDEX "Membership_memberId_status_endDate_idx" ON "Membership"("memberId", "status", "endDate");
CREATE INDEX "Membership_branchId_status_endDate_idx" ON "Membership"("branchId", "status", "endDate");
CREATE INDEX "Membership_branchId_createdAt_idx" ON "Membership"("branchId", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
