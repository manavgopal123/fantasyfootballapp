import { NextResponse } from "next/server";
import { syncWeekStats } from "@/lib/sleeper/sync";
import { fetchNflState } from "@/lib/sleeper/client";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  let { season, week } = body as { season?: number; week?: number };

  if (!season || !week) {
    const state = await fetchNflState();
    season = season ?? Number(state.season);
    week = week ?? state.week;
  }

  // Treat the season as still live (not final) unless the caller says otherwise —
  // callers doing an end-of-week cleanup pass should pass isFinal explicitly.
  const isFinal = Boolean((body as { isFinal?: boolean }).isFinal);
  const written = await syncWeekStats(season, week, isFinal);
  return NextResponse.json({ season, week, written });
}
