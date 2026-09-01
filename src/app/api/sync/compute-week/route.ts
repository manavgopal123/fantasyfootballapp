import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { computeLeagueWeek } from "@/lib/scoring/compute-week";
import { fetchNflState } from "@/lib/sleeper/client";
import { isSyncAuthorized } from "@/lib/sync-auth";

// Intended for a scheduled job: recomputes every active league's scores for
// one NFL week. Safe to call repeatedly during game day to keep scores live.
export async function POST(req: Request) {
  if (!(await isSyncAuthorized(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  let { season, week } = body as { season?: number; week?: number };

  if (!season || !week) {
    const state = await fetchNflState();
    season = season ?? Number(state.season);
    week = week ?? state.week;
  }

  const leagues = await db.league.findMany({
    where: { status: "ACTIVE", season },
    select: { id: true },
  });

  const results = [];
  for (const league of leagues) {
    results.push({ leagueId: league.id, ...(await computeLeagueWeek(league.id, week)) });
  }

  return NextResponse.json({ season, week, leaguesUpdated: results.length, results });
}
