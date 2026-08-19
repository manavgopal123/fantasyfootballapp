-- CreateTable
CREATE TABLE "TeamGameTime" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "season" INTEGER NOT NULL,
    "week" INTEGER NOT NULL,
    "nflTeam" TEXT NOT NULL,
    "kickoffAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_League" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SETUP',
    "standingsFormat" TEXT NOT NULL DEFAULT 'HEAD_TO_HEAD',
    "scoringSettings" JSONB NOT NULL,
    "rosterSlots" JSONB NOT NULL,
    "playoffTeams" INTEGER NOT NULL DEFAULT 0,
    "regularSeasonWeeks" INTEGER NOT NULL DEFAULT 14,
    "lockDayOfWeek" INTEGER NOT NULL DEFAULT 4,
    "lockHour" INTEGER NOT NULL DEFAULT 20,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "commissionerId" TEXT NOT NULL,
    CONSTRAINT "League_commissionerId_fkey" FOREIGN KEY ("commissionerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_League" ("commissionerId", "createdAt", "id", "name", "playoffTeams", "regularSeasonWeeks", "rosterSlots", "scoringSettings", "season", "standingsFormat", "status") SELECT "commissionerId", "createdAt", "id", "name", "playoffTeams", "regularSeasonWeeks", "rosterSlots", "scoringSettings", "season", "standingsFormat", "status" FROM "League";
DROP TABLE "League";
ALTER TABLE "new_League" RENAME TO "League";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "TeamGameTime_season_week_nflTeam_key" ON "TeamGameTime"("season", "week", "nflTeam");
