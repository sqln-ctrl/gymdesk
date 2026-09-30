-- CreateTable
CREATE TABLE "Exercise" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gymId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "equipment" TEXT,
    "instructions" TEXT,
    "mediaUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Exercise_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkoutTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gymId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorkoutTemplate_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "WorkoutTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkoutTemplateDay" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    CONSTRAINT "WorkoutTemplateDay_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WorkoutTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkoutTemplateExercise" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dayId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "sets" INTEGER,
    "reps" TEXT,
    "weightKg" REAL,
    "restSeconds" INTEGER,
    "durationSeconds" INTEGER,
    "notes" TEXT,
    CONSTRAINT "WorkoutTemplateExercise_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "WorkoutTemplateDay" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkoutTemplateExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MemberWorkoutPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "trainerId" TEXT NOT NULL,
    "templateId" TEXT,
    "name" TEXT NOT NULL,
    "goal" TEXT,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MemberWorkoutPlan_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MemberWorkoutPlan_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MemberWorkoutPlan_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WorkoutTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MemberWorkoutDay" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    CONSTRAINT "MemberWorkoutDay_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MemberWorkoutPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MemberWorkoutExercise" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dayId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "sets" INTEGER,
    "reps" TEXT,
    "weightKg" REAL,
    "restSeconds" INTEGER,
    "durationSeconds" INTEGER,
    "notes" TEXT,
    CONSTRAINT "MemberWorkoutExercise_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "MemberWorkoutDay" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MemberWorkoutExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Exercise_gymId_isActive_idx" ON "Exercise"("gymId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Exercise_gymId_name_key" ON "Exercise"("gymId", "name");

-- CreateIndex
CREATE INDEX "WorkoutTemplate_gymId_createdAt_idx" ON "WorkoutTemplate"("gymId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutTemplate_gymId_name_key" ON "WorkoutTemplate"("gymId", "name");

-- CreateIndex
CREATE INDEX "WorkoutTemplateDay_templateId_idx" ON "WorkoutTemplateDay"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutTemplateDay_templateId_dayNumber_key" ON "WorkoutTemplateDay"("templateId", "dayNumber");

-- CreateIndex
CREATE INDEX "WorkoutTemplateExercise_exerciseId_idx" ON "WorkoutTemplateExercise"("exerciseId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutTemplateExercise_dayId_position_key" ON "WorkoutTemplateExercise"("dayId", "position");

-- CreateIndex
CREATE INDEX "MemberWorkoutPlan_memberId_status_idx" ON "MemberWorkoutPlan"("memberId", "status");

-- CreateIndex
CREATE INDEX "MemberWorkoutPlan_trainerId_status_idx" ON "MemberWorkoutPlan"("trainerId", "status");

-- CreateIndex
CREATE INDEX "MemberWorkoutDay_planId_idx" ON "MemberWorkoutDay"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "MemberWorkoutDay_planId_dayNumber_key" ON "MemberWorkoutDay"("planId", "dayNumber");

-- CreateIndex
CREATE INDEX "MemberWorkoutExercise_exerciseId_idx" ON "MemberWorkoutExercise"("exerciseId");

-- CreateIndex
CREATE UNIQUE INDEX "MemberWorkoutExercise_dayId_position_key" ON "MemberWorkoutExercise"("dayId", "position");
