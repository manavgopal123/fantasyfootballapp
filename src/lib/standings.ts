import { StandingsFormat } from "@/generated/prisma/enums";

// A Matchup row doubles as a per-team weekly score ledger for every format:
// HEAD_TO_HEAD(_MEDIAN) matchups have a real opponent; ALL_PLAY and
// TOTAL_POINTS still write one row per team per week with awayTeamId = null,
// just to record that team's score that week.
export interface MatchupLike {
  week: number;
  homeTeamId: string;
  awayTeamId: string | null;
  homeScore: number;
  awayScore: number;
  played: boolean;
}

export interface StandingsRow {
  teamId: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  rank: number;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function computeStandings(
  format: StandingsFormat,
  teamIds: string[],
  allMatchups: MatchupLike[]
): StandingsRow[] {
  const matchups = allMatchups.filter((m) => m.played);

  const rows = new Map<string, StandingsRow>(
    teamIds.map((id) => [id, { teamId: id, wins: 0, losses: 0, ties: 0, pointsFor: 0, pointsAgainst: 0, rank: 0 }])
  );

  // week -> teamId -> score, built from every played matchup row regardless of format.
  const weekScores = new Map<number, Map<string, number>>();
  const addScore = (week: number, teamId: string, score: number) => {
    if (!weekScores.has(week)) weekScores.set(week, new Map());
    weekScores.get(week)!.set(teamId, score);
  };
  for (const m of matchups) {
    addScore(m.week, m.homeTeamId, m.homeScore);
    if (m.awayTeamId) addScore(m.week, m.awayTeamId, m.awayScore);
  }

  for (const [, teamScores] of weekScores) {
    for (const [teamId, score] of teamScores) {
      const row = rows.get(teamId);
      if (row) row.pointsFor += score;
    }
  }

  if (format === "TOTAL_POINTS") {
    const sorted = [...rows.values()].sort((a, b) => b.pointsFor - a.pointsFor);
    sorted.forEach((r, i) => (r.rank = i + 1));
    return sorted;
  }

  if (format === "ALL_PLAY") {
    for (const [, teamScores] of weekScores) {
      const entries = [...teamScores.entries()];
      for (const [teamId, score] of entries) {
        const row = rows.get(teamId);
        if (!row) continue;
        for (const [otherId, otherScore] of entries) {
          if (otherId === teamId) continue;
          if (score > otherScore) row.wins++;
          else if (score < otherScore) row.losses++;
          else row.ties++;
        }
      }
    }
    return rankByWinPct(rows);
  }

  // HEAD_TO_HEAD and HEAD_TO_HEAD_MEDIAN both start from real matchup results.
  for (const m of matchups) {
    if (!m.awayTeamId) continue; // bye week, no result
    const home = rows.get(m.homeTeamId);
    const away = rows.get(m.awayTeamId);
    if (!home || !away) continue;

    home.pointsAgainst += m.awayScore;
    away.pointsAgainst += m.homeScore;

    if (m.homeScore > m.awayScore) {
      home.wins++;
      away.losses++;
    } else if (m.homeScore < m.awayScore) {
      home.losses++;
      away.wins++;
    } else {
      home.ties++;
      away.ties++;
    }
  }

  if (format === "HEAD_TO_HEAD_MEDIAN") {
    for (const [, teamScores] of weekScores) {
      if (teamScores.size < 2) continue;
      const med = median([...teamScores.values()]);
      for (const [teamId, score] of teamScores) {
        const row = rows.get(teamId);
        if (!row) continue;
        if (score > med) row.wins++;
        else if (score < med) row.losses++;
        else row.ties++;
      }
    }
  }

  return rankByWinPct(rows);
}

function rankByWinPct(rows: Map<string, StandingsRow>): StandingsRow[] {
  const sorted = [...rows.values()].sort((a, b) => {
    const gamesA = a.wins + a.losses + a.ties;
    const gamesB = b.wins + b.losses + b.ties;
    const pctA = gamesA ? (a.wins + a.ties * 0.5) / gamesA : 0;
    const pctB = gamesB ? (b.wins + b.ties * 0.5) / gamesB : 0;
    if (pctB !== pctA) return pctB - pctA;
    return b.pointsFor - a.pointsFor;
  });
  sorted.forEach((r, i) => (r.rank = i + 1));
  return sorted;
}
