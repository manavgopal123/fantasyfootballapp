/*
  Warnings:

  - Added the required column `rosterSlots` to the `League` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Player" ADD COLUMN "searchRank" INTEGER;

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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "commissionerId" TEXT NOT NULL,
    CONSTRAINT "League_commissionerId_fkey" FOREIGN KEY ("commissionerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_League" ("commissionerId", "createdAt", "id", "name", "playoffTeams", "regularSeasonWeeks", "scoringSettings", "season", "standingsFormat", "status") SELECT "commissionerId", "createdAt", "id", "name", "playoffTeams", "regularSeasonWeeks", "scoringSettings", "season", "standingsFormat", "status" FROM "League";
DROP TABLE "League";
ALTER TABLE "new_League" RENAME TO "League";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
