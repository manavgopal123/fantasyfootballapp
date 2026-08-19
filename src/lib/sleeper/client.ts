// Thin wrapper around Sleeper's free, public (but unofficial/undocumented)
// NFL data API: https://docs.sleeper.com/ covers the read-only endpoints
// used here. No API key required.

const BASE_URL = "https://api.sleeper.app/v1";

export const FANTASY_POSITIONS = ["QB", "RB", "WR", "TE", "K", "DEF"] as const;
export type FantasyPosition = (typeof FANTASY_POSITIONS)[number];

export interface SleeperPlayer {
  player_id: string;
  first_name: string;
  last_name: string;
  position: string | null;
  team: string | null;
  status: string | null;
  injury_status: string | null;
  active: boolean;
  search_rank: number | null;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Sleeper API request failed: ${url} (${res.status})`);
  }
  return res.json() as Promise<T>;
}

// Full NFL player dictionary, keyed by player_id. This is a large payload
// (~10-15MB) — Sleeper asks that it's fetched at most once per day.
export async function fetchAllPlayers(): Promise<Record<string, SleeperPlayer>> {
  return getJson(`${BASE_URL}/players/nfl`);
}

// Weekly stat lines, keyed by player_id. Updates live during games —
// poll on an interval during game windows for live scoring, and less
// frequently the rest of the week.
export async function fetchWeekStats(
  season: number,
  week: number,
  seasonType: "regular" | "post" = "regular"
): Promise<Record<string, Record<string, number | undefined>>> {
  return getJson(`${BASE_URL}/stats/nfl/${seasonType}/${season}/${week}`);
}

export async function fetchWeekProjections(
  season: number,
  week: number,
  seasonType: "regular" | "post" = "regular"
): Promise<Record<string, Record<string, number | undefined>>> {
  return getJson(`${BASE_URL}/projections/nfl/${seasonType}/${season}/${week}`);
}

// Current NFL week/season, useful for defaulting the UI to "now".
export interface NflState {
  week: number;
  season: string;
  season_type: string;
}

export async function fetchNflState(): Promise<NflState> {
  return getJson(`${BASE_URL}/state/nfl`);
}
