import { db } from "@/lib/db";
import { calculateFantasyPoints } from "./calculate";
import { ScoringSettings } from "./types";

// Sums fantasy points for a team's starting lineup in a given week, using a
// locked-in weekly lineup snapshot rather than the live roster. The first
// time a (team, week) pair is scored, the current non-bench/IR roster slots
// are copied into WeeklyLineup and locked; later calls for the same week
// (e.g. refreshing live in-game stats) reuse that snapshot even if the live
// roster has since changed — editing your bench only affects future weeks.
export async function computeTeamWeekScore(
  teamId: string,
  season: number,
  week: number,
  scoring: ScoringSettings
): Promise<number> {
  const alreadyLocked = (await db.weeklyLineup.count({ where: { teamId, week } })) > 0;

  if (!alreadyLocked) {
    const starters = await db.rosterEntry.findMany({
      where: { teamId, slot: { notIn: ["BENCH", "IR"] } },
    });
    if (starters.length > 0) {
      await db.weeklyLineup.createMany({
        data: starters.map((entry) => ({ teamId, week, playerId: entry.playerId, slot: entry.slot })),
      });
    }
  }

  const lineup = await db.weeklyLineup.findMany({
    where: { teamId, week },
    include: { player: true },
  });

  let total = 0;
  for (const entry of lineup) {
    const stat = await db.playerWeekStats.findUnique({
      where: { playerId_season_week: { playerId: entry.playerId, season, week } },
    });
    if (!stat) continue;
    total += calculateFantasyPoints(
      stat.stats as Record<string, number>,
      scoring,
      entry.player.position
    );
  }

  return Math.round(total * 100) / 100;
}
