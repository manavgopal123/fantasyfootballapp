import { StandingsFormat } from "@/generated/prisma/enums";

export interface ScheduleRow {
  week: number;
  homeTeamId: string;
  awayTeamId: string | null;
}

// Standard "circle method" round robin: fixes team[0], rotates the rest.
// Produces n-1 rounds (n teams, padded with a null bye slot if odd) where
// every team faces every other team exactly once.
export function generateRoundRobinRounds(teamIds: string[]): (string | null)[][][] {
  const teams: (string | null)[] = [...teamIds];
  if (teams.length % 2 !== 0) teams.push(null);
  const n = teams.length;

  const rounds: [string | null, string | null][][] = [];
  const arr = [...teams];
  for (let round = 0; round < n - 1; round++) {
    const pairs: [string | null, string | null][] = [];
    for (let i = 0; i < n / 2; i++) {
      pairs.push([arr[i], arr[n - 1 - i]]);
    }
    rounds.push(pairs);

    const fixed = arr[0];
    const rest = arr.slice(1);
    rest.unshift(rest.pop()!);
    arr.splice(0, arr.length, fixed, ...rest);
  }
  return rounds;
}

// Builds the full regular-season schedule for a league. HEAD_TO_HEAD(_MEDIAN)
// gets real round-robin pairings (repeating the cycle if the season runs
// longer than one full round robin). ALL_PLAY and TOTAL_POINTS don't need
// pairings — every team just gets one score-ledger row per week (see
// src/lib/standings.ts, which treats every Matchup row as "this team scored
// X in this week" regardless of format).
export function generateSchedule(
  teamIds: string[],
  format: StandingsFormat,
  regularSeasonWeeks: number
): ScheduleRow[] {
  const rows: ScheduleRow[] = [];

  if (format === "ALL_PLAY" || format === "TOTAL_POINTS") {
    for (let week = 1; week <= regularSeasonWeeks; week++) {
      for (const teamId of teamIds) {
        rows.push({ week, homeTeamId: teamId, awayTeamId: null });
      }
    }
    return rows;
  }

  const rounds = generateRoundRobinRounds(teamIds);
  if (rounds.length === 0) return rows;

  for (let week = 1; week <= regularSeasonWeeks; week++) {
    const round = rounds[(week - 1) % rounds.length];
    for (const [a, b] of round) {
      if (a === null && b === null) continue;
      if (a === null) rows.push({ week, homeTeamId: b as string, awayTeamId: null });
      else if (b === null) rows.push({ week, homeTeamId: a, awayTeamId: null });
      else rows.push({ week, homeTeamId: a, awayTeamId: b });
    }
  }
  return rows;
}
