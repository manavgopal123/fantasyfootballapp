import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { FANTASY_POSITIONS, fetchAllPlayers, fetchWeekStats } from "./client";

// Batched with raw SQL bulk upserts rather than one upsert() per row —
// with a remote Postgres database (vs. local SQLite), ~4,000 sequential
// round-trips took 90+ seconds and would time out as a Vercel function.
const BATCH_SIZE = 500;

function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) batches.push(items.slice(i, i + size));
  return batches;
}

// Pull the full Sleeper player list and upsert only the positions we
// actually use for fantasy scoring (skips O-line, IDP-only players, etc.
// — Sleeper's raw file has 12k+ entries, most of them irrelevant here).
export async function syncPlayers() {
  const all = await fetchAllPlayers();
  const relevant = Object.values(all).filter(
    (p) => p.position && (FANTASY_POSITIONS as readonly string[]).includes(p.position)
  );

  for (const batch of chunk(relevant, BATCH_SIZE)) {
    const rows = batch.map(
      (p) => Prisma.sql`(
        ${p.player_id},
        ${p.first_name ?? p.team ?? p.player_id},
        ${p.last_name ?? ""},
        ${p.position},
        ${p.team},
        ${p.status},
        ${p.injury_status},
        ${p.search_rank},
        now()
      )`
    );

    await db.$executeRaw`
      INSERT INTO "Player" ("id", "firstName", "lastName", "position", "nflTeam", "status", "injuryStatus", "searchRank", "updatedAt")
      VALUES ${Prisma.join(rows)}
      ON CONFLICT ("id") DO UPDATE SET
        "firstName" = EXCLUDED."firstName",
        "lastName" = EXCLUDED."lastName",
        "position" = EXCLUDED."position",
        "nflTeam" = EXCLUDED."nflTeam",
        "status" = EXCLUDED."status",
        "injuryStatus" = EXCLUDED."injuryStatus",
        "searchRank" = EXCLUDED."searchRank",
        "updatedAt" = now()
    `;
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

  const entries = Object.entries(stats).filter(([playerId]) => knownPlayerIds.has(playerId));

  for (const batch of chunk(entries, BATCH_SIZE)) {
    const rows = batch.map(
      ([playerId, statLine]) => Prisma.sql`(
        ${randomUUID()},
        ${playerId},
        ${season},
        ${week},
        ${JSON.stringify(statLine)}::jsonb,
        ${isFinal}
      )`
    );

    await db.$executeRaw`
      INSERT INTO "PlayerWeekStats" ("id", "playerId", "season", "week", "stats", "isFinal")
      VALUES ${Prisma.join(rows)}
      ON CONFLICT ("playerId", "season", "week") DO UPDATE SET
        "stats" = EXCLUDED."stats",
        "isFinal" = EXCLUDED."isFinal"
    `;
  }

  return entries.length;
}
