import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: leagueId } = await params;
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim() ?? "";
  const position = searchParams.get("position") ?? undefined;

  // Excludes anyone currently on a roster in this league — not just ever
  // drafted, since a dropped player should reappear as a free agent.
  const rostered = await db.rosterEntry.findMany({
    where: { team: { leagueId } },
    select: { playerId: true },
  });
  const rosteredIds = rostered.map((r) => r.playerId);

  const players = await db.player.findMany({
    where: {
      id: { notIn: rosteredIds.length ? rosteredIds : undefined },
      ...(position ? { position } : {}),
      ...(search
        ? {
            OR: [
              { firstName: { contains: search } },
              { lastName: { contains: search } },
            ],
          }
        : {}),
    },
    orderBy: [{ searchRank: { sort: "asc", nulls: "last" } }],
    take: 50,
  });

  return NextResponse.json(players);
}
