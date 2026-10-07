-- CreateTable
CREATE TABLE "FitnessClass" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "branchId" TEXT NOT NULL,
    "trainerId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "room" TEXT,
    "defaultCapacity" INTEGER NOT NULL,
    "defaultDurationMinutes" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FitnessClass_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "FitnessClass_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ClassSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fitnessClassId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "startsAt" DATETIME NOT NULL,
    "endsAt" DATETIME NOT NULL,
    "capacity" INTEGER NOT NULL,
    "bookedCount" INTEGER NOT NULL DEFAULT 0,
    "waitlistCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ClassSession_fitnessClassId_fkey" FOREIGN KEY ("fitnessClassId") REFERENCES "FitnessClass" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClassSession_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ClassBooking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'BOOKED',
    "bookedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelledAt" DATETIME,
    CONSTRAINT "ClassBooking_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ClassSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClassBooking_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ClassWaitlistEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClassWaitlistEntry_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ClassSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ClassWaitlistEntry_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "FitnessClass_branchId_isActive_idx" ON "FitnessClass"("branchId", "isActive");

-- CreateIndex
CREATE INDEX "FitnessClass_trainerId_isActive_idx" ON "FitnessClass"("trainerId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "FitnessClass_branchId_name_key" ON "FitnessClass"("branchId", "name");

-- CreateIndex
CREATE INDEX "ClassSession_branchId_startsAt_idx" ON "ClassSession"("branchId", "startsAt");

-- CreateIndex
CREATE INDEX "ClassSession_fitnessClassId_startsAt_idx" ON "ClassSession"("fitnessClassId", "startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "ClassSession_fitnessClassId_startsAt_key" ON "ClassSession"("fitnessClassId", "startsAt");

-- CreateIndex
CREATE INDEX "ClassBooking_memberId_bookedAt_idx" ON "ClassBooking"("memberId", "bookedAt");

-- CreateIndex
CREATE INDEX "ClassBooking_sessionId_status_idx" ON "ClassBooking"("sessionId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ClassBooking_sessionId_memberId_key" ON "ClassBooking"("sessionId", "memberId");

-- CreateIndex
CREATE INDEX "ClassWaitlistEntry_memberId_createdAt_idx" ON "ClassWaitlistEntry"("memberId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ClassWaitlistEntry_sessionId_memberId_key" ON "ClassWaitlistEntry"("sessionId", "memberId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassWaitlistEntry_sessionId_position_key" ON "ClassWaitlistEntry"("sessionId", "position");
