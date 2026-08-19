import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: leagueId } = await params;

  const league = await db.league.findUnique({ where: { id: leagueId } });
  if (!league) return NextResponse.json({ error: "League not found" }, { status: 404 });

  const picks = await db.draftPick.findMany({
    where: { leagueId },
    orderBy: { pickNo: "asc" },
    include: {
      team: { select: { id: true, name: true, ownerId: true } },
      player: { select: { id: true, firstName: true, lastName: true, position: true, nflTeam: true } },
    },
  });

  const onClock = picks.find((p) => !p.playerId) ?? null;

  return NextResponse.json({
    status: league.status,
    picks,
    onClockPickNo: onClock?.pickNo ?? null,
    onClockTeamId: onClock?.teamId ?? null,
  });
}
