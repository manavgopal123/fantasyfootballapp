import { db } from "@/lib/db";

// ESPN's team abbreviations mostly match Sleeper's, except Washington.
const ESPN_TEAM_TO_SLEEPER: Record<string, string> = {
  WSH: "WAS",
};

function normalizeTeam(abbr: string): string {
  return ESPN_TEAM_TO_SLEEPER[abbr] ?? abbr;
}

interface EspnEvent {
  date: string;
  competitions: {
    competitors: { homeAway: "home" | "away"; team: { abbreviation: string } }[];
  }[];
}

interface EspnScoreboard {
  events: EspnEvent[];
}

// Public, unofficial ESPN scoreboard endpoint — no API key required. Used
// only for real kickoff times (see src/lib/lock.ts), not scoring.
export async function syncWeekSchedule(
  season: number,
  week: number,
  seasonType: 1 | 2 | 3 = 2
): Promise<number> {
  // ESPN's `year` param is silently ignored for this endpoint — `dates`
  // (just the season year, not a date range) is what actually selects the
  // season; verified against real 2025 data before relying on it here.
  const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?week=${week}&seasontype=${seasonType}&dates=${season}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ESPN schedule request failed: ${url} (${res.status})`);
  const data = (await res.json()) as EspnScoreboard;

  let written = 0;
  for (const event of data.events) {
    const kickoffAt = new Date(event.date);
    for (const competitor of event.competitions[0].competitors) {
      const nflTeam = normalizeTeam(competitor.team.abbreviation);
      await db.teamGameTime.upsert({
        where: { season_week_nflTeam: { season, week, nflTeam } },
        create: { season, week, nflTeam, kickoffAt },
        update: { kickoffAt },
      });
      written++;
    }
  }
  return written;
}
