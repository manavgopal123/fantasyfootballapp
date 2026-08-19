import { db } from "@/lib/db";
import { computeTeamWeekScore } from "./team-score";
import { ScoringSettings } from "./types";

// Computes every team's score for one week of one league and writes the
// results into that week's Matchup rows, marking them `played`. Safe to
// re-run for the same week (e.g. to pick up newly-final live stats) — it
// just overwrites the previous numbers.
export async function computeLeagueWeek(leagueId: string, week: number) {
  const league = await db.league.findUnique({ where: { id: leagueId } });
  if (!league) throw new Error("League not found");

  const teams = await db.team.findMany({ where: { leagueId } });
  const scoring = league.scoringSettings as unknown as ScoringSettings;

  const scoreByTeam = new Map<string, number>();
  for (const team of teams) {
    scoreByTeam.set(team.id, await computeTeamWeekScore(team.id, league.season, week, scoring));
  }

  const matchups = await db.matchup.findMany({ where: { leagueId, week } });
  for (const m of matchups) {
    const homeScore = scoreByTeam.get(m.homeTeamId) ?? 0;
    const awayScore = m.awayTeamId ? scoreByTeam.get(m.awayTeamId) ?? 0 : 0;
    await db.matchup.update({
      where: { id: m.id },
      data: { homeScore, awayScore, played: true },
    });
  }

  return { teams: teams.length, matchupsUpdated: matchups.length };
}
