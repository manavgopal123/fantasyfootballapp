import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { syncPlayers, syncWeekStats } from "@/lib/sleeper/sync";
import { syncWeekSchedule } from "@/lib/schedule-sync";
import { fetchNflState } from "@/lib/sleeper/client";
import { computeLeagueWeek } from "@/lib/scoring/compute-week";

// Vercel Cron hits this once a day (see vercel.json) with an
// `Authorization: Bearer $CRON_SECRET` header — set CRON_SECRET in the
// Vercel project's env vars to match. Refreshes the Sleeper player
// dictionary, this week's game times, and this week's stats, then
// recomputes every active league's scores.
export const maxDuration = 60;

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const state = await fetchNflState();
  const season = Number(state.season);
  const week = state.week;

  const playersSynced = await syncPlayers();
  const gamesSynced = await syncWeekSchedule(season, week);
  const statsSynced = await syncWeekStats(season, week, false);

  const leagues = await db.league.findMany({
    where: { status: "ACTIVE", season },
    select: { id: true },
  });

  const results = [];
  for (const league of leagues) {
    results.push({ leagueId: league.id, ...(await computeLeagueWeek(league.id, week)) });
  }

  return NextResponse.json({
    season,
    week,
    playersSynced,
    gamesSynced,
    statsSynced,
    leaguesUpdated: results.length,
    results,
  });
}
