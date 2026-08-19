-- CreateTable
CREATE TABLE "WeeklyLineup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "playerId" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    CONSTRAINT "WeeklyLineup_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WeeklyLineup_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyLineup_teamId_week_playerId_key" ON "WeeklyLineup"("teamId", "week", "playerId");
