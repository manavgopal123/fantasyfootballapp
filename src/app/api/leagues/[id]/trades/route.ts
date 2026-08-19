import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: leagueId } = await params;
  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get("teamId") ?? undefined;

  const trades = await db.trade.findMany({
    where: {
      leagueId,
      ...(teamId ? { OR: [{ proposingTeamId: teamId }, { receivingTeamId: teamId }] } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      proposingTeam: { select: { id: true, name: true } },
      receivingTeam: { select: { id: true, name: true } },
      items: { include: { player: { select: { firstName: true, lastName: true, position: true } } } },
    },
  });

  return NextResponse.json(trades);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id: leagueId } = await params;
  const { proposingTeamId, receivingTeamId, offerPlayerIds, requestPlayerIds } =
    (await req.json().catch(() => ({}))) as {
      proposingTeamId?: string;
      receivingTeamId?: string;
      offerPlayerIds?: string[];
      requestPlayerIds?: string[];
    };

  if (!proposingTeamId || !receivingTeamId || !offerPlayerIds?.length || !requestPlayerIds?.length) {
    return NextResponse.json(
      { error: "proposingTeamId, receivingTeamId, and at least one player on each side are required" },
      { status: 400 }
    );
  }
  if (proposingTeamId === receivingTeamId) {
    return NextResponse.json({ error: "Can't trade with yourself" }, { status: 400 });
  }

  const [league, proposingTeam, receivingTeam] = await Promise.all([
    db.league.findUnique({ where: { id: leagueId } }),
    db.team.findUnique({ where: { id: proposingTeamId } }),
    db.team.findUnique({ where: { id: receivingTeamId } }),
  ]);
  if (!league) return NextResponse.json({ error: "League not found" }, { status: 404 });
  if (!proposingTeam || proposingTeam.leagueId !== leagueId || !receivingTeam || receivingTeam.leagueId !== leagueId) {
    return NextResponse.json({ error: "Team not found in this league" }, { status: 404 });
  }

  const canAct = proposingTeam.ownerId === session.user.id || league.commissionerId === session.user.id;
  if (!canAct) return NextResponse.json({ error: "Not your team" }, { status: 403 });

  const [offerOwned, requestOwned] = await Promise.all([
    db.rosterEntry.count({ where: { teamId: proposingTeamId, playerId: { in: offerPlayerIds } } }),
    db.rosterEntry.count({ where: { teamId: receivingTeamId, playerId: { in: requestPlayerIds } } }),
  ]);
  if (offerOwned !== offerPlayerIds.length) {
    return NextResponse.json({ error: "You don't own all the players you're offering" }, { status: 400 });
  }
  if (requestOwned !== requestPlayerIds.length) {
    return NextResponse.json({ error: "The other team doesn't own all the players you're requesting" }, { status: 400 });
  }

  const trade = await db.trade.create({
    data: {
      leagueId,
      proposingTeamId,
      receivingTeamId,
      items: {
        create: [
          ...offerPlayerIds.map((playerId) => ({ playerId, fromTeamId: proposingTeamId })),
          ...requestPlayerIds.map((playerId) => ({ playerId, fromTeamId: receivingTeamId })),
        ],
      },
    },
    include: { items: true },
  });

  return NextResponse.json(trade);
}
