-- CreateTable
CREATE TABLE "Equipment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "branchId" TEXT NOT NULL,
    "assetCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "location" TEXT,
    "purchaseDate" DATETIME,
    "warrantyEndsAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "lastServiceAt" DATETIME,
    "nextServiceAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Equipment_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MaintenanceRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "equipmentId" TEXT NOT NULL,
    "servicedAt" DATETIME NOT NULL,
    "serviceType" TEXT NOT NULL,
    "vendor" TEXT,
    "costMinor" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "nextDueAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MaintenanceRecord_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Equipment_branchId_status_nextServiceAt_idx" ON "Equipment"("branchId", "status", "nextServiceAt");

-- CreateIndex
CREATE UNIQUE INDEX "Equipment_branchId_assetCode_key" ON "Equipment"("branchId", "assetCode");

-- CreateIndex
CREATE INDEX "MaintenanceRecord_equipmentId_servicedAt_idx" ON "MaintenanceRecord"("equipmentId", "servicedAt");

-- CreateIndex
CREATE INDEX "MaintenanceRecord_servicedAt_idx" ON "MaintenanceRecord"("servicedAt");
