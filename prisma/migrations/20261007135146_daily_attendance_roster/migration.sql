-- CreateTable
CREATE TABLE "DailyAttendance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "attendanceDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL,
    "markedById" TEXT NOT NULL,
    "markedAt" DATETIME NOT NULL,
    CONSTRAINT "DailyAttendance_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DailyAttendance_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DailyAttendance_markedById_fkey" FOREIGN KEY ("markedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "DailyAttendance_branchId_attendanceDate_status_idx" ON "DailyAttendance"("branchId", "attendanceDate", "status");

-- CreateIndex
CREATE UNIQUE INDEX "DailyAttendance_memberId_branchId_attendanceDate_key" ON "DailyAttendance"("memberId", "branchId", "attendanceDate");
