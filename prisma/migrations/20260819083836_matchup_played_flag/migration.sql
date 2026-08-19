-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Matchup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "leagueId" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "homeTeamId" TEXT NOT NULL,
    "awayTeamId" TEXT,
    "homeScore" REAL NOT NULL DEFAULT 0,
    "awayScore" REAL NOT NULL DEFAULT 0,
    "played" BOOLEAN NOT NULL DEFAULT false,
    "medianResult" TEXT,
    "isPlayoffs" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Matchup_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Matchup_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES "Team" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Matchup_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Matchup" ("awayScore", "awayTeamId", "homeScore", "homeTeamId", "id", "isPlayoffs", "leagueId", "medianResult", "week") SELECT "awayScore", "awayTeamId", "homeScore", "homeTeamId", "id", "isPlayoffs", "leagueId", "medianResult", "week" FROM "Matchup";
DROP TABLE "Matchup";
ALTER TABLE "new_Matchup" RENAME TO "Matchup";
CREATE UNIQUE INDEX "Matchup_leagueId_week_homeTeamId_awayTeamId_key" ON "Matchup"("leagueId", "week", "homeTeamId", "awayTeamId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
