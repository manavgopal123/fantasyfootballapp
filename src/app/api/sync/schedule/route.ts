import { NextResponse } from "next/server";
import { syncWeekSchedule } from "@/lib/schedule-sync";
import { fetchNflState } from "@/lib/sleeper/client";
import { isSyncAuthorized } from "@/lib/sync-auth";

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

  const written = await syncWeekSchedule(season, week);
  return NextResponse.json({ season, week, written });
}
