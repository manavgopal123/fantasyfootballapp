import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: leagueId } = await params;
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim() ?? "";
  const position = searchParams.get("position") ?? undefined;

  const drafted = await db.draftPick.findMany({
    where: { leagueId, playerId: { not: null } },
    select: { playerId: true },
  });
  const draftedIds = drafted.map((d) => d.playerId as string);

  const players = await db.player.findMany({
    where: {
      id: { notIn: draftedIds.length ? draftedIds : undefined },
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
