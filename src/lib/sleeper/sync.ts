import { db } from "@/lib/db";
import { FANTASY_POSITIONS, fetchAllPlayers, fetchWeekStats } from "./client";

// Pull the full Sleeper player list and upsert only the positions we
// actually use for fantasy scoring (skips O-line, IDP-only players, etc.
// — Sleeper's raw file has 12k+ entries, most of them irrelevant here).
export async function syncPlayers() {
  const all = await fetchAllPlayers();
  const relevant = Object.values(all).filter(
    (p) => p.position && (FANTASY_POSITIONS as readonly string[]).includes(p.position)
  );

  for (const p of relevant) {
    await db.player.upsert({
      where: { id: p.player_id },
      create: {
        id: p.player_id,
        firstName: p.first_name ?? p.team ?? p.player_id,
        lastName: p.last_name ?? "",
        position: p.position!,
        nflTeam: p.team,
        status: p.status,
        injuryStatus: p.injury_status,
        searchRank: p.search_rank,
      },
      update: {
        firstName: p.first_name ?? p.team ?? p.player_id,
        lastName: p.last_name ?? "",
        position: p.position!,
        nflTeam: p.team,
        status: p.status,
        injuryStatus: p.injury_status,
        searchRank: p.search_rank,
      },
    });
  }

  return relevant.length;
}

// Pull one week's stat lines and upsert them. `isFinal` should be false
// while games are still live so callers know to keep polling.
export async function syncWeekStats(season: number, week: number, isFinal: boolean) {
  const stats = await fetchWeekStats(season, week);
  const knownPlayerIds = new Set(
    (await db.player.findMany({ select: { id: true } })).map((p) => p.id)
  );

  let written = 0;
  for (const [playerId, statLine] of Object.entries(stats)) {
    if (!knownPlayerIds.has(playerId)) continue; // skip IDP/O-line noise
    await db.playerWeekStats.upsert({
      where: { playerId_season_week: { playerId, season, week } },
      create: { playerId, season, week, stats: statLine as object, isFinal },
      update: { stats: statLine as object, isFinal },
    });
    written++;
  }

  return written;
}
